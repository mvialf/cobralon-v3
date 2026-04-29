/**
 * Use-case: crear un pago.
 *
 * Orquesta validaciones, cálculo de comisión, transacción atómica de creación,
 * aplicación de crédito (con lock pesimista contra race conditions), actualización
 * de balances de proyectos y detección de sobrepagos.
 *
 * Extraído desde `app/api/payments/route.ts` para que sea testeable sin HTTP
 * mocks y reusable desde imports/jobs/scripts.
 *
 * Errores:
 * - `BusinessError` con statusCode apropiado para condiciones de negocio
 * - Re-lanza errores de Prisma sin tocarlos (los maneja `withApiHandler`)
 */

import type pino from 'pino'
import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { BusinessError } from '@/lib/api-handler'
import type { PrismaTransaction } from '@/lib/db/types'
import {
  validatePaymentType,
  validateAllocationsSum,
  validateNoDuplicateProjects,
  validateSameCustomer,
  validateSameCurrency,
} from '@/lib/validations/payment-business-rules'
import { canApplyCredit, getCustomerCreditBalance } from '@/lib/business-logic/credit-management'
import {
  computePaymentCommission,
  distributeNetToInstallments,
} from '@/lib/business-logic/commission'
import { generatePrismaInstallmentsCreate } from '@/lib/business-logic/installments'
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'
import type { CreatePaymentApiBody } from '@/lib/validations/payment-validations'

export type CreatePaymentInput = CreatePaymentApiBody

export interface CreatePaymentDeps {
  prisma: PrismaClient
  logger: pino.Logger
}

/**
 * Tipo del pago retornado, con relaciones incluidas (igual al `include` del
 * `tx.payment.create` original — el frontend depende de esta forma).
 */
export type CreatedPayment = Awaited<ReturnType<typeof createPayment>>

