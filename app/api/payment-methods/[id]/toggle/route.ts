import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'

/**
 * PATCH /api/payment-methods/[id]/toggle
 * Alterna el estado activo/inactivo de un método de pago
 */
export const PATCH = withApiHandler(
  async (_request, _logger, { params }) => {
    const { id } = params

    // Verificar que el método existe
    const method = await prisma.paymentMethod.findUnique({
      where: { id },
    })

    if (!method) {
      throw new BusinessError('Método de pago no encontrado', 404)
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
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al cambiar el estado del método de pago',
  }
)
