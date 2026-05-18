import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CreditTransactionType } from '@prisma/client'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updatePaymentApiSchema,
  type UpdatePaymentApiBody,
} from '@/lib/validations/payment-validations'
import { absMoney, money, moneyToNumber, negateMoney } from '@/lib/business-logic/money'

/**
 * PUT /api/payments/[id]
 *
 * Actualiza solo campos no financieros de un pago existente.
 * El monto y método de pago son inmutables para preservar consistencia financiera.
 */
export const PUT = withApiHandler<UpdatePaymentApiBody>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el pago existe
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
      },
    })

    if (!existingPayment) {
      throw new BusinessError('Pago no encontrado', 404)
    }

    const payment = await prisma.payment.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        ...(body.date !== undefined && { date: body.date }),
        ...(body.reference !== undefined && { reference: body.reference?.trim() || null }),
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

    // Verificar que el pago existe antes de la transacción
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

    // Transacción atómica: revertir créditos + eliminar pago
    await prisma.$transaction(async (tx) => {
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
          // Reversión explícita según tipo:
          // - OVERPAYMENT: monto positivo → reversión negativa (resta crédito)
          // - APPLIED: monto negativo → reversión positiva (devuelve crédito)
          const reversalAmount =
            ct.type === 'OVERPAYMENT' ? negateMoney(absMoney(ct.amount)) : absMoney(ct.amount)
          const ctAmount = moneyToNumber(ct.amount)
          const reversalAmountNumber = moneyToNumber(reversalAmount)

          deleteLogger.info(
            {
              transactionId: ct.id,
              type: ct.type,
              amount: ctAmount,
              reversalAmount: reversalAmountNumber,
            },
            'Credit transaction reversed'
          )
          return {
            customerId: ct.customerId,
            amount: money(reversalAmount),
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
    })

    deleteLogger.info({ affectedProjects: projectIds.length }, 'Payment deleted successfully')

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
