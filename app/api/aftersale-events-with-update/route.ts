import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api-handler'
import {
  createAftersaleEventWithUpdateSchema,
  type CreateAftersaleEventWithUpdateInput,
} from '@/lib/validations/aftersale-event-validations'
import { createAftersaleEventWithRelatedUpdates } from '@/lib/business-logic/calendar-event-creation'

/**
 * POST /api/aftersale-events-with-update
 *
 * Endpoint legacy. La implementación canónica vive en POST /api/aftersale-events.
 */
export const POST = withApiHandler<CreateAftersaleEventWithUpdateInput>(
  async (_request, logger, { body }) => {
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
  },
  {
    bodySchema: createAftersaleEventWithUpdateSchema,
    fallbackError: 'Error al crear evento',
  }
)
