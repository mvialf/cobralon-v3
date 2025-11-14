import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { type CreateVisitAPIPayload } from '@/lib/validations/visit-validations'
import { Prisma } from '@prisma/client'

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

  const skip = (page - 1) * limit

  try {
    // Construir filtro de búsqueda
    const where: Prisma.VisitWhereInput = {}

    if (visitStatusId) {
      where.visitStatusId = visitStatusId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { street: { contains: search, mode: 'insensitive' } },
        { comuna: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Obtener visitas con paginación
    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
        where,
        skip,
        take: limit,
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
      }),
      prisma.visit.count({ where }),
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
