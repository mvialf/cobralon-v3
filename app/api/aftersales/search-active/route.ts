import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/aftersales/search-active
 *
 * Busca aftersales NO finalizados (aftersaleStatus.isFinal = false)
 * Para usar en AftersaleSearchField del calendario
 *
 * Query params:
 * - q: término de búsqueda (busca en projectNumber, customerName, description)
 * - limit: máximo de resultados (default: 20)
 *
 * Response:
 * ```json
 * [
 *   {
 *     "id": "uuid",
 *     "description": "...",
 *     "contactPhone": "+56912345678",
 *     "reportedAt": "2024-01-15T10:00:00Z",
 *     "tasks": [...],
 *     "project": {
 *       "id": "uuid",
 *       "projectNumber": "2024-089",
 *       "projectName": "...",
 *       "street": "...",
 *       "apartment": "...",
 *       "comuna": "...",
 *       "region": "...",
 *       "customer": { "id": "uuid", "name": "..." }
 *     },
 *     "aftersaleStatus": {
 *       "id": "uuid",
 *       "name": "Abierto",
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

    // Buscar aftersales con status NO final
    const aftersales = await prisma.aftersale.findMany({
      where: {
        // Solo aftersales no finalizados
        aftersaleStatus: {
          isFinal: false,
        },
        // Búsqueda por texto (si hay query)
        ...(query.length >= 2
          ? {
              OR: [
                {
                  project: {
                    projectNumber: {
                      contains: query,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  project: {
                    customer: {
                      name: {
                        contains: query,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
                {
                  project: {
                    projectName: {
                      contains: query,
                      mode: 'insensitive',
                    },
                  },
                },
                {
                  description: {
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
        reportedAt: 'desc',
      },
      include: {
        project: {
          select: {
            id: true,
            projectNumber: true,
            projectName: true,
            street: true,
            apartment: true,
            comuna: true,
            region: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        aftersaleStatus: {
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

    return NextResponse.json(aftersales)
  } catch (error) {
    logger.error({ err: error }, 'Error searching active aftersales')
    return NextResponse.json({ error: 'Error al buscar postventas' }, { status: 500 })
  }
})
