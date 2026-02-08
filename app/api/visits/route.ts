import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { type CreateVisitAPIPayload } from '@/lib/validations/visit-validations'
import { Prisma } from '@prisma/client'
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
 *   - visitStatusId: filtrar por estado específico
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const search = searchParams.get('search') || ''
  const visitStatusId = searchParams.get('visitStatusId') || ''

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
        visitStatusId: visitStatusId || undefined,
      },
    },
    'Fetching visits with filters'
  )

  try {
    // Construir filtro de búsqueda base (solo filtros de DB)
    const where: Prisma.VisitWhereInput = {}

    if (visitStatusId) {
      where.visitStatusId = visitStatusId
    }

    // NOTA: La búsqueda se aplica en memoria con normalización (ignora acentos/tildes)
    // para permitir que "jose" encuentre "José", "nunoa" encuentre "Ñuñoa"

    // Obtener todas las visitas (sin paginación inicial)
    const allVisits = await prisma.visit.findMany({
      relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
      where,
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
    const filteredVisits = search
      ? allVisits.filter((visit) =>
          anyFieldMatchesSearch([visit.name, visit.phone, visit.street, visit.comuna], search)
        )
      : allVisits

    // Aplicar sorting en memoria (ya que los datos se filtran post-fetch)
    if (sortBy === 'date') {
      const direction = sortOrder === 'asc' ? 1 : -1
      filteredVisits.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return (dateA - dateB) * direction
      })
    }

    // Aplicar paginación manualmente
    const total = filteredVisits.length
    const skip = (page - 1) * limit
    const visits = filteredVisits.slice(skip, skip + limit)

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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
export const POST = withLogging(async (request, logger) => {
  try {
    const body = (await request.json()) as CreateVisitAPIPayload

    logger.debug({ body }, 'Creating new visit')

    // Transformar payload: date string → Date
    const visitData = {
      name: body.name,
      phone: body.phone || null,
      street: body.street,
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
  } catch (error) {
    logger.error({ error }, 'Error creating visit')
    return NextResponse.json({ error: 'Error al crear la visita' }, { status: 500 })
  }
})
