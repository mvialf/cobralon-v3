import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createAftersaleEventSchema,
  type CreateAftersaleEventInput,
} from '@/lib/validations/calendar-validations'
import {
  createAftersaleEventWithUpdateSchema,
  type CreateAftersaleEventWithUpdateInput,
} from '@/lib/validations/aftersale-event-validations'
import { createAftersaleEventWithRelatedUpdates } from '@/lib/business-logic/calendar-event-creation'

const createAftersaleEventRequestSchema = z.union([
  createAftersaleEventWithUpdateSchema,
  createAftersaleEventSchema.strict(),
])

type CreateAftersaleEventRequest = CreateAftersaleEventInput | CreateAftersaleEventWithUpdateInput

function isAftersaleEventWithUpdateInput(
  body: CreateAftersaleEventRequest
): body is CreateAftersaleEventWithUpdateInput {
  return 'aftersaleStatusId' in body && 'contactPhone' in body && 'street' in body
}

/**
 * POST /api/aftersale-events
 *
 * Crea un nuevo evento de postventa
 */
export const POST = withApiHandler<CreateAftersaleEventRequest>(
  async (_request, logger, { body }) => {
    if (isAftersaleEventWithUpdateInput(body)) {
      const result = await prisma.$transaction((tx) =>
        createAftersaleEventWithRelatedUpdates(tx, body, logger)
      )

      logger.info(
        {
          eventId: result.event.id,
          aftersaleId: body.aftersaleId,
          aftersaleUpdated: result.aftersaleUpdated,
          projectUpdated: result.projectUpdated,
        },
        'Aftersale event created with updates'
      )

      return NextResponse.json(result, { status: 201 })
    }

    // Verificar que la postventa existe
    const aftersale = await prisma.aftersale.findUnique({
      where: { id: body.aftersaleId },
      include: { aftersaleStatus: true },
    })

    if (!aftersale) {
      throw new BusinessError('Postventa no encontrada', 404)
    }

    // Verificar que la postventa NO esté finalizada
    if (aftersale.aftersaleStatus.isFinal) {
      throw new BusinessError('No se puede crear evento para una postventa finalizada')
    }

    // Verificar que no exista duplicado
    const existingEvent = await prisma.aftersaleEvent.findFirst({
      where: {
        aftersaleId: body.aftersaleId,
        scheduledDate: body.scheduledDate,
      },
    })

    if (existingEvent) {
      throw new BusinessError('Ya existe un evento para esta postventa en esta fecha')
    }

    // Crear evento con teamTags si se proporcionan
    const newEvent = await prisma.aftersaleEvent.create({
      data: {
        aftersaleId: body.aftersaleId,
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

    return NextResponse.json(newEvent, { status: 201 })
  },
  { bodySchema: createAftersaleEventRequestSchema, fallbackError: 'Error al crear evento' }
)
