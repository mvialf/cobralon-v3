import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import {
  updateMultipleProjectBalances,
  type PrismaTransaction,
} from '@/lib/business-logic/update-project-balance'

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
    console.error('Error updating payment:', error)
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
  try {
    const { id } = await params

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

      // 2. Revertir cada CreditTransaction
      for (const ct of creditTransactions) {
        const ctAmount = Number(ct.amount)

        if (ct.type === 'APPLIED') {
          // APPLIED = crédito usado (monto negativo) → devolver al cliente
          await tx.customer.update({
            where: { id: ct.customerId },
            data: { creditBalance: { increment: Math.abs(ctAmount) } },
          })
        } else if (ct.type === 'OVERPAYMENT') {
          // OVERPAYMENT = crédito generado (monto positivo) → retirar del cliente
          await tx.customer.update({
            where: { id: ct.customerId },
            data: { creditBalance: { decrement: ctAmount } },
          })
        }

        // Registrar reversión como ADJUSTMENT
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

    return NextResponse.json(
      {
        success: true,
        message: 'Pago eliminado correctamente',
        deletedPaymentId: id,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json({ error: 'Error al eliminar pago' }, { status: 500 })
  }
}
