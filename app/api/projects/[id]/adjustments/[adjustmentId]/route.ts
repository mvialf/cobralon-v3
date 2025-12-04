import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateProjectBalanceWithAdjustments } from '@/lib/business-logic/update-project-balance'

/**
 * DELETE /api/projects/[id]/adjustments/[adjustmentId]
 *
 * Elimina un ajuste específico del proyecto
 * Recalcula automáticamente el balance del proyecto
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; adjustmentId: string }> }
) {
  try {
    const { id, adjustmentId } = await params

    // Verificar que el ajuste existe y pertenece al proyecto
    const adjustment = await prisma.projectAdjustment.findUnique({
      where: { id: adjustmentId },
      select: {
        id: true,
        projectId: true,
      },
    })

    if (!adjustment) {
      return NextResponse.json({ error: 'Ajuste no encontrado' }, { status: 404 })
    }

    if (adjustment.projectId !== id) {
      return NextResponse.json({ error: 'El ajuste no pertenece a este proyecto' }, { status: 400 })
    }

    // Eliminar el ajuste y actualizar el balance en una transacción
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar el ajuste
      await tx.projectAdjustment.delete({
        where: { id: adjustmentId },
      })

      // 2. Recalcular el balance del proyecto
      await updateProjectBalanceWithAdjustments(id, tx)
    })

    return NextResponse.json({ message: 'Ajuste eliminado exitosamente' })
  } catch (error) {
    console.error('Error deleting project adjustment:', error)
    return NextResponse.json({ error: 'Error al eliminar el ajuste' }, { status: 500 })
  }
}
