import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Schema de validación para reordenar estados
 */
const reorderSchema = z.object({
  statusIds: z.array(z.string().uuid('ID inválido')).min(1, 'Debe haber al menos un estado'),
})

/**
 * POST /api/aftersale-status/reorder
 *
 * Reordena los estados normales (NO inicial ni final) según el nuevo orden de IDs.
 * Recalcula automáticamente los valores de `order` con gaps de 10.
 *
 * Body:
 * ```json
 * {
 *   "statusIds": ["uuid-2", "uuid-1", "uuid-3"]  // Nuevo orden deseado
 * }
 * ```
 *
 * Validaciones:
 * - Todos los IDs deben existir
 * - Ningún ID puede ser de un estado inicial o final
 * - Todos los estados deben estar activos
 *
 * Lógica:
 * - Recalcula order como: 10, 20, 30, 40...
 * - Actualiza en transacción Prisma
 * - Retorna lista completa ordenada (inicial + normales + final)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = reorderSchema.parse(body)

    const { statusIds } = validatedData

    // 1. Verificar que todos los IDs existan
    const existingStatuses = await prisma.aftersaleStatus.findMany({
      where: {
        id: { in: statusIds },
      },
      select: {
        id: true,
        name: true,
        isInitial: true,
        isFinal: true,
        isActive: true,
      },
    })

    // Validar que se encontraron todos los IDs
    if (existingStatuses.length !== statusIds.length) {
      const foundIds = existingStatuses.map((s) => s.id)
      const missingIds = statusIds.filter((id) => !foundIds.includes(id))

      return NextResponse.json(
        { error: `Estados no encontrados: ${missingIds.join(', ')}` },
        { status: 404 }
      )
    }

    // 2. Validar que ninguno sea inicial o final
    const invalidStatuses = existingStatuses.filter((s) => s.isInitial || s.isFinal)

    if (invalidStatuses.length > 0) {
      const names = invalidStatuses.map((s) => `"${s.name}"`).join(', ')
      return NextResponse.json(
        {
          error: `No se pueden reordenar estados inicial o final: ${names}`,
        },
        { status: 400 }
      )
    }

    // 3. Validar que todos estén activos
    const inactiveStatuses = existingStatuses.filter((s) => !s.isActive)

    if (inactiveStatuses.length > 0) {
      const names = inactiveStatuses.map((s) => `"${s.name}"`).join(', ')
      return NextResponse.json(
        {
          error: `No se pueden reordenar estados inactivos: ${names}`,
        },
        { status: 400 }
      )
    }

    // 4. Recalcular orders con gaps de 10
    // statusIds está en el nuevo orden deseado
    // Asignar: 10, 20, 30, 40...
    const updates = statusIds.map((id, index) => ({
      id,
      order: (index + 1) * 10, // 10, 20, 30, 40...
    }))

    // 5. Actualizar en transacción Prisma
    await prisma.$transaction(
      updates.map((update) =>
        prisma.aftersaleStatus.update({
          where: { id: update.id },
          data: { order: update.order },
        })
      )
    )

    // 6. Retornar lista completa ordenada
    const allStatuses = await prisma.aftersaleStatus.findMany({
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
        _count: {
          select: { aftersales: true },
        },
      },
    })

    return NextResponse.json({
      message: 'Estados reordenados correctamente',
      aftersaleStatuses: allStatuses,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error reordering aftersale statuses:', error)
    return NextResponse.json(
      { error: 'Error al reordenar los estados de postventa' },
      { status: 500 }
    )
  }
}
