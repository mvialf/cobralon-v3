import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/visit-statuses
 *
 * Obtiene todos los estados de visita activos, ordenados por order
 *
 * Query params:
 *   - includeInactive: "true" para incluir estados inactivos (default: false)
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('includeInactive') === 'true'

  logger.debug({ includeInactive }, 'Fetching visit statuses')

  try {
    const visitStatuses = await prisma.visitStatus.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        color: {
          select: {
            bgClass: true,
            textClass: true,
          },
        },
      },
    })

    logger.info({ count: visitStatuses.length }, 'Visit statuses fetched successfully')

    return NextResponse.json(visitStatuses)
  } catch (error) {
    logger.error({ error }, 'Error fetching visit statuses')
    return NextResponse.json({ error: 'Error al obtener los estados de visita' }, { status: 500 })
  }
})
