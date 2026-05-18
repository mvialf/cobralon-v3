import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api-handler'
import {
  updateProjectEventSchema,
  patchEventDateSchema,
  type UpdateProjectEventInput,
  type PatchEventDateInput,
} from '@/lib/validations/calendar-validations'
import { Prisma } from '@prisma/client'
import { serializeProjectDecimals } from '@/lib/utils/serialize'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProjectEvent(event: any) {
  return { ...event, project: serializeProjectDecimals(event.project) }
}

/**
 * PATCH /api/project-events/[id]
 *
 * Actualiza solo la fecha del evento (usado por drag & drop)
 */
export const PATCH = withApiHandler<PatchEventDateInput>(
  async (_request, logger, { params, body }) => {
    logger.debug({ eventId: params.id, body }, 'Updating project event date')

    // Actualizar solo scheduledDate (SIN include para máxima performance)
    // Optimistic update en frontend maneja la UI, no necesitamos retornar datos completos
    await prisma.projectEvent.update({
      where: { id: params.id },
      data: {
        scheduledDate: body.scheduledDate,
      },
    })

    logger.info(
      { eventId: params.id, newDate: body.scheduledDate },
      'Project event date updated successfully'
    )

    // Retornar solo lo esencial - React Query invalida el cache automáticamente
    return NextResponse.json({
      success: true,
      id: params.id,
      scheduledDate: body.scheduledDate,
    })
  },
  {
    bodySchema: patchEventDateSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar la fecha del evento',
  }
)

/**
 * PUT /api/project-events/[id]
 *
 * Actualiza el evento completo (usado por edit dialog)
 */
export const PUT = withApiHandler<UpdateProjectEventInput>(
  async (_request, logger, { params, body }) => {
    logger.debug({ eventId: params.id, body }, 'Updating project event')

    // Construir data para update
    const eventData: Prisma.ProjectEventUpdateInput = {}
    if (body.scheduledDate !== undefined) eventData.scheduledDate = body.scheduledDate
    if (body.tasks !== undefined) eventData.tasks = body.tasks

    // Manejar teamTags: usar 'set' para reemplazar todos los teamTags
    if (body.teamTagIds !== undefined) {
      eventData.teamTags = {
        set: body.teamTagIds?.map((id) => ({ id })) || [],
      }
    }

    // Actualizar evento
    const event = await prisma.projectEvent.update({
      where: { id: params.id },
      data: eventData,
      include: {
        project: {
          include: {
            customer: true,
            projectStatus: true,
          },
        },
        teamTags: {
          include: {
            color: true,
          },
        },
      },
    })

    logger.info({ eventId: params.id }, 'Project event updated successfully')

    return NextResponse.json(serializeProjectEvent(event))
  },
  {
    bodySchema: updateProjectEventSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar el evento',
  }
)

/**
 * DELETE /api/project-events/[id]
 *
 * Elimina un evento
 */
export const DELETE = withApiHandler(
  async (_request, logger, { params }) => {
    logger.debug({ eventId: params.id }, 'Deleting project event')

    await prisma.projectEvent.delete({
      where: { id: params.id },
    })

    logger.info({ eventId: params.id }, 'Project event deleted successfully')

    return NextResponse.json({ message: 'Evento eliminado exitosamente' })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar el evento' }
)
