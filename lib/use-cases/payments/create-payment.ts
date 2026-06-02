import { randomUUID } from 'node:crypto'

import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

import { BusinessError } from '@/lib/api-handler'
import {
  computePaymentCommission,
  distributeNetToInstallments,
} from '@/lib/business-logic/commission'
import {
  getCustomerCreditBalance,
  lockCustomerCreditBalance,
} from '@/lib/business-logic/credit-management'
import { canApplyCredit } from '@/lib/business-logic/credit-rules'
import { generatePrismaInstallmentsCreate } from '@/lib/business-logic/installments'
import {
  greaterThanMoney,
  greaterThanMoneyWithTolerance,
  maxMoney,
  money,
  moneyToNumber,
  negateMoney,
  subtractMoney,
  sumMoney,
} from '@/lib/business-logic/money'
import { getProjectsFinancials } from '@/lib/business-logic/project-financials'
import { prisma } from '@/lib/db'
import type { PrismaTransaction } from '@/lib/db/types'
import { formatCurrency } from '@/lib/format'
import {
  validateNoDuplicateProjects,
  validatePaymentApplicationSum,
  validatePaymentType,
  validateSameCurrency,
  validateSameCustomer,
} from '@/lib/validations/payment-business-rules'

import type { CreatePaymentInput } from './types'

export interface LoggerLike {
  child: (context: Record<string, unknown>) => LoggerLike
  info: (contextOrMessage?: unknown, message?: string) => void
  debug: (contextOrMessage?: unknown, message?: string) => void
  warn: (contextOrMessage?: unknown, message?: string) => void
}

type ProjectApplicationWriter = PrismaTransaction & {
  creditTransaction: {
    createMany: (args: { data: CreditTransactionCreateManyRow[] }) => Promise<unknown>
    create: PrismaTransaction['creditTransaction']['create']
  }
  projectApplication: {
    createMany: (args: { data: ProjectApplicationCreateManyRow[] }) => Promise<unknown>
  }
}

type NormalizedAllocation = CreatePaymentInput['allocations'][number] & {
  creditApplied: number
}

type ProjectApplicationCreateManyRow = {
  projectId: string
  customerId: string
  paymentId: string
  paymentAllocationId?: string
  creditTransactionId?: string
  amount: Prisma.Decimal
  sourceType: 'CASH' | 'CUSTOMER_CREDIT'
}

type CreditTransactionCreateManyRow = {
  id: string
  customerId: string
  amount: Prisma.Decimal
  type: 'APPLIED' | 'OVERPAYMENT'
  description: string
  paymentId: string
  projectId: string
  metadata: Prisma.InputJsonValue
}

type LoadedPaymentEntities = Awaited<ReturnType<typeof loadPaymentEntities>>

function normalizeAllocations(
  rawAllocations: CreatePaymentInput['allocations']
): NormalizedAllocation[] {
  return rawAllocations.map((allocation) => ({
    ...allocation,
    creditApplied: allocation.creditApplied ?? 0,
  }))
}

function validatePaymentShape(
  type: CreatePaymentInput['type'],
  amount: number,
  allocations: NormalizedAllocation[],
  paymentLogger: LoggerLike
) {
  const typeValidation = validatePaymentType(type, allocations)
  if (!typeValidation.valid) {
    paymentLogger.warn(
      { type, allocationCount: allocations.length },
      'Payment type validation failed'
    )
    throw new BusinessError(typeValidation.error!, 400)
  }

  const duplicatesValidation = validateNoDuplicateProjects(allocations)
  if (!duplicatesValidation.valid) {
    paymentLogger.warn(
      { projectIds: allocations.map((a) => a.projectId) },
      'Duplicate project IDs detected'
    )
    throw new BusinessError(duplicatesValidation.error!, 400)
  }

  const sumValidation = validatePaymentApplicationSum(amount, allocations)
  if (!sumValidation.valid) {
    paymentLogger.warn(
      {
        expected: amount,
        actual: allocations.reduce((s, a) => s + a.allocatedAmount, 0),
      },
      'Allocation sum mismatch'
    )
    throw new BusinessError(sumValidation.error!, 400)
  }
}

