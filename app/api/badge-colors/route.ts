import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api-handler'

/**
 * GET /api/badge-colors
 *
 * Obtiene todos los colores de badge activos, ordenados por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir colores inactivos (default: false)
 */
export const GET = withApiHandler(
  async (request) => {
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
  },
  { fallbackError: 'Error al obtener los colores de badge' }
)
