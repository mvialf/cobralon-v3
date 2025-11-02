import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Schema de validación para reordenar uninstall tags
 */
const reorderSchema = z.object({
  tagIds: z.array(z.string().uuid('ID inválido')).min(1, 'Debe haber al menos una tag'),
})

/**
 * POST /api/uninstall-tags/reorder
 *
 * Reordena las uninstall tags según el nuevo orden de IDs.
 * Recalcula automáticamente los valores de `order` con gaps de 10.
 *
 * Body:
 * ```json
 * {
 *   "tagIds": ["uuid-2", "uuid-1", "uuid-3"]  // Nuevo orden deseado
 * }
 * ```
 *
 * Validaciones:
 * - Todos los IDs deben existir
 * - Todos las tags deben estar activas
 *
 * Lógica:
 * - Recalcula order como: 10, 20, 30, 40...
 * - Actualiza en transacción Prisma
 * - Retorna lista completa ordenada
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = reorderSchema.parse(body)

    const { tagIds } = validatedData

    // 1. Verificar que todos los IDs existan
    const existingTags = await prisma.uninstallTag.findMany({
      where: {
        id: { in: tagIds },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    })

    // Validar que se encontraron todos los IDs
    if (existingTags.length !== tagIds.length) {
      const foundIds = existingTags.map((t) => t.id)
      const missingIds = tagIds.filter((id) => !foundIds.includes(id))

      return NextResponse.json(
        { error: `Uninstall tags no encontradas: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // 2. Validar que todas estén activas
    const inactiveTags = existingTags.filter((t) => !t.isActive)

    if (inactiveTags.length > 0) {
      const names = inactiveTags.map((t) => `"${t.name}"`).join(', ')
      return NextResponse.json(
        {
          error: `No se pueden reordenar tags inactivas: ${names}`,
        },
        { status: 400 }
      )
    }

    // 3. Recalcular orders con gaps de 10
    // tagIds está en el nuevo orden deseado
    // Asignar: 10, 20, 30, 40...
    const updates = tagIds.map((id, index) => ({
      id,
      order: (index + 1) * 10, // 10, 20, 30, 40...
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
          select: {
            id: true,
            name: true,
            key: true,
            bgClass: true,
            textClass: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Uninstall tags reordenadas correctamente',
      uninstallTags: allTags,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error reordering uninstall tags:', error)
    return NextResponse.json({ error: 'Error al reordenar las uninstall tags' }, { status: 500 })
  }
}
