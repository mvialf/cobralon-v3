import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calendarQuerySchema } from '@/lib/validations/calendar-validations'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/calendar-events
 *
 * Obtiene eventos de calendario unificados (ProjectEvents, AftersaleEvents, VisitEvents)
 * en un rango de fechas específico
 *
 * Query params:
 *   - start: fecha de inicio (ISO string o timestamp)
 *   - end: fecha de fin (ISO string o timestamp)
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  logger.debug(
    {
      start: startParam,
      end: endParam,
    },
    'Fetching calendar events'
  )

  try {
    // Validar query params
    const validationResult = calendarQuerySchema.safeParse({
      start: startParam,
      end: endParam,
    })

    if (!validationResult.success) {
      logger.warn({ errors: validationResult.error.errors }, 'Invalid query params')
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { start, end } = validationResult.data

    // Fetch ProjectEvents en paralelo
    const projectEvents = await prisma.projectEvent.findMany({
      where: {
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        project: {
          include: {
            customer: true,
            projectStatus: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    // TODO: En el futuro, agregar AftersaleEvents y VisitEvents aquí

    // Unificar eventos con tipo discriminado
    const unifiedEvents = projectEvents.map((event) => ({
      type: 'project' as const,
      data: event,
    }))

    logger.info(
      {
        totalEvents: unifiedEvents.length,
        projectEvents: projectEvents.length,
      },
      'Calendar events fetched successfully'
    )

    return NextResponse.json({
      events: unifiedEvents,
      count: unifiedEvents.length,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to fetch calendar events')
    return NextResponse.json({ error: 'Error al obtener eventos del calendario' }, { status: 500 })
  }
})
