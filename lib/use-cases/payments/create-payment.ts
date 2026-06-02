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

export async function createPayment(input: CreatePaymentInput, logger: LoggerLike) {
  const {
    type,
    customerId,
    amount,
    currency,
    date,
    paymentMethodId,
    reference,
    notes,
    allocations: rawAllocations,
    selectedInstallments,
  } = input
  const allocations: NormalizedAllocation[] = rawAllocations.map((allocation) => ({
    ...allocation,
    creditApplied: allocation.creditApplied ?? 0,
  }))
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

  const typeValidation = validatePaymentType(type, allocations)
  if (!typeValidation.valid) {
    paymentLogger.warn(
      { type, allocationCount: allocations.length },
      'Payment type validation failed'
    )
    throw new BusinessError(typeValidation.error!, 400)
  }

  const dbQueriesPromise = Promise.all([
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

  paymentLogger.debug('Validating customer, payment method and projects exist')
  const [customerExists, paymentMethod, projects] = await dbQueriesPromise

  if (!customerExists) {
    paymentLogger.warn('Customer not found')
    throw new BusinessError('El cliente no existe', 404)
  }

  if (!paymentMethod) {
    paymentLogger.warn('Payment method not found')
    throw new BusinessError('El método de pago no existe', 404)
  }

  const duplicatesValidation = validateNoDuplicateProjects(allocations)
  if (!duplicatesValidation.valid) {
    paymentLogger.warn(
      { projectIds: allocations.map((a) => a.projectId) },
      'Duplicate project IDs detected'
    )
    throw new BusinessError(duplicatesValidation.error!, 400)
  }

  paymentLogger.debug({ projectIds }, 'Validating projects')

  if (projects.length !== projectIds.length) {
    paymentLogger.warn(
      { expected: projectIds.length, found: projects.length },
      'Some projects not found'
    )
    throw new BusinessError('Uno o más proyectos no existen', 404)
  }

  const customerValidation = validateSameCustomer(projects, customerId)
  if (!customerValidation.valid) {
    paymentLogger.warn('Not all projects belong to same customer')
    throw new BusinessError(customerValidation.error!, 400)
  }

  const currencyValidation = validateSameCurrency(projects, currency)
  if (!currencyValidation.valid) {
    paymentLogger.warn(
      { expected: currency, found: projects.map((p) => p.currency) },
      'Currency mismatch'
    )
    throw new BusinessError(currencyValidation.error!, 400)
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

  paymentLogger.debug('All validations passed')

  const paymentDate = date
  const commissionTiers = paymentMethod.commissionTiers.map((t) => ({
    minInstallments: t.minInstallments,
    maxInstallments: t.maxInstallments,
    percentageFee: Number(t.percentageFee),
    fixedFee: Number(t.fixedFee),
  }))
  const commissionResult = computePaymentCommission(amount, commissionTiers, selectedInstallments)

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

    const newPayment = await tx.payment.create({
      data: {
        type,
        customerId,
        amount: money(amount),
        currency,
        date: paymentDate,
        paymentMethodId,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
        selectedInstallments: selectedInstallments || null,
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
          amount,
          selectedInstallments,
          paymentDate,
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

    paymentLogger.debug({ paymentId: newPayment.id }, 'Payment created in transaction')

    if (commissionResult && newPayment.installments.length > 1) {
      const installmentAmounts = newPayment.installments.map((inst) => moneyToNumber(inst.amount))
      const netAmounts = distributeNetToInstallments(installmentAmounts, commissionResult.netAmount)

      await Promise.all(
        newPayment.installments.map((inst, idx) =>
          tx.installment.update({
            where: { id: inst.id },
            data: { netAmount: money(netAmounts[idx]) },
          })
        )
      )

      paymentLogger.debug(
        { installmentCount: newPayment.installments.length },
        'Net amounts distributed to installments'
      )
    }

    const creditByProject = new Map<string, number>(
      allocations
        .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
        .map((allocation) => [allocation.projectId, allocation.creditApplied])
    )
    const appliedCreditTransactionByProject = new Map<string, string>()

    if (greaterThanMoney(totalCreditToApply, 0)) {
      const locked = await lockCustomerCreditBalance(customerId, tx)
      if (!locked) {
        throw new BusinessError('Cliente no encontrado durante validación de crédito', 404)
      }

      const customerCreditBalance = await getCustomerCreditBalance(customerId, tx)

      if (greaterThanMoneyWithTolerance(totalCreditToApply, customerCreditBalance)) {
        throw new BusinessError(
          `Crédito insuficiente. Disponible: ${formatCurrency(customerCreditBalance, 'CLP')}`,
          400
        )
      }

      for (const allocation of allocations) {
        const creditAmount = allocation.creditApplied
        if (!greaterThanMoney(creditAmount, 0)) continue

        const projectFinancials = initialFinancials.get(allocation.projectId)
        if (!projectFinancials) {
          throw new BusinessError('Proyecto no encontrado durante validación de crédito', 404)
        }

        const balanceAfterCash = moneyToNumber(
          maxMoney(0, subtractMoney(projectFinancials.balance, allocation.allocatedAmount))
        )
        const creditValidation = canApplyCredit(
          creditAmount,
          customerCreditBalance,
          balanceAfterCash
        )
        if (!creditValidation.valid) {
          throw new BusinessError(creditValidation.error!, 400)
        }
      }

      const appliedCreditRows = allocations
        .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
        .map((allocation) => {
          const creditTransactionId = randomUUID()
          appliedCreditTransactionByProject.set(allocation.projectId, creditTransactionId)

          return {
            id: creditTransactionId,
            customerId,
            amount: negateMoney(allocation.creditApplied),
            type: 'APPLIED' as const,
            description: `Crédito aplicado al pago ${newPayment.id.slice(0, 8)}`,
            paymentId: newPayment.id,
            projectId: allocation.projectId,
            metadata: {
              paymentAmount: amount,
              creditApplied: allocation.creditApplied,
              paymentDate: paymentDate.toISOString(),
            },
          }
        })

      if (appliedCreditRows.length > 0) {
        await (tx as ProjectApplicationWriter).creditTransaction.createMany({
          data: appliedCreditRows,
        })
      }

      paymentLogger.info(
        {
          paymentId: newPayment.id,
          creditApplied: totalCreditToApply,
          previousCredit: customerCreditBalance,
        },
        'Credit applied successfully in transaction'
      )
    }

    const projectApplicationRows: ProjectApplicationCreateManyRow[] = []
    const paymentAllocationByProject = new Map(
      newPayment.allocations.map((allocation) => [
        allocation.project.id,
        { id: allocation.id, amount: allocation.allocatedAmount },
      ])
    )

    for (const project of projects) {
      const startingFinancials = initialFinancials.get(project.id)
      if (!startingFinancials) {
        throw new BusinessError('Proyecto no encontrado durante aplicación de pago', 404)
      }

      const allocation = paymentAllocationByProject.get(project.id)
      const cashAmount = allocation?.amount ?? 0
      const creditAmount = creditByProject.get(project.id) ?? 0
      const cashApplicationAmount = cashAmount

      if (allocation && greaterThanMoney(cashApplicationAmount, 0)) {
        projectApplicationRows.push({
          projectId: project.id,
          customerId: project.customerId,
          paymentId: newPayment.id,
          paymentAllocationId: allocation.id,
          amount: money(cashApplicationAmount),
          sourceType: 'CASH',
        })
      }

      if (greaterThanMoney(creditAmount, 0)) {
        const appliedCreditTransactionId = appliedCreditTransactionByProject.get(project.id)
        if (!appliedCreditTransactionId) {
          throw new BusinessError('No se pudo registrar la aplicación de crédito', 500)
        }

        projectApplicationRows.push({
          projectId: project.id,
          customerId: project.customerId,
          paymentId: newPayment.id,
          creditTransactionId: appliedCreditTransactionId,
          amount: money(creditAmount),
          sourceType: 'CUSTOMER_CREDIT',
        })
      }
    }

    if (projectApplicationRows.length > 0) {
      await (tx as ProjectApplicationWriter).projectApplication.createMany({
        data: projectApplicationRows,
      })
    }

    paymentLogger.debug({ projectIds }, 'Checking for overpayments in transaction')

    const allocationByProject = new Map(
      allocations.map((allocation) => [allocation.projectId, allocation.allocatedAmount])
    )
    const overpaymentRows: CreditTransactionCreateManyRow[] = []

    for (const project of projects) {
      const startingFinancials = initialFinancials.get(project.id)
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

      if (greaterThanMoney(overpaymentAmount, 0)) {
        const rawBalanceAfterPayment = subtractMoney(
          subtractMoney(startingFinancials.rawBalance, allocatedAmount),
          creditAppliedToProject
        )
        const rawBalanceAfterPaymentNumber = moneyToNumber(rawBalanceAfterPayment)
        const overpaymentAmountNumber = moneyToNumber(overpaymentAmount)

        paymentLogger.info(
          {
            projectId: project.id,
            projectNumber: project.projectNumber,
            previousBalance: startingFinancials.balance,
            rawBalanceAfterPayment: rawBalanceAfterPaymentNumber,
            overpaymentAmount: overpaymentAmountNumber,
          },
          'Overpayment detected - converting to customer credit'
        )

        overpaymentRows.push({
          id: randomUUID(),
          customerId: project.customerId,
          amount: money(overpaymentAmount),
          type: 'OVERPAYMENT',
          description: `Sobrepago generado en proyecto P-${project.projectNumber}`,
          paymentId: newPayment.id,
          projectId: project.id,
          metadata: {
            paymentAmount: amount,
            creditApplied: creditAppliedToProject,
            projectBalance: rawBalanceAfterPaymentNumber,
            overpaymentAmount: overpaymentAmountNumber,
            paymentDate: paymentDate.toISOString(),
          },
        })

        paymentLogger.info(
          {
            projectId: project.id,
            projectNumber: project.projectNumber,
            creditGenerated: overpaymentAmountNumber,
          },
          'Overpayment credit generated successfully in transaction'
        )
      }
    }

    if (overpaymentRows.length > 0) {
      await (tx as ProjectApplicationWriter).creditTransaction.createMany({
        data: overpaymentRows,
      })
    }

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
