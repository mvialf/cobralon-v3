import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/visits/search-active
 *
 * Busca visitas NO finalizadas (visitStatus.isFinal = false)
 * Para usar en VisitSearchField del calendario
 *
 * Query params:
 * - q: término de búsqueda (busca en nombre, teléfono, dirección, comuna)
 * - limit: máximo de resultados (default: 20)
 *
 * Response:
 * ```json
 * [
 *   {
 *     "id": "uuid",
 *     "name": "Juan Pérez",
 *     "phone": "+56912345678",
 *     "street": "...",
 *     "apartment": "...",
 *     "comuna": "...",
 *     "region": "...",
 *     "date": "2024-01-15T10:00:00Z",
 *     "observations": "...",
 *     "visitStatus": {
 *       "id": "uuid",
 *       "name": "Pendiente",
 *       "color": { "bgClass": "...", "textClass": "..." }
 *     }
 *   }
 * ]
 * ```
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Búsqueda normalizada (sin acentos, case-insensitive) via normalize_text() de PostgreSQL
    let whereCondition: Prisma.VisitWhereInput = {
      visitStatus: { isFinal: false },
    }

    if (query.length >= 2) {
      const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT v.id
        FROM "Visit" v
        JOIN "VisitStatus" vs ON vs.id = v."visitStatusId"
        WHERE vs."isFinal" = false
          AND (
            normalize_text(v.name) LIKE normalize_text(${`%${query}%`})
            OR normalize_text(COALESCE(v.phone, '')) LIKE normalize_text(${`%${query}%`})
            OR normalize_text(COALESCE(v.street, '')) LIKE normalize_text(${`%${query}%`})
            OR normalize_text(v.comuna) LIKE normalize_text(${`%${query}%`})
          )
        LIMIT ${limit}
      `
      whereCondition = { id: { in: matchingIds.map((r) => r.id) } }
    }

    const visits = await prisma.visit.findMany({
      where: whereCondition,
      take: limit,
      orderBy: {
        date: 'desc',
      },
      include: {
        visitStatus: {
          select: {
            id: true,
            name: true,
            color: {
              select: {
                bgClass: true,
                textClass: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(visits)
  } catch (error) {
    logger.error({ err: error }, 'Error searching active visits')
    return NextResponse.json({ error: 'Error al buscar visitas' }, { status: 500 })
  }
})
