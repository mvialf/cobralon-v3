import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'

/**
 * DELETE /api/projects/[id]/adjustments/[adjustmentId]
 *
 * Elimina un ajuste específico del proyecto
 */
export const DELETE = withApiHandler(
  async (_request, _logger, { params }) => {
    // Verificar que el ajuste existe y pertenece al proyecto
    const adjustment = await prisma.projectAdjustment.findUnique({
      where: { id: params.adjustmentId },
      select: {
        id: true,
        projectId: true,
      },
    })

    if (!adjustment) {
      throw new BusinessError('Ajuste no encontrado', 404)
    }

    if (adjustment.projectId !== params.id) {
      throw new BusinessError('El ajuste no pertenece a este proyecto', 400)
    }

    await prisma.projectAdjustment.delete({
      where: { id: params.adjustmentId },
    })

    return NextResponse.json({ message: 'Ajuste eliminado exitosamente' })
  },
  {
    validateUuidParams: ['id', 'adjustmentId'],
    fallbackError: 'Error al eliminar el ajuste',
  }
)
