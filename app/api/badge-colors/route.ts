import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/badge-colors
 *
 * Obtiene todos los colores de badge activos, ordenados por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir colores inactivos (default: false)
 *
 * Response:
 * ```json
 * {
 *   "badgeColors": [
 *     {
 *       "id": "uuid",
 *       "name": "Azul",
 *       "key": "blue",
 *       "bgClass": "bg-blue-500",
 *       "textClass": "text-white",
 *       "order": 6,
 *       "isActive": true
 *     }
 *   ]
 * }
 * ```
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const badgeColors = await prisma.badgeColor.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        key: true,
        bgClass: true,
        textClass: true,
        order: true,
        isActive: true,
      },
    })

    return NextResponse.json({ badgeColors })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching badge colors')
    return NextResponse.json({ error: 'Error al obtener los colores de badge' }, { status: 500 })
  }
})
