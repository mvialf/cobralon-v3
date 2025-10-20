import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * PATCH /api/payment-methods/[id]/toggle
 * Alterna el estado activo/inactivo de un método de pago
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar que el método existe
    const method = await prisma.paymentMethod.findUnique({
      where: { id },
    })

    if (!method) {
      return NextResponse.json({ error: 'Método de pago no encontrado' }, { status: 404 })
    }

    // Toggle estado
    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        active: !method.active,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    })

    return NextResponse.json({
      paymentMethod: updated,
      message: `El método "${method.name}" ahora está ${updated.active ? 'activo' : 'inactivo'}`,
    })
  } catch (error) {
    console.error('Error toggling payment method:', error)
    return NextResponse.json(
      { error: 'Error al cambiar el estado del método de pago' },
      { status: 500 }
    )
  }
}
