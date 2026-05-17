import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api-handler'
import {
  createVisitEventWithUpdateSchema,
  type CreateVisitEventWithUpdateInput,
} from '@/lib/validations/visit-event-validations'
import { createVisitEventWithVisitUpdate } from '@/lib/business-logic/calendar-event-creation'

/**
 * POST /api/visit-events-with-update
 *
 * Endpoint legacy. La implementación canónica vive en POST /api/visit-events.
 */
export const POST = withApiHandler<CreateVisitEventWithUpdateInput>(
  async (_request, logger, { body }) => {
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
  },
  {
    bodySchema: createVisitEventWithUpdateSchema,
    fallbackError: 'Error al crear evento',
  }
)
