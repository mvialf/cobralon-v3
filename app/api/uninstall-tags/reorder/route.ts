import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { reorderTagSchema, type ReorderTagBody } from '@/lib/validations/reorder-validations'

/**
 * POST /api/uninstall-tags/reorder
 *
 * Reordena las uninstall tags según el nuevo orden de IDs.
 * Recalcula automáticamente los valores de `order` con gaps de 10.
 */
export const POST = withApiHandler<ReorderTagBody>(
  async (_request, _logger, { body }) => {
    const { tagIds } = body

    // 1. Verificar que todos los IDs existan
    const existingTags = await prisma.uninstallTag.findMany({
      where: { id: { in: tagIds } },
      select: { id: true, name: true, isActive: true },
    })

    if (existingTags.length !== tagIds.length) {
      const foundIds = existingTags.map((t) => t.id)
      const missingIds = tagIds.filter((id) => !foundIds.includes(id))
      throw new BusinessError(`Uninstall tags no encontradas: ${missingIds.join(', ')}`, 404)
    }

    // 2. Validar que todas estén activas
    const inactiveTags = existingTags.filter((t) => !t.isActive)
    if (inactiveTags.length > 0) {
      const names = inactiveTags.map((t) => `"${t.name}"`).join(', ')
      throw new BusinessError(`No se pueden reordenar tags inactivas: ${names}`, 400)
    }

    // 3. Recalcular orders con gaps de 10
    const updates = tagIds.map((id, index) => ({
      id,
      order: (index + 1) * 10,
    }))

    // 4. Actualizar en transacción Prisma
    await prisma.$transaction(
      updates.map((update) =>
        prisma.uninstallTag.update({
          where: { id: update.id },
          data: { order: update.order },
        })
      )
    )

    // 5. Retornar lista completa ordenada
    const allTags = await prisma.uninstallTag.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        color: {
          select: { id: true, name: true, key: true, bgClass: true, textClass: true },
        },
      },
    })

    return NextResponse.json({
      message: 'Uninstall tags reordenadas correctamente',
      uninstallTags: allTags,
    })
  },
  {
    bodySchema: reorderTagSchema,
    fallbackError: 'Error al reordenar las uninstall tags',
  }
)
