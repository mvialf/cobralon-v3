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
            projectStatus: {
              include: {
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    // Extraer todos los uninstallTagIds únicos de todos los proyectos
    const allTagIds = Array.from(
      new Set(projectEvents.flatMap((event) => event.project.uninstallTagIds))
    )

    // Fetch todos los tags necesarios con sus colores
    const uninstallTags =
      allTagIds.length > 0
        ? await prisma.uninstallTag.findMany({
            where: {
              id: {
                in: allTagIds,
              },
            },
            include: {
              color: true,
            },
          })
        : []

    // Crear Map para acceso rápido
    const tagsMap = new Map(uninstallTags.map((tag) => [tag.id, tag]))

    // Fetch AftersaleEvents en paralelo
    const aftersaleEvents = await prisma.aftersaleEvent.findMany({
      where: {
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        aftersale: {
          include: {
            project: {
              include: {
                customer: true,
              },
            },
            aftersaleStatus: {
              include: {
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    // Fetch VisitEvents en paralelo
    const visitEvents = await prisma.visitEvent.findMany({
      where: {
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        visit: {
          include: {
            visitStatus: {
              include: {
                color: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    // Unificar eventos con tipo discriminado
    // IMPORTANTE: Convertir Decimals a números para serialización JSON

    // 1. Transformar ProjectEvents
    const unifiedProjectEvents = projectEvents.map((event) => ({
      type: 'project' as const,
      data: {
        ...event,
        project: {
          ...event.project,
          subtotal: Number(event.project.subtotal),
          taxRate: Number(event.project.taxRate),
          total: Number(event.project.total),
          balance: Number(event.project.balance),
          squareMeters: Number(event.project.squareMeters),
          totalAmount: event.project.totalAmount ? Number(event.project.totalAmount) : null,
          customer: {
            ...event.project.customer,
            creditBalance: Number(event.project.customer.creditBalance),
          },
          // Mapear uninstallTagIds a objetos completos
          uninstallTags: event.project.uninstallTagIds
            .map((tagId) => tagsMap.get(tagId))
            .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined),
        },
      },
    }))

    // 2. Transformar AftersaleEvents
    const unifiedAftersaleEvents = aftersaleEvents.map((event) => ({
      type: 'aftersale' as const,
      data: {
        ...event,
        aftersale: {
          ...event.aftersale,
          project: {
            ...event.aftersale.project,
            // Convertir Decimals del proyecto
            subtotal: Number(event.aftersale.project.subtotal),
            taxRate: Number(event.aftersale.project.taxRate),
            total: Number(event.aftersale.project.total),
            balance: Number(event.aftersale.project.balance),
            squareMeters: Number(event.aftersale.project.squareMeters),
            totalAmount: event.aftersale.project.totalAmount
              ? Number(event.aftersale.project.totalAmount)
              : null,
            customer: {
              ...event.aftersale.project.customer,
              creditBalance: Number(event.aftersale.project.customer.creditBalance),
            },
          },
        },
      },
    }))

    // 3. Transformar VisitEvents
    const unifiedVisitEvents = visitEvents.map((event) => ({
      type: 'visit' as const,
      data: {
        ...event,
        visit: {
          ...event.visit,
        },
      },
    }))

    // 4. Combinar todos los eventos
    const unifiedEvents = [
      ...unifiedProjectEvents,
      ...unifiedAftersaleEvents,
      ...unifiedVisitEvents,
    ]

    logger.info(
      {
        totalEvents: unifiedEvents.length,
        projectEvents: projectEvents.length,
        aftersaleEvents: aftersaleEvents.length,
        visitEvents: visitEvents.length,
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