async function loadPaymentEntities(
  customerId: string,
  paymentMethodId: string,
  projectIds: string[]
) {
  const [customerExists, paymentMethod, projects] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
      include: { commissionTiers: true },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, customerId: true, currency: true, projectNumber: true },
    }),
  ])

  return { customerExists, paymentMethod, projects }
}

function validateLoadedEntities(
  loaded: LoadedPaymentEntities,
  expected: { customerId: string; currency: string; projectIds: string[] },
  paymentLogger: LoggerLike
) {
  const { customerExists, paymentMethod, projects } = loaded

  if (!customerExists) {
    paymentLogger.warn('Customer not found')
    throw new BusinessError('El cliente no existe', 404)
  }

  if (!paymentMethod) {
    paymentLogger.warn('Payment method not found')
    throw new BusinessError('El método de pago no existe', 404)
  }

  paymentLogger.debug({ projectIds: expected.projectIds }, 'Validating projects')

  if (projects.length !== expected.projectIds.length) {
    paymentLogger.warn(
      { expected: expected.projectIds.length, found: projects.length },
      'Some projects not found'
    )
    throw new BusinessError('Uno o más proyectos no existen', 404)
  }

  const customerValidation = validateSameCustomer(projects, expected.customerId)
  if (!customerValidation.valid) {
    paymentLogger.warn('Not all projects belong to same customer')
    throw new BusinessError(customerValidation.error!, 400)
  }

  const currencyValidation = validateSameCurrency(projects, expected.currency)
  if (!currencyValidation.valid) {
    paymentLogger.warn(
      { expected: expected.currency, found: projects.map((p) => p.currency) },
      'Currency mismatch'
    )
    throw new BusinessError(currencyValidation.error!, 400)
  }

  return { customer: customerExists, paymentMethod, projects }
}

function buildCommissionResult(
  amount: number,
  paymentMethod: {
    commissionTiers: Array<{
      minInstallments: number | null
      maxInstallments: number | null
      percentageFee: unknown
      fixedFee: unknown
    }>
  },
  selectedInstallments: number | null | undefined
) {
  const commissionTiers = paymentMethod.commissionTiers.map((t) => ({
    minInstallments: t.minInstallments,
    maxInstallments: t.maxInstallments,
    percentageFee: Number(t.percentageFee),
    fixedFee: Number(t.fixedFee),
  }))

  return computePaymentCommission(amount, commissionTiers, selectedInstallments)
}

async function createPaymentRecord(
  tx: PrismaTransaction,
  input: CreatePaymentInput,
  allocations: NormalizedAllocation[],
  commissionResult: ReturnType<typeof computePaymentCommission>
) {
  return tx.payment.create({
    data: {
      type: input.type,
      customerId: input.customerId,
      amount: money(input.amount),
      currency: input.currency,
      date: input.date,
      paymentMethodId: input.paymentMethodId,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
      selectedInstallments: input.selectedInstallments || null,
      commissionAmount: commissionResult ? money(commissionResult.commissionAmount) : null,
      netAmount: commissionResult ? money(commissionResult.netAmount) : null,
      commissionRate: commissionResult ? money(commissionResult.percentageFee) : null,
      commissionFixed: commissionResult ? money(commissionResult.fixedFee) : null,
      allocations: {
        create: allocations
          .filter((a) => greaterThanMoney(a.allocatedAmount, 0))
          .map((a) => ({
            projectId: a.projectId,
            allocatedAmount: money(a.allocatedAmount),
          })),
      },
      installments: generatePrismaInstallmentsCreate(
        input.amount,
        input.selectedInstallments,
        input.date,
        Decimal
      ),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      paymentMethod: { select: { id: true, name: true, icon: true } },
      allocations: {
        select: {
          id: true,
          projectId: true,
          allocatedAmount: true,
          project: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              totalAmount: true,
              currency: true,
            },
          },
        },
      },
      installments: {
        select: {
          id: true,
          installmentNumber: true,
          amount: true,
          netAmount: true,
          dueDate: true,
        },
        orderBy: { installmentNumber: 'asc' },
      },
    },
  })
}

