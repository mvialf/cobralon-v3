import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
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

    // Búsqueda normalizada (sin acentos, case-insensitive) via normalize_text() de PostgreSQL
    let whereCondition: Prisma.AftersaleWhereInput = {
      aftersaleStatus: { isFinal: false },
    }

    if (query.length >= 2) {
      const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT a.id
        FROM "Aftersale" a
        JOIN "AftersaleStatus" ast ON ast.id = a."aftersaleStatusId"
        JOIN "Project" p ON p.id = a."projectId"
        JOIN "Customer" c ON c.id = p."customerId"
        WHERE ast."isFinal" = false
          AND (
            normalize_text(p."projectNumber") LIKE normalize_text(${`%${query}%`})
            OR normalize_text(c.name) LIKE normalize_text(${`%${query}%`})
            OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${query}%`})
            OR normalize_text(a.description) LIKE normalize_text(${`%${query}%`})
          )
        LIMIT ${limit}
      `
      whereCondition = { id: { in: matchingIds.map((r) => r.id) } }
    }

    const aftersales = await prisma.aftersale.findMany({
      where: whereCondition,
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
