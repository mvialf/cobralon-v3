import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { CreditTransactionType } from '@prisma/client'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'
import type { PrismaTransaction } from '@/lib/db/types'
import {
  updatePaymentApiSchema,
  type UpdatePaymentApiBody,
} from '@/lib/validations/payment-validations'

/**
 * PUT /api/payments/[id]
 *
 * Actualiza un pago existente
 *
 * IMPORTANTE:
 * - Bloquea la edición si el pago tiene cuotas configuradas (selectedInstallments > 1)
 * - Bloquea la edición si el pago tiene crédito asociado
 */
export const PUT = withApiHandler<UpdatePaymentApiBody>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el pago existe
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        selectedInstallments: true,
        _count: { select: { creditTransactions: true } },
      },
    })

    if (!existingPayment) {
      throw new BusinessError('Pago no encontrado', 404)
    }

    // IMPORTANTE: Bloquear edición si el pago tiene cuotas
    if (existingPayment.selectedInstallments && existingPayment.selectedInstallments > 1) {
      throw new BusinessError(
        'No se puede editar un pago con cuotas. Para modificar, debe cancelar el pago y crear uno nuevo.'
      )
    }

    // IMPORTANTE: Bloquear edición si el pago tiene crédito asociado
    if (existingPayment._count.creditTransactions > 0) {
      throw new BusinessError(
        'No se puede editar un pago con crédito asociado. Elimine y cree uno nuevo.'
      )
    }

    // Transacción atómica: actualizar pago + recalcular balances
    const payment = await prisma.$transaction(async (tx: PrismaTransaction) => {
      const updated = await tx.payment.update({
        relationLoadStrategy: 'join',
        where: { id },
        data: {
          ...(body.amount !== undefined && { amount: body.amount }),
          ...(body.date !== undefined && { date: body.date }),
          ...(body.paymentMethodId !== undefined && { paymentMethodId: body.paymentMethodId }),
          ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          paymentMethod: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          allocations: {
            select: {
              id: true,
              allocatedAmount: true,
              projectId: true,
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
        },
      })

      // Recalcular balances dentro de la transacción
      if (body.amount !== undefined && updated.allocations.length > 0) {
        const projectIds = updated.allocations.map((alloc) => alloc.projectId)
        await updateMultipleProjectBalances(projectIds, tx)
      }

      return updated
    })

    return NextResponse.json(payment)
  },
  {
    bodySchema: updatePaymentApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar pago',
  }
)

/**
 * DELETE /api/payments/[id]
 *
 * Elimina un pago (hard delete)
 *
 * IMPORTANTE:
 * - Los Installments se eliminan automáticamente por cascade delete
 * - Los PaymentAllocations también se eliminan automáticamente por cascade delete
 */
export const DELETE = withApiHandler(
  async (_request, logger, { params }) => {
    const { id } = params
    const deleteLogger = logger.child({ operation: 'delete-payment', paymentId: id })

    // Verificar que el pago existe y obtener datos necesarios antes de la transacción
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        selectedInstallments: true,
        allocations: {
          select: {
            projectId: true,
          },
        },
      },
    })

    if (!existingPayment) {
      throw new BusinessError('Pago no encontrado', 404)
    }

    const projectIds = existingPayment.allocations.map((alloc) => alloc.projectId)

    // Transacción atómica: revertir créditos + eliminar pago + recalcular balances
    await prisma.$transaction(async (tx: PrismaTransaction) => {
      // 1. Buscar CreditTransactions asociadas al pago
      const creditTransactions = await tx.creditTransaction.findMany({
        where: { paymentId: id },
        select: { id: true, type: true, amount: true, customerId: true },
      })

      deleteLogger.info(
        { creditTransactionsFound: creditTransactions.length },
        'CreditTransactions linked to payment'
      )

      // 2. Crear entradas de ADJUSTMENT para auditoría (reversión en batch)
      if (creditTransactions.length > 0) {
        const reversals = creditTransactions.map((ct) => {
          const ctAmount = Number(ct.amount)

          // Reversión explícita según tipo:
          // - OVERPAYMENT: monto positivo → reversión negativa (resta crédito)
          // - APPLIED: monto negativo → reversión positiva (devuelve crédito)
          const reversalAmount =
            ct.type === 'OVERPAYMENT'
              ? -Math.abs(ctAmount)
              : Math.abs(ctAmount)

          deleteLogger.info(
            { transactionId: ct.id, type: ct.type, amount: ctAmount, reversalAmount },
            'Credit transaction reversed'
          )
          return {
            customerId: ct.customerId,
            amount: new Decimal(reversalAmount),
            type: CreditTransactionType.ADJUSTMENT,
            description: `Reversión por eliminación de pago ${id.slice(0, 8)}`,
            paymentId: null,
            metadata: {
              reversedTransactionId: ct.id,
              reversedType: ct.type,
              reversedAmount: ctAmount,
              deletedPaymentId: id,
            },
          }
        })

        await tx.creditTransaction.createMany({ data: reversals })
      }

      // 3. Eliminar el pago (cascade borra allocations + installments)
      await tx.payment.delete({
        where: { id },
      })

      // 4. Recalcular balances de proyectos afectados
      if (projectIds.length > 0) {
        await updateMultipleProjectBalances(projectIds, tx)
      }

    })

    deleteLogger.info({ projectsRecalculated: projectIds.length }, 'Payment deleted successfully')

    return NextResponse.json(
      {
        success: true,
        message: 'Pago eliminado correctamente',
        deletedPaymentId: id,
      },
      { status: 200 }
    )
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar pago' }
)
