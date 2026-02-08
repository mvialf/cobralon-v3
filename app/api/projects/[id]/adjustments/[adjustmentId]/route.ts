import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { updateProjectBalanceWithAdjustments } from '@/lib/business-logic/update-project-balance'

/**
 * DELETE /api/projects/[id]/adjustments/[adjustmentId]
 *
 * Elimina un ajuste específico del proyecto
 * Recalcula automáticamente el balance del proyecto
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

    // Eliminar el ajuste y actualizar el balance en una transacción
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar el ajuste
      await tx.projectAdjustment.delete({
        where: { id: params.adjustmentId },
      })

      // 2. Recalcular el balance del proyecto
      await updateProjectBalanceWithAdjustments(params.id, tx)
    })

    return NextResponse.json({ message: 'Ajuste eliminado exitosamente' })
  },
  {
    validateUuidParams: ['id', 'adjustmentId'],
    fallbackError: 'Error al eliminar el ajuste',
  }
)