export async function createPayment(input: CreatePaymentInput, deps: CreatePaymentDeps) {
  const { prisma, logger } = deps
  const {
    type,
    customerId,
    amount,
    currency,
    date,
    paymentMethodId,
    reference,
    notes,
    allocations,
    selectedInstallments,
    creditApplied,
  } = input

  const paymentLogger = logger.child({
    type,
    customerId,
    amount,
    currency,
    allocationCount: allocations.length,
  })

  paymentLogger.info('Payment creation requested')

  const projectIds = allocations.map((a) => a.projectId)
  const creditToApply = creditApplied || 0

  // Defer: lanzar 3 queries antes de validaciones síncronas
  const dbQueriesPromise = Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
      include: { commissionTiers: true },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, customerId: true, currency: true },
    }),
  ])

  const typeValidation = validatePaymentType(type, allocations)
  if (!typeValidation.valid) {
    paymentLogger.warn({ allocationCount: allocations.length }, 'Payment type validation failed')
    throw new BusinessError(typeValidation.error!, 400)
  }

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
    paymentLogger.warn({ projectIds }, 'Duplicate project IDs detected')
    throw new BusinessError(duplicatesValidation.error!, 400)
  }

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

  const sumValidation = validateAllocationsSum(amount, allocations, currency)
  if (!sumValidation.valid) {
    paymentLogger.warn(
      { expected: amount, actual: allocations.reduce((s, a) => s + a.allocatedAmount, 0) },
      'Allocation sum mismatch'
    )
    throw new BusinessError(sumValidation.error!, 400)
  }

  if (creditToApply > 0 && (type !== 'Project' || allocations.length !== 1)) {
    paymentLogger.warn('Credit can only be applied to Project payments with 1 allocation')
    throw new BusinessError('El crédito solo puede aplicarse a pagos de proyecto únicos', 400)
  }

  paymentLogger.debug('All validations passed')

  const paymentDate = new Date(date)

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
      creditApplied: creditToApply,
      commission: commissionResult
        ? { amount: commissionResult.commissionAmount, rate: commissionResult.percentageFee }
        : null,
    },
    'Creating payment in database'
  )

  const payment = await prisma.$transaction(async (tx: PrismaTransaction) => {
    const newPayment = await tx.payment.create({
      data: {
        type,
        customerId,
        amount: new Decimal(amount),
        currency,
        date: paymentDate,
        paymentMethodId,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
        selectedInstallments: selectedInstallments || null,
        commissionAmount: commissionResult ? new Decimal(commissionResult.commissionAmount) : null,
        netAmount: commissionResult ? new Decimal(commissionResult.netAmount) : null,
        commissionRate: commissionResult ? new Decimal(commissionResult.percentageFee) : null,
        commissionFixed: commissionResult ? new Decimal(commissionResult.fixedFee) : null,
        allocations: {
          create: allocations.map((a) => ({
            projectId: a.projectId,
            allocatedAmount: new Decimal(a.allocatedAmount),
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
      const installmentAmounts = newPayment.installments.map((inst) => Number(inst.amount))
      const netAmounts = distributeNetToInstallments(installmentAmounts, commissionResult.netAmount)

      await Promise.all(
        newPayment.installments.map((inst, idx) =>
          tx.installment.update({
            where: { id: inst.id },
            data: { netAmount: new Decimal(netAmounts[idx]) },
          })
        )
      )

      paymentLogger.debug(
        { installmentCount: newPayment.installments.length },
        'Net amounts distributed to installments'
      )
    }

    if (creditToApply > 0) {
      // Lock pesimista sobre Customer: previene race conditions con pagos
      // concurrentes o refunds del mismo cliente.
      await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId}::uuid FOR UPDATE`

      const [customerCreditBalance, creditProject] = await Promise.all([
        getCustomerCreditBalance(customerId, tx),
        tx.project.findUnique({
          where: { id: allocations[0].projectId },
          select: { balance: true },
        }),
      ])

      if (!creditProject) {
        throw new BusinessError('Proyecto no encontrado durante validación de crédito', 404)
      }

      const projectBalance = Number(creditProject.balance)

      const creditValidation = canApplyCredit(
        creditToApply,
        customerCreditBalance,
        projectBalance,
        currency
      )
      if (!creditValidation.valid) {
        throw new BusinessError(creditValidation.error!, 400)
      }

      await tx.creditTransaction.create({
        data: {
          customerId,
          amount: new Prisma.Decimal(-creditToApply),
          type: 'APPLIED',
          description: `Crédito aplicado al pago ${newPayment.id.slice(0, 8)}`,
          paymentId: newPayment.id,
          projectId: allocations[0].projectId,
          metadata: {
            paymentAmount: amount,
            creditApplied: creditToApply,
            paymentDate: paymentDate.toISOString(),
          },
        },
      })

      paymentLogger.info(
        {
          paymentId: newPayment.id,
          creditApplied: creditToApply,
          previousCredit: customerCreditBalance,
        },
        'Credit applied successfully in transaction'
      )
    }

    paymentLogger.debug({ projectIds }, 'Updating project balances in transaction')
    await updateMultipleProjectBalances(projectIds, tx)
    paymentLogger.debug('Project balances updated successfully in transaction')

    paymentLogger.debug({ projectIds }, 'Checking for overpayments in transaction')
    const updatedProjects = await tx.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, projectNumber: true, balance: true, customerId: true },
    })

    for (const project of updatedProjects) {
      const balance = Number(project.balance)
      if (balance < 0) {
        const overpaymentAmount = Math.abs(balance)

        paymentLogger.info(
          {
            projectId: project.id,
            projectNumber: project.projectNumber,
            negativeBalance: balance,
            overpaymentAmount,
          },
          'Overpayment detected - converting to customer credit'
        )

        await tx.project.update({
          where: { id: project.id },
          data: { balance: new Decimal(0) },
        })

        await tx.creditTransaction.create({
          data: {
            customerId: project.customerId,
            amount: new Prisma.Decimal(overpaymentAmount),
            type: 'OVERPAYMENT',
            description: `Sobrepago generado en proyecto P-${project.projectNumber}`,
            paymentId: newPayment.id,
            projectId: project.id,
            metadata: {
              paymentAmount: amount,
              projectBalance: balance,
              overpaymentAmount,
              paymentDate: paymentDate.toISOString(),
            },
          },
        })

        paymentLogger.info(
          {
            projectId: project.id,
            projectNumber: project.projectNumber,
            creditGenerated: overpaymentAmount,
          },
          'Overpayment credit generated successfully in transaction'
        )
      }
    }

    return newPayment
  })

  paymentLogger.info(
    {
      paymentId: payment.id,
      allocationsCreated: payment.allocations.length,
      installmentsCreated: payment.installments.length,
      creditApplied: creditToApply,
    },
    'Payment created successfully (atomic transaction completed)'
  )

  return payment
}
