import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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

    // Buscar visitas con status NO final
    const visits = await prisma.visit.findMany({
      where: {
        // Solo visitas no finalizadas
        visitStatus: {
          isFinal: false,
        },
        // Búsqueda por texto (si hay query)
        ...(query.length >= 2
          ? {
              OR: [
                {
                  name: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  phone: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  street: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  comuna: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
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
