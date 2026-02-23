import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateVisitApiSchema,
  type UpdateVisitApiBody,
} from '@/lib/validations/visit-validations'
import { Prisma } from '@prisma/client'

/**
 * GET /api/visits/[id]
 *
 * Obtiene una visita específica por ID
 */
export const GET = withApiHandler(
  async (_request, logger, { params }) => {
    logger.debug({ visitId: params.id }, 'Fetching visit')

    const visit = await prisma.visit.findUnique({
      where: { id: params.id },
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
      throw new BusinessError('Visita no encontrada', 404)
    }

    logger.info({ visitId: params.id }, 'Visit fetched successfully')

    return NextResponse.json(visit)
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al obtener la visita' }
)

/**
 * PUT /api/visits/[id]
 *
 * Actualiza una visita existente
 */
export const PUT = withApiHandler<UpdateVisitApiBody>(
  async (_request, logger, { params, body }) => {
    logger.debug({ visitId: params.id, body }, 'Updating visit')

    // Transformar payload: date string → Date (si existe)
    const visitData: Prisma.VisitUpdateInput = {}

    if (body.name !== undefined) visitData.name = body.name
    if (body.phone !== undefined) visitData.phone = body.phone || null
    if (body.street !== undefined) visitData.street = body.street || null
    if (body.apartment !== undefined) visitData.apartment = body.apartment || null
    if (body.comuna !== undefined) visitData.comuna = body.comuna
    if (body.region !== undefined) visitData.region = body.region
    if (body.visitStatusId !== undefined) {
      visitData.visitStatus = { connect: { id: body.visitStatusId } }
    }
    if (body.date !== undefined) visitData.date = new Date(body.date)
    if (body.scheduledTime !== undefined) visitData.scheduledTime = body.scheduledTime || null
    if (body.observations !== undefined) visitData.observations = body.observations || null

    // Actualizar visita
    const visit = await prisma.visit.update({
      where: { id: params.id },
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

    logger.info({ visitId: params.id }, 'Visit updated successfully')

    return NextResponse.json(visit)
  },
  {
    bodySchema: updateVisitApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar la visita',
  }
)

/**
 * DELETE /api/visits/[id]
 *
 * Elimina una visita
 */
export const DELETE = withApiHandler(
  async (_request, logger, { params }) => {
    logger.debug({ visitId: params.id }, 'Deleting visit')

    await prisma.visit.delete({
      where: { id: params.id },
    })

    logger.info({ visitId: params.id }, 'Visit deleted successfully')

    return NextResponse.json({ message: 'Visita eliminada exitosamente' })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar la visita' }
)
