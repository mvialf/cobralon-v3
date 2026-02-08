import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'
import type { PrismaTransaction } from '@/lib/db/types'
import { updateCustomerCreditBalance } from '@/lib/business-logic/update-customer-credit-balance'
import { logger } from '@/lib/logger'

/**
 * PUT /api/payments/[id]
 *
 * Actualiza un pago existente
 *
 * IMPORTANTE:
 * - Bloquea la edición si el pago tiene cuotas configuradas (selectedInstallments > 1)
 * - Solo permite editar pagos sin cuotas o de contado (selectedInstallments = null or 1)
 * - Esto previene inconsistencias entre el pago y sus installments ya generados
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

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
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    // IMPORTANTE: Bloquear edición si el pago tiene cuotas
    if (existingPayment.selectedInstallments && existingPayment.selectedInstallments > 1) {
      return NextResponse.json(
        {
          error:
            'No se puede editar un pago con cuotas. Para modificar, debe cancelar el pago y crear uno nuevo.',
        },
        { status: 400 }
      )
    }

    // IMPORTANTE: Bloquear edición si el pago tiene crédito asociado
    if (existingPayment._count.creditTransactions > 0) {
      return NextResponse.json(
        { error: 'No se puede editar un pago con crédito asociado. Elimine y cree uno nuevo.' },
        { status: 400 }
      )
    }

    // Extraer campos editables del body
    const { amount, date, paymentMethodId, reference, notes } = body

    // Validaciones básicas (solo de campos que se están editando)
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    // Transacción atómica: actualizar pago + recalcular balances
    const payment = await prisma.$transaction(async (tx: PrismaTransaction) => {
      const updated = await tx.payment.update({
        relationLoadStrategy: 'join',
        where: { id },
        data: {
          ...(amount !== undefined && { amount }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(paymentMethodId !== undefined && { paymentMethodId }),
          ...(reference !== undefined && { reference: reference?.trim() || null }),
          ...(notes !== undefined && { notes: notes?.trim() || null }),
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
      if (amount !== undefined && updated.allocations.length > 0) {
        const projectIds = updated.allocations.map((alloc) => alloc.projectId)
        await updateMultipleProjectBalances(projectIds, tx)
      }

      return updated
    })

    return NextResponse.json(payment)
  } catch (error) {
    logger.error({ err: error }, 'Error updating payment')
    return NextResponse.json({ error: 'Error al actualizar pago' }, { status: 500 })
  }
}

/**
 * DELETE /api/payments/[id]
 *
 * Elimina un pago (hard delete)
 *
 * IMPORTANTE:
 * - Los Installments se eliminan automáticamente por cascade delete (configurado en schema.prisma)
 * - Los PaymentAllocations también se eliminan automáticamente por cascade delete
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let deleteLogger = logger.child({ operation: 'delete-payment' })
  try {
    const { id } = await params
    deleteLogger = logger.child({ operation: 'delete-payment', paymentId: id })

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
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
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

      // 2. Crear entradas de ADJUSTMENT para auditoría (reversión)
      for (const ct of creditTransactions) {
        const ctAmount = Number(ct.amount)

        await tx.creditTransaction.create({
          data: {
            customerId: ct.customerId,
            amount: new Decimal(-ctAmount),
            type: 'ADJUSTMENT',
            description: `Reversión por eliminación de pago ${id.slice(0, 8)}`,
            paymentId: null,
            metadata: {
              reversedTransactionId: ct.id,
              reversedType: ct.type,
              reversedAmount: ctAmount,
              deletedPaymentId: id,
            },
          },
        })

        deleteLogger.info(
          { transactionId: ct.id, type: ct.type, amount: ctAmount },
          'Credit transaction reversed'
        )
      }

      // 3. Eliminar el pago (cascade borra allocations + installments)
      await tx.payment.delete({
        where: { id },
      })

      // 4. Recalcular balances de proyectos afectados
      if (projectIds.length > 0) {
        await updateMultipleProjectBalances(projectIds, tx)
      }

      // 5. Recalcular creditBalance desde ledger (si hubo credit_transactions)
      if (creditTransactions.length > 0) {
        await updateCustomerCreditBalance(existingPayment.customerId, tx)
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
  } catch (error) {
    deleteLogger.error({ err: error }, 'Failed to delete payment')
    return NextResponse.json({ error: 'Error al eliminar pago' }, { status: 500 })
  }
}
