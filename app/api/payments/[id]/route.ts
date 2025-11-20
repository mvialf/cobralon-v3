import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'

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

    // Actualizar el pago
    const payment = await prisma.payment.update({
      relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
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

    // Actualizar balance de todos los proyectos afectados (si cambió el amount)
    if (amount !== undefined && payment.allocations.length > 0) {
      const projectIds = payment.allocations.map((alloc) => alloc.projectId)
      try {
        await updateMultipleProjectBalances(projectIds)
      } catch (balanceError) {
        console.error('Error updating project balances:', balanceError)
        // No fallar la petición - el job nocturno corregirá inconsistencias
      }
    }

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

    // Verificar que el pago existe y obtener projectIds antes de eliminar
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
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

    // Guardar projectIds antes de eliminar
    const projectIds = existingPayment.allocations.map((alloc) => alloc.projectId)

    // Eliminar el pago (cascade delete elimina installments y allocations automáticamente)
    await prisma.payment.delete({
      where: { id },
    })

    // Actualizar balance de todos los proyectos afectados
    if (projectIds.length > 0) {
      try {
        await updateMultipleProjectBalances(projectIds)
      } catch (balanceError) {
        console.error('Error updating project balances after deletion:', balanceError)
        // No fallar la petición - el job nocturno corregirá inconsistencias
      }
    }

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
