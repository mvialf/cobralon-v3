import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/payments/[id]/cancel
 *
 * Anula un pago (soft delete)
 *
 * Body:
 *   - reason: string (opcional) - Razón de la anulación
 *
 * IMPORTANTE:
 * - No elimina el registro, solo cambia el status a 'CANCELLED'
 * - Guarda fecha de cancelación (cancelledAt)
 * - Guarda razón opcional (cancelledReason)
 * - Los balances de proyectos se recalculan automáticamente
 *   (calculateProjectBalance ignora allocations de pagos CANCELLED)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason } = body

    // Verificar que el pago existe
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    })

    if (!existingPayment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    // Verificar que el pago no esté ya cancelado
    if (existingPayment.status === 'CANCELLED') {
      return NextResponse.json({ error: 'El pago ya está anulado' }, { status: 400 })
    }

    // Anular el pago (soft delete)
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledReason: reason?.trim() || null,
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
            requiresReference: true,
            icon: true,
          },
        },
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
      },
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error cancelling payment:', error)
    return NextResponse.json({ error: 'Error al anular pago' }, { status: 500 })
  }
}