async function updateInstallmentNetAmounts(
  tx: PrismaTransaction,
  payment: Awaited<ReturnType<typeof createPaymentRecord>>,
  commissionResult: ReturnType<typeof computePaymentCommission>,
  paymentLogger: LoggerLike
) {
  if (!commissionResult || payment.installments.length <= 1) return

  const installmentAmounts = payment.installments.map((inst) => moneyToNumber(inst.amount))
  const netAmounts = distributeNetToInstallments(installmentAmounts, commissionResult.netAmount)

  await Promise.all(
    payment.installments.map((inst, idx) =>
      tx.installment.update({
        where: { id: inst.id },
        data: { netAmount: money(netAmounts[idx]) },
      })
    )
  )

  paymentLogger.debug(
    { installmentCount: payment.installments.length },
    'Net amounts distributed to installments'
  )
}

async function applyCustomerCredit(params: {
  tx: PrismaTransaction
  customerId: string
  amount: number
  paymentId: string
  paymentDate: Date
  allocations: NormalizedAllocation[]
  initialFinancials: Awaited<ReturnType<typeof getProjectsFinancials>>
  totalCreditToApply: number
  paymentLogger: LoggerLike
}) {
  const appliedCreditTransactionByProject = new Map<string, string>()
  if (!greaterThanMoney(params.totalCreditToApply, 0)) return appliedCreditTransactionByProject

  const locked = await lockCustomerCreditBalance(params.customerId, params.tx)
  if (!locked) {
    throw new BusinessError('Cliente no encontrado durante validación de crédito', 404)
  }

  const customerCreditBalance = await getCustomerCreditBalance(params.customerId, params.tx)

  if (greaterThanMoneyWithTolerance(params.totalCreditToApply, customerCreditBalance)) {
    throw new BusinessError(
      `Crédito insuficiente. Disponible: ${formatCurrency(customerCreditBalance, 'CLP')}`,
      400
    )
  }

  for (const allocation of params.allocations) {
    const creditAmount = allocation.creditApplied
    if (!greaterThanMoney(creditAmount, 0)) continue

    const projectFinancials = params.initialFinancials.get(allocation.projectId)
    if (!projectFinancials) {
      throw new BusinessError('Proyecto no encontrado durante validación de crédito', 404)
    }

    const balanceAfterCash = moneyToNumber(
      maxMoney(0, subtractMoney(projectFinancials.balance, allocation.allocatedAmount))
    )
    const creditValidation = canApplyCredit(creditAmount, customerCreditBalance, balanceAfterCash)
    if (!creditValidation.valid) {
      throw new BusinessError(creditValidation.error!, 400)
    }
  }

  const rows = params.allocations
    .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
    .map((allocation) => {
      const creditTransactionId = randomUUID()
      appliedCreditTransactionByProject.set(allocation.projectId, creditTransactionId)

      return {
        id: creditTransactionId,
        customerId: params.customerId,
        amount: negateMoney(allocation.creditApplied),
        type: 'APPLIED' as const,
        description: `Crédito aplicado al pago ${params.paymentId.slice(0, 8)}`,
        paymentId: params.paymentId,
        projectId: allocation.projectId,
        metadata: {
          paymentAmount: params.amount,
          creditApplied: allocation.creditApplied,
          paymentDate: params.paymentDate.toISOString(),
        },
      }
    })

  if (rows.length > 0) {
    await (params.tx as ProjectApplicationWriter).creditTransaction.createMany({ data: rows })
  }

  params.paymentLogger.info(
    {
      paymentId: params.paymentId,
      creditApplied: params.totalCreditToApply,
      previousCredit: customerCreditBalance,
    },
    'Credit applied successfully in transaction'
  )

  return appliedCreditTransactionByProject
}

