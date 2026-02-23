import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import { withApiHandler } from '@/lib/api-handler'
import {
  createVisitApiSchema,
  type CreateVisitApiBody,
} from '@/lib/validations/visit-validations'

import { z } from 'zod'
import { anyFieldMatchesSearch } from '@/lib/utils/normalize'

/**
 * GET /api/visits
 *
 * Obtiene lista de visitas con paginación opcional
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 50, max: 100)
 *   - search: buscar por nombre, teléfono, dirección o comuna
 *   - visitStatusIds: filtrar por estados (comma-separated UUIDs)
 *   - includeFacets: incluir conteos por estado (para filtros)
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const { page, limit } = parsePaginationParams(searchParams, 50)
  const search = searchParams.get('search') || ''
  const visitStatusIdsRaw = searchParams.get('visitStatusIds') || ''
  const visitStatusIds = visitStatusIdsRaw ? visitStatusIdsRaw.split(',').filter(Boolean) : []
  const includeFacets = searchParams.get('includeFacets') === 'true'

  // Sorting params con validación Zod
  const sortBySchema = z.enum(['date']).optional()
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
    // Obtener todas las visitas (filtros se aplican en memoria para normalización de búsqueda)
    const allVisits = await prisma.visit.findMany({
      relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
      orderBy: { date: 'desc' },
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

    // Filtrar con búsqueda normalizada (ignora acentos/tildes)
    // "jose" encontrará "José", "nunoa" encontrará "Ñuñoa"
    const searchFiltered = search
      ? allVisits.filter((visit) =>
          anyFieldMatchesSearch([visit.name, visit.phone, visit.street, visit.comuna], search)
        )
      : allVisits

    // Generar facets ANTES de aplicar filtro de estado
    // (muestra conteos por estado para el search actual)
    let facets: { visitStatus: { value: string; label: string; count: number }[] } | undefined
    if (includeFacets) {
      const facetMap = new Map<string, { count: number; name: string }>()
      for (const visit of searchFiltered) {
        const existing = facetMap.get(visit.visitStatusId)
        if (existing) {
          existing.count++
        } else {
          facetMap.set(visit.visitStatusId, { count: 1, name: visit.visitStatus.name })
        }
      }
      facets = {
        visitStatus: Array.from(facetMap.entries()).map(([statusId, { count, name }]) => ({
          value: statusId,
          label: name,
          count,
        })),
      }
    }

    // Aplicar filtro de estado (después de facets)
    const statusFiltered =
      visitStatusIds.length > 0
        ? searchFiltered.filter((visit) => visitStatusIds.includes(visit.visitStatusId))
        : searchFiltered

    // Aplicar sorting en memoria (ya que los datos se filtran post-fetch)
    if (sortBy === 'date') {
      const direction = sortOrder === 'asc' ? 1 : -1
      statusFiltered.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return (dateA - dateB) * direction
      })
    }

    // Aplicar paginación manualmente
    const total = statusFiltered.length
    const skip = (page - 1) * limit
    const visits = statusFiltered.slice(skip, skip + limit)

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
      ...(facets && { facets }),
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
