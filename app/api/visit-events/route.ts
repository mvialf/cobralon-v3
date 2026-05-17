import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createVisitEventSchema,
  type CreateVisitEventInput,
} from '@/lib/validations/calendar-validations'
import {
  createVisitEventWithUpdateSchema,
  type CreateVisitEventWithUpdateInput,
} from '@/lib/validations/visit-event-validations'
import { createVisitEventWithVisitUpdate } from '@/lib/business-logic/calendar-event-creation'

const createVisitEventRequestSchema = z.union([
  createVisitEventWithUpdateSchema,
  createVisitEventSchema.strict(),
])

type CreateVisitEventRequest = CreateVisitEventInput | CreateVisitEventWithUpdateInput

function isVisitEventWithUpdateInput(
  body: CreateVisitEventRequest
): body is CreateVisitEventWithUpdateInput {
  return 'visitStatusId' in body && 'name' in body && 'street' in body
}

/**
 * POST /api/visit-events
 *
 * Crea un nuevo evento de visita
 */
export const POST = withApiHandler<CreateVisitEventRequest>(
  async (_request, logger, { body }) => {
    if (isVisitEventWithUpdateInput(body)) {
      const result = await prisma.$transaction((tx) =>
        createVisitEventWithVisitUpdate(tx, body, logger)
      )

      logger.info(
        {
          eventId: result.event.id,
          visitId: body.visitId,
          visitUpdated: result.visitUpdated,
        },
        'Visit event created with updates'
      )

      return NextResponse.json(result, { status: 201 })
    }

    // Verificar que la visita existe
    const visit = await prisma.visit.findUnique({
      where: { id: body.visitId },
      include: { visitStatus: true },
    })

    if (!visit) {
      throw new BusinessError('Visita no encontrada', 404)
    }

    // Verificar que la visita NO esté finalizada
    if (visit.visitStatus.isFinal) {
      throw new BusinessError('No se puede crear evento para una visita finalizada')
    }

    // Verificar que no exista duplicado
    const existingEvent = await prisma.visitEvent.findFirst({
      where: {
        visitId: body.visitId,
        scheduledDate: body.scheduledDate,
      },
    })

    if (existingEvent) {
      throw new BusinessError('Ya existe un evento para esta visita en esta fecha')
    }

    // Crear evento con teamTags si se proporcionan
    const newEvent = await prisma.visitEvent.create({
      data: {
        visitId: body.visitId,
        scheduledDate: body.scheduledDate,
        notes: body.notes,
        // Conectar teamTags si se proporcionan
        ...(body.teamTagIds &&
          body.teamTagIds.length > 0 && {
            teamTags: {
              connect: body.teamTagIds.map((id) => ({ id })),
            },
          }),
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
        teamTags: {
          include: {
            color: true,
          },
        },
      },
    })

    return NextResponse.json(newEvent, { status: 201 })
  },
  { bodySchema: createVisitEventRequestSchema, fallbackError: 'Error al crear evento' }
)