async function createProjectApplications(params: {
  tx: PrismaTransaction
  projects: Array<{ id: string; customerId: string }>
  payment: Awaited<ReturnType<typeof createPaymentRecord>>
  allocations: NormalizedAllocation[]
  initialFinancials: Awaited<ReturnType<typeof getProjectsFinancials>>
  appliedCreditTransactionByProject: Map<string, string>
}) {
  const creditByProject = new Map(
    params.allocations
      .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
      .map((allocation) => [allocation.projectId, allocation.creditApplied])
  )
  const paymentAllocationByProject = new Map(
    params.payment.allocations.map((allocation) => [
      allocation.project.id,
      { id: allocation.id, amount: allocation.allocatedAmount },
    ])
  )
  const rows: ProjectApplicationCreateManyRow[] = []

  for (const project of params.projects) {
    const startingFinancials = params.initialFinancials.get(project.id)
    if (!startingFinancials) {
      throw new BusinessError('Proyecto no encontrado durante aplicación de pago', 404)
    }

    const allocation = paymentAllocationByProject.get(project.id)
    const cashAmount = allocation?.amount ?? 0
    const creditAmount = creditByProject.get(project.id) ?? 0

    if (allocation && greaterThanMoney(cashAmount, 0)) {
      rows.push({
        projectId: project.id,
        customerId: project.customerId,
        paymentId: params.payment.id,
        paymentAllocationId: allocation.id,
        amount: money(cashAmount),
        sourceType: 'CASH',
      })
    }

    if (greaterThanMoney(creditAmount, 0)) {
      const creditTransactionId = params.appliedCreditTransactionByProject.get(project.id)
      if (!creditTransactionId) {
        throw new BusinessError('No se pudo registrar la aplicación de crédito', 500)
      }

      rows.push({
        projectId: project.id,
        customerId: project.customerId,
        paymentId: params.payment.id,
        creditTransactionId,
        amount: money(creditAmount),
        sourceType: 'CUSTOMER_CREDIT',
      })
    }
  }

  if (rows.length > 0) {
    await (params.tx as ProjectApplicationWriter).projectApplication.createMany({ data: rows })
  }
}

async function createOverpaymentCredits(params: {
  tx: PrismaTransaction
  projects: Array<{ id: string; customerId: string; projectNumber: string }>
  allocations: NormalizedAllocation[]
  initialFinancials: Awaited<ReturnType<typeof getProjectsFinancials>>
  paymentId: string
  amount: number
  paymentDate: Date
  paymentLogger: LoggerLike
}) {
  const creditByProject = new Map(
    params.allocations
      .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
      .map((allocation) => [allocation.projectId, allocation.creditApplied])
  )
  const allocationByProject = new Map(
    params.allocations.map((allocation) => [allocation.projectId, allocation.allocatedAmount])
  )
  const rows: CreditTransactionCreateManyRow[] = []

  for (const project of params.projects) {
    const startingFinancials = params.initialFinancials.get(project.id)
    if (!startingFinancials) {
      throw new BusinessError('Proyecto no encontrado durante validación de sobrepago', 404)
    }

    const allocatedAmount = allocationByProject.get(project.id) ?? 0
    const creditAppliedToProject = creditByProject.get(project.id) ?? 0
    const cashCapacityAfterCredit = maxMoney(
      0,
      subtractMoney(startingFinancials.balance, creditAppliedToProject)
    )
    const overpaymentAmount = maxMoney(0, subtractMoney(allocatedAmount, cashCapacityAfterCredit))

    if (!greaterThanMoney(overpaymentAmount, 0)) continue

    const rawBalanceAfterPayment = subtractMoney(
      subtractMoney(startingFinancials.rawBalance, allocatedAmount),
      creditAppliedToProject
    )
    const rawBalanceAfterPaymentNumber = moneyToNumber(rawBalanceAfterPayment)
    const overpaymentAmountNumber = moneyToNumber(overpaymentAmount)

    params.paymentLogger.info(
      {
        projectId: project.id,
        projectNumber: project.projectNumber,
        previousBalance: startingFinancials.balance,
        rawBalanceAfterPayment: rawBalanceAfterPaymentNumber,
        overpaymentAmount: overpaymentAmountNumber,
      },
      'Overpayment detected - converting to customer credit'
    )

    rows.push({
      id: randomUUID(),
      customerId: project.customerId,
      amount: money(overpaymentAmount),
      type: 'OVERPAYMENT',
      description: `Sobrepago generado en proyecto P-${project.projectNumber}`,
      paymentId: params.paymentId,
      projectId: project.id,
      metadata: {
        paymentAmount: params.amount,
        creditApplied: creditAppliedToProject,
        projectBalance: rawBalanceAfterPaymentNumber,
        overpaymentAmount: overpaymentAmountNumber,
        paymentDate: params.paymentDate.toISOString(),
      },
    })

    params.paymentLogger.info(
      {
        projectId: project.id,
        projectNumber: project.projectNumber,
        creditGenerated: overpaymentAmountNumber,
      },
      'Overpayment credit generated successfully in transaction'
    )
  }

  if (rows.length > 0) {
    await (params.tx as ProjectApplicationWriter).creditTransaction.createMany({ data: rows })
  }
}

