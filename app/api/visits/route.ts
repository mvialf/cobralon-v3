import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import { withApiHandler } from '@/lib/api-handler'
import {
  createVisitApiSchema,
  type CreateVisitApiBody,
} from '@/lib/validations/visit-validations'
import { queryVisitList, countVisits, getVisitStatusFacets } from '@/lib/queries/visit-list'

import { z } from 'zod'

/**
 * GET /api/visits
 *
 * Obtiene lista de visitas con paginación en DB (SQL optimizado)
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 50, max: 100)
 *   - search: buscar por nombre, teléfono, dirección o comuna (normalize_text)
 *   - visitStatusIds: filtrar por estados (comma-separated UUIDs)
 *   - includeFacets: incluir conteos por estado (para filtros)
 *   - sortBy: columna para ordenar (date, createdAt, name)
 *   - sortOrder: dirección de orden (asc, desc)
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const { page, limit } = parsePaginationParams(searchParams, 50)
  const search = searchParams.get('search') || ''
  const visitStatusIdsRaw = searchParams.get('visitStatusIds') || ''
  const visitStatusIds = visitStatusIdsRaw ? visitStatusIdsRaw.split(',').filter(Boolean) : []
  const includeFacets = searchParams.get('includeFacets') === 'true'

  // Sorting params con validación Zod
  const sortBySchema = z.enum(['date', 'createdAt', 'name', 'comuna', 'visitStatus']).optional()
  const sortOrderSchema = z.enum(['asc', 'desc']).optional()
  const sortBy = sortBySchema.safeParse(searchParams.get('sortBy') || undefined).data
  const sortOrder = sortOrderSchema.safeParse(searchParams.get('sortOrder') || undefined).data

  logger.debug(
    {
      page,
      limit,
      filters: {
        search: search || undefined,
        visitStatusIds: visitStatusIds.length ? visitStatusIds : undefined,
      },
    },
    'Fetching visits with filters'
  )

  try {
    const filters = { page, limit, search, visitStatusIds, sortBy, sortOrder }

    // Ejecutar queries en paralelo: datos + conteo + facets (condicional)
    const [visits, total, facets] = await Promise.all([
      queryVisitList(filters),
      countVisits({ search, visitStatusIds }),
      includeFacets ? getVisitStatusFacets({ search }) : undefined,
    ])

    logger.info(
      {
        count: visits.length,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      'Visits fetched successfully'
    )

    return NextResponse.json({
      data: visits,
      pagination: buildPaginationResponse(page, limit, total),
      ...(facets && { facets: { visitStatus: facets } }),
    })
  } catch (error) {
    logger.error({ error }, 'Error fetching visits')
    return NextResponse.json({ error: 'Error al obtener las visitas' }, { status: 500 })
  }
})

/**
 * POST /api/visits
 *
 * Crea una nueva visita
 */
export const POST = withApiHandler<CreateVisitApiBody>(
  async (_request, logger, { body }) => {
    logger.debug({ body }, 'Creating new visit')

    // Transformar payload: date string → Date
    const visitData = {
      name: body.name,
      phone: body.phone || null,
      street: body.street || null,
      apartment: body.apartment || null,
      comuna: body.comuna,
      region: body.region,
      visitStatusId: body.visitStatusId,
      date: new Date(body.date),
      scheduledTime: body.scheduledTime || null,
      observations: body.observations || null,
    }

    // Crear visita
    const visit = await prisma.visit.create({
      data: visitData,
      include: {
        visitStatus: {
          select: {
            id: true,
            name: true,
            isInitial: true,
            isFinal: true,
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

    logger.info({ visitId: visit.id }, 'Visit created successfully')

    return NextResponse.json(visit, { status: 201 })
  },
  { bodySchema: createVisitApiSchema, fallbackError: 'Error al crear la visita' }
)
