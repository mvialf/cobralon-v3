import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { type UpdateVisitAPIPayload } from '@/lib/validations/visit-validations'

/**
 * GET /api/visits/[id]
 *
 * Obtiene una visita específica por ID
 */
export const GET = withLogging(async (request, logger, context) => {
  const params = await context?.params
  const id = params?.id

  logger.debug({ visitId: id }, 'Fetching visit')

  try {
    const visit = await prisma.visit.findUnique({
      where: { id },
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

    if (!visit) {
      logger.warn({ visitId: id }, 'Visit not found')
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    logger.info({ visitId: id }, 'Visit fetched successfully')

    return NextResponse.json(visit)
  } catch (error) {
    logger.error({ error, visitId: id }, 'Error fetching visit')
    return NextResponse.json({ error: 'Error al obtener la visita' }, { status: 500 })
  }
})

/**
 * PUT /api/visits/[id]
 *
 * Actualiza una visita existente
 */
export const PUT = withLogging(async (request, logger, context) => {
  const params = await context?.params
  const id = params?.id

  try {
    const body = (await request.json()) as UpdateVisitAPIPayload

    logger.debug({ visitId: id, body }, 'Updating visit')

    // Transformar payload: date string → Date (si existe)
    const visitData: Record<string, any> = {}

    if (body.name !== undefined) visitData.name = body.name
    if (body.phone !== undefined) visitData.phone = body.phone || null
    if (body.street !== undefined) visitData.street = body.street
    if (body.apartment !== undefined) visitData.apartment = body.apartment || null
    if (body.comuna !== undefined) visitData.comuna = body.comuna
    if (body.region !== undefined) visitData.region = body.region
    if (body.visitStatusId !== undefined) visitData.visitStatusId = body.visitStatusId
    if (body.date !== undefined) visitData.date = new Date(body.date)
    if (body.observations !== undefined) visitData.observations = body.observations || null

    // Actualizar visita
    const visit = await prisma.visit.update({
      where: { id },
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

    logger.info({ visitId: id }, 'Visit updated successfully')

    return NextResponse.json(visit)
  } catch (error) {
    if ((error as any).code === 'P2025') {
      logger.warn({ visitId: id }, 'Visit not found')
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    logger.error({ error, visitId: id }, 'Error updating visit')
    return NextResponse.json({ error: 'Error al actualizar la visita' }, { status: 500 })
  }
})

/**
 * DELETE /api/visits/[id]
 *
 * Elimina una visita
 */
export const DELETE = withLogging(async (request, logger, context) => {
  const params = await context?.params
  const id = params?.id

  logger.debug({ visitId: id }, 'Deleting visit')

  try {
    await prisma.visit.delete({
      where: { id },
    })

    logger.info({ visitId: id }, 'Visit deleted successfully')

    return NextResponse.json({ message: 'Visita eliminada exitosamente' })
  } catch (error) {
    if ((error as any).code === 'P2025') {
      logger.warn({ visitId: id }, 'Visit not found')
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    logger.error({ error, visitId: id }, 'Error deleting visit')
    return NextResponse.json({ error: 'Error al eliminar la visita' }, { status: 500 })
  }
})
