import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateVisitEventSchema,
  patchEventDateSchema,
  type UpdateVisitEventInput,
  type PatchEventDateInput,
} from '@/lib/validations/calendar-validations'
import { Prisma } from '@prisma/client'

const HANDLER_OPTIONS = {
  validateUuidParams: ['id'],
}

/**
 * GET /api/visit-events/[id]
 *
 * Obtiene un evento de visita por ID
 */
export const GET = withApiHandler(
  async (_request, _logger, { params }) => {
    const event = await prisma.visitEvent.findUnique({
      where: { id: params.id },
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
    })

    if (!event) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    return NextResponse.json(event)
  },
  { ...HANDLER_OPTIONS, fallbackError: 'Error al obtener evento' }
)

/**
 * PUT /api/visit-events/[id]
 *
 * Actualiza un evento de visita
 */
export const PUT = withApiHandler<UpdateVisitEventInput>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el evento existe
    const existingEvent = await prisma.visitEvent.findUnique({
      where: { id },
      include: { visit: { include: { visitStatus: true } } },
    })

    if (!existingEvent) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    // Si se está cambiando la fecha, verificar duplicados
    if (
      body.scheduledDate &&
      body.scheduledDate.getTime() !== existingEvent.scheduledDate.getTime()
    ) {
      const duplicateEvent = await prisma.visitEvent.findFirst({
        where: {
          visitId: existingEvent.visitId,
          scheduledDate: body.scheduledDate,
          id: { not: id },
        },
      })

      if (duplicateEvent) {
        throw new BusinessError('Ya existe un evento para esta visita en esta fecha')
      }
    }

    // Construir data para update
    const updateData: Prisma.VisitEventUpdateInput = {
      scheduledDate: body.scheduledDate,
      notes: body.notes,
    }

    // Manejar teamTags: usar 'set' para reemplazar todos los teamTags
    if (body.teamTagIds !== undefined) {
      updateData.teamTags = {
        set: body.teamTagIds?.map((id) => ({ id })) || [],
      }
    }

    // Actualizar evento
    const updatedEvent = await prisma.visitEvent.update({
      where: { id },
      data: updateData,
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
        teamTags: {
          include: {
            color: true,
          },
        },
      },
    })

    return NextResponse.json(updatedEvent)
  },
  {
    bodySchema: updateVisitEventSchema,
    ...HANDLER_OPTIONS,
    fallbackError: 'Error al actualizar evento',
  }
)

/**
 * PATCH /api/visit-events/[id]
 *
 * Actualiza solo la fecha de un evento (usado para drag & drop)
 */
export const PATCH = withApiHandler<PatchEventDateInput>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el evento existe
    const existingEvent = await prisma.visitEvent.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    // Verificar que no hay duplicado en la nueva fecha
    const duplicateEvent = await prisma.visitEvent.findFirst({
      where: {
        visitId: existingEvent.visitId,
        scheduledDate: body.scheduledDate,
        id: { not: id },
      },
    })

    if (duplicateEvent) {
      throw new BusinessError('Ya existe un evento para esta visita en esta fecha')
    }

    // Actualizar solo la fecha
    const updatedEvent = await prisma.visitEvent.update({
      where: { id },
      data: { scheduledDate: body.scheduledDate },
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
    })

    return NextResponse.json(updatedEvent)
  },
  {
    bodySchema: patchEventDateSchema,
    ...HANDLER_OPTIONS,
    fallbackError: 'Error al actualizar fecha del evento',
  }
)

/**
 * DELETE /api/visit-events/[id]
 *
 * Elimina un evento de visita
 */
export const DELETE = withApiHandler(
  async (_request, _logger, { params }) => {
    const { id } = params

    // Verificar que existe
    const event = await prisma.visitEvent.findUnique({
      where: { id },
    })

    if (!event) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    // Eliminar
    await prisma.visitEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  },
  { ...HANDLER_OPTIONS, fallbackError: 'Error al eliminar evento' }
)
