import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { reorderStatusSchema, type ReorderStatusBody } from '@/lib/validations/reorder-validations'

/**
 * POST /api/project-status/reorder
 *
 * Reordena los estados normales (NO inicial ni final) según el nuevo orden de IDs.
 * Recalcula automáticamente los valores de `order` con gaps de 10.
 */
export const POST = withApiHandler<ReorderStatusBody>(
  async (_request, _logger, { body }) => {
    const { statusIds } = body

    // 1. Verificar que todos los IDs existan
    const existingStatuses = await prisma.projectStatus.findMany({
      where: { id: { in: statusIds } },
      select: { id: true, name: true, isInitial: true, isFinal: true, isActive: true },
    })

    if (existingStatuses.length !== statusIds.length) {
      const foundIds = existingStatuses.map((s) => s.id)
      const missingIds = statusIds.filter((id) => !foundIds.includes(id))
      throw new BusinessError(`Estados no encontrados: ${missingIds.join(', ')}`, 404)
    }

    // 2. Validar que ninguno sea inicial o final
    const invalidStatuses = existingStatuses.filter((s) => s.isInitial || s.isFinal)
    if (invalidStatuses.length > 0) {
      const names = invalidStatuses.map((s) => `"${s.name}"`).join(', ')
      throw new BusinessError(`No se pueden reordenar estados inicial o final: ${names}`, 400)
    }

    // 3. Validar que todos estén activos
    const inactiveStatuses = existingStatuses.filter((s) => !s.isActive)
    if (inactiveStatuses.length > 0) {
      const names = inactiveStatuses.map((s) => `"${s.name}"`).join(', ')
      throw new BusinessError(`No se pueden reordenar estados inactivos: ${names}`, 400)
    }

    // 4. Recalcular orders con gaps de 10
    const updates = statusIds.map((id, index) => ({
      id,
      order: (index + 1) * 10,
    }))

    // 5. Actualizar en transacción Prisma
    await prisma.$transaction(
      updates.map((update) =>
        prisma.projectStatus.update({
          where: { id: update.id },
          data: { order: update.order },
        })
      )
    )

    // 6. Retornar lista completa ordenada
    const allStatuses = await prisma.projectStatus.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        color: {
          select: { id: true, name: true, key: true, bgClass: true, textClass: true },
        },
        _count: { select: { projects: true } },
      },
    })

    return NextResponse.json({
      message: 'Estados reordenados correctamente',
      projectStatuses: allStatuses,
    })
  },
  {
    bodySchema: reorderStatusSchema,
    fallbackError: 'Error al reordenar los estados de proyecto',
  }
)
