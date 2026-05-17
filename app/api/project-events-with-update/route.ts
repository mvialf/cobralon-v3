import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api-handler'
import {
  createProjectEventWithProjectUpdateSchema,
  type CreateProjectEventWithProjectUpdateInput,
} from '@/lib/validations/calendar-validations'
import { createProjectEventWithProjectUpdate } from '@/lib/business-logic/calendar-event-creation'

/**
 * POST /api/project-events-with-update
 *
 * Endpoint legacy. La implementación canónica vive en POST /api/project-events.
 */
export const POST = withApiHandler<CreateProjectEventWithProjectUpdateInput>(
  async (_request, logger, { body }) => {
    const result = await prisma.$transaction((tx) =>
      createProjectEventWithProjectUpdate(tx, body, logger)
    )

    logger.info(
      {
        eventId: result.event.id,
        projectId: body.projectId,
        projectUpdated: result.projectUpdated,
      },
      'Project event created with optional project update'
    )

    return NextResponse.json(result, { status: 201 })
  },
  {
    bodySchema: createProjectEventWithProjectUpdateSchema,
    fallbackError: 'Error al crear evento',
  }
)
