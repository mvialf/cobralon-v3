import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { updateProjectEventSchema } from '@/lib/validations/calendar-validations'
import { z } from 'zod'

/**
 * Schema para PATCH (solo scheduledDate)
 */
const patchProjectEventSchema = z.object({
  scheduledDate: z.string().min(1, 'La fecha es requerida'),
})

/**
 * Helper para convertir Decimals a números en el response
 */
function serializeProjectEvent(event: any) {
  return {
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
    },
  }
}

/**
 * PATCH /api/project-events/[id]
 *
 * Actualiza solo la fecha del evento (usado por drag & drop)
 */
export const PATCH = withLogging(async (request, logger, context) => {
  const params = await context?.params
  const id = params?.id

  try {
    const body = await request.json()

    logger.debug({ eventId: id, body }, 'Updating project event date')

    // Validar body
    const validationResult = patchProjectEventSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn({ errors: validationResult.error.errors }, 'Invalid request body')
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { scheduledDate } = validationResult.data

    // Actualizar solo scheduledDate (SIN include para máxima performance)
    // Optimistic update en frontend maneja la UI, no necesitamos retornar datos completos
    await prisma.projectEvent.update({
      where: { id },
      data: {
        scheduledDate: new Date(scheduledDate),
      },
    })

    logger.info({ eventId: id, newDate: scheduledDate }, 'Project event date updated successfully')

    // Retornar solo lo esencial - React Query invalida el cache automáticamente
    return NextResponse.json({
      success: true,
      id,
      scheduledDate,
    })
  } catch (error) {
    if ((error as any).code === 'P2025') {
      logger.warn({ eventId: id }, 'Project event not found')
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    logger.error({ error, eventId: id }, 'Error updating project event date')
    return NextResponse.json({ error: 'Error al actualizar la fecha del evento' }, { status: 500 })
  }
})

/**
 * PUT /api/project-events/[id]
 *
 * Actualiza el evento completo (usado por edit dialog)
 */
export const PUT = withLogging(async (request, logger, context) => {
  const params = await context?.params
  const id = params?.id

  try {
    const body = await request.json()

    logger.debug({ eventId: id, body }, 'Updating project event')

    // Validar body
    const validationResult = updateProjectEventSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn({ errors: validationResult.error.errors }, 'Invalid request body')
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { scheduledDate, teamTagIds } = validationResult.data

    // Construir data para update
    const eventData: Record<string, any> = {}
    if (scheduledDate !== undefined) eventData.scheduledDate = scheduledDate

    // Manejar teamTags: usar 'set' para reemplazar todos los teamTags
    if (teamTagIds !== undefined) {
      eventData.teamTags = {
        set: teamTagIds?.map((id) => ({ id })) || [],
      }
    }

    // Actualizar evento
    const event = await prisma.projectEvent.update({
      where: { id },
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

    logger.info({ eventId: id }, 'Project event updated successfully')

    return NextResponse.json(serializeProjectEvent(event))
  } catch (error) {
    if ((error as any).code === 'P2025') {
      logger.warn({ eventId: id }, 'Project event not found')
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    logger.error({ error, eventId: id }, 'Error updating project event')
    return NextResponse.json({ error: 'Error al actualizar el evento' }, { status: 500 })
  }
})

/**
 * DELETE /api/project-events/[id]
 *
 * Elimina un evento
 */
export const DELETE = withLogging(async (request, logger, context) => {
  const params = await context?.params
  const id = params?.id

  logger.debug({ eventId: id }, 'Deleting project event')

  try {
    await prisma.projectEvent.delete({
      where: { id },
    })

    logger.info({ eventId: id }, 'Project event deleted successfully')

    return NextResponse.json({ message: 'Evento eliminado exitosamente' })
  } catch (error) {
    if ((error as any).code === 'P2025') {
      logger.warn({ eventId: id }, 'Project event not found')
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    logger.error({ error, eventId: id }, 'Error deleting project event')
    return NextResponse.json({ error: 'Error al eliminar el evento' }, { status: 500 })
  }
})