export async function createPayment(input: CreatePaymentInput, logger: LoggerLike) {
  const {
    type,
    customerId,
    amount,
    currency,
    date,
    paymentMethodId,
    allocations: rawAllocations,
    selectedInstallments,
  } = input
  const allocations = normalizeAllocations(rawAllocations)
  const totalCreditToApply = moneyToNumber(
    sumMoney(allocations.map((allocation) => allocation.creditApplied))
  )

  const paymentLogger = logger.child({
    type,
    customerId,
    amount,
    currency,
    allocationCount: allocations.length,
  })

  paymentLogger.info('Payment creation requested')

  const projectIds = allocations.map((a) => a.projectId)
  validatePaymentShape(type, amount, allocations, paymentLogger)

  paymentLogger.debug('Validating customer, payment method and projects exist')
  const loaded = await loadPaymentEntities(customerId, paymentMethodId, projectIds)
  const { paymentMethod, projects } = validateLoadedEntities(
    loaded,
    { customerId, currency, projectIds },
    paymentLogger
  )

  paymentLogger.debug('All validations passed')

  const paymentDate = date
  const commissionResult = buildCommissionResult(amount, paymentMethod, selectedInstallments)

  paymentLogger.info(
    {
      installments: selectedInstallments || 1,
      hasInstallments: !!selectedInstallments && selectedInstallments > 1,
      creditApplied: totalCreditToApply,
      commission: commissionResult
        ? { amount: commissionResult.commissionAmount, rate: commissionResult.percentageFee }
        : null,
    },
    'Creating payment in database'
  )

  const transactionStartedAt = Date.now()
  const payment = await prisma.$transaction(async (tx: PrismaTransaction) => {
    const initialFinancials = await getProjectsFinancials(projectIds, tx)
    const newPayment = await createPaymentRecord(tx, input, allocations, commissionResult)

    paymentLogger.debug({ paymentId: newPayment.id }, 'Payment created in transaction')

    await updateInstallmentNetAmounts(tx, newPayment, commissionResult, paymentLogger)

    const appliedCreditTransactionByProject = await applyCustomerCredit({
      tx,
      customerId,
      amount,
      paymentId: newPayment.id,
      paymentDate,
      allocations,
      initialFinancials,
      totalCreditToApply,
      paymentLogger,
    })

    await createProjectApplications({
      tx,
      projects,
      payment: newPayment,
      allocations,
      initialFinancials,
      appliedCreditTransactionByProject,
    })

    paymentLogger.debug({ projectIds }, 'Checking for overpayments in transaction')

    await createOverpaymentCredits({
      tx,
      projects,
      allocations,
      initialFinancials,
      paymentId: newPayment.id,
      amount,
      paymentDate,
      paymentLogger,
    })

    return newPayment
  })
  const transactionDurationMs = Date.now() - transactionStartedAt

  paymentLogger.info(
    {
      paymentId: payment.id,
      allocationsCreated: payment.allocations.length,
      installmentsCreated: payment.installments.length,
      creditApplied: totalCreditToApply,
      transactionDurationMs,
    },
    'Payment created successfully (atomic transaction completed)'
  )

  return payment
}
