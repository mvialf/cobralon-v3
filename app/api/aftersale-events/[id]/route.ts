import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateAftersaleEventSchema,
  patchEventDateSchema,
  type UpdateAftersaleEventInput,
  type PatchEventDateInput,
} from '@/lib/validations/calendar-validations'
import { Prisma } from '@prisma/client'

const HANDLER_OPTIONS = {
  validateUuidParams: ['id'],
}

/**
 * GET /api/aftersale-events/[id]
 *
 * Obtiene un evento de postventa por ID
 */
export const GET = withApiHandler(
  async (_request, _logger, { params }) => {
    const event = await prisma.aftersaleEvent.findUnique({
      where: { id: params.id },
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
    })

    if (!event) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    return NextResponse.json(event)
  },
  { ...HANDLER_OPTIONS, fallbackError: 'Error al obtener evento' }
)

/**
 * PUT /api/aftersale-events/[id]
 *
 * Actualiza un evento de postventa
 */
export const PUT = withApiHandler<UpdateAftersaleEventInput>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el evento existe
    const existingEvent = await prisma.aftersaleEvent.findUnique({
      where: { id },
      include: { aftersale: { include: { aftersaleStatus: true } } },
    })

    if (!existingEvent) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    // Si se está cambiando la fecha, verificar duplicados
    if (
      body.scheduledDate &&
      body.scheduledDate.getTime() !== existingEvent.scheduledDate.getTime()
    ) {
      const duplicateEvent = await prisma.aftersaleEvent.findFirst({
        where: {
          aftersaleId: existingEvent.aftersaleId,
          scheduledDate: body.scheduledDate,
          id: { not: id },
        },
      })

      if (duplicateEvent) {
        throw new BusinessError('Ya existe un evento para esta postventa en esta fecha')
      }
    }

    // Construir data para update
    const updateData: Prisma.AftersaleEventUpdateInput = {
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
    const updatedEvent = await prisma.aftersaleEvent.update({
      where: { id },
      data: updateData,
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
    bodySchema: updateAftersaleEventSchema,
    ...HANDLER_OPTIONS,
    fallbackError: 'Error al actualizar evento',
  }
)

/**
 * PATCH /api/aftersale-events/[id]
 *
 * Actualiza solo la fecha de un evento (usado para drag & drop)
 */
export const PATCH = withApiHandler<PatchEventDateInput>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el evento existe
    const existingEvent = await prisma.aftersaleEvent.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    // Verificar que no hay duplicado en la nueva fecha
    const duplicateEvent = await prisma.aftersaleEvent.findFirst({
      where: {
        aftersaleId: existingEvent.aftersaleId,
        scheduledDate: body.scheduledDate,
        id: { not: id },
      },
    })

    if (duplicateEvent) {
      throw new BusinessError('Ya existe un evento para esta postventa en esta fecha')
    }

    // Actualizar solo la fecha
    const updatedEvent = await prisma.aftersaleEvent.update({
      where: { id },
      data: { scheduledDate: body.scheduledDate },
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
 * DELETE /api/aftersale-events/[id]
 *
 * Elimina un evento de postventa
 */
export const DELETE = withApiHandler(
  async (_request, _logger, { params }) => {
    const { id } = params

    // Verificar que existe
    const event = await prisma.aftersaleEvent.findUnique({
      where: { id },
    })

    if (!event) {
      throw new BusinessError('Evento no encontrado', 404)
    }

    // Eliminar
    await prisma.aftersaleEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  },
  { ...HANDLER_OPTIONS, fallbackError: 'Error al eliminar evento' }
)
