import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createProjectEventSchema,
  createProjectEventWithProjectUpdateSchema,
  type CreateProjectEventInput,
  type CreateProjectEventWithProjectUpdateInput,
} from '@/lib/validations/calendar-validations'
import { createProjectEventWithProjectUpdate } from '@/lib/business-logic/calendar-event-creation'

const createProjectEventRequestSchema = z.union([
  createProjectEventWithProjectUpdateSchema,
  createProjectEventSchema.strict(),
])

type CreateProjectEventRequest = CreateProjectEventInput | CreateProjectEventWithProjectUpdateInput

function isProjectEventWithUpdateInput(
  body: CreateProjectEventRequest
): body is CreateProjectEventWithProjectUpdateInput {
  return 'phone' in body && 'street' in body && 'windowsCount' in body && 'squareMeters' in body
}

/**
 * POST /api/project-events
 *
 * Crea un nuevo evento de calendario para un proyecto
 */
export const POST = withApiHandler<CreateProjectEventRequest>(
  async (_request, logger, { body }) => {
    if (isProjectEventWithUpdateInput(body)) {
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
    }

    // Verificar que el proyecto existe y no está finalizado
    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: { projectStatus: true },
    })

    if (!project) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    if (project.projectStatus?.isFinal) {
      throw new BusinessError('No se pueden crear eventos para proyectos finalizados', 400)
    }

    // Verificar que no exista un evento para este proyecto en esta fecha
    const existingEvent = await prisma.projectEvent.findFirst({
      where: {
        projectId: body.projectId,
        scheduledDate: body.scheduledDate,
      },
    })

    if (existingEvent) {
      throw new BusinessError('Ya existe un evento para este proyecto en esta fecha', 400)
    }

    // Crear evento con teamTags si se proporcionan
    const event = await prisma.projectEvent.create({
      data: {
        projectId: body.projectId,
        scheduledDate: body.scheduledDate,
        tasks: body.tasks || [],
        // Conectar teamTags si se proporcionan
        ...(body.teamTagIds &&
          body.teamTagIds.length > 0 && {
            teamTags: {
              connect: body.teamTagIds.map((id) => ({ id })),
            },
          }),
      },
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

    logger.info({ eventId: event.id, projectId: body.projectId }, 'Project event created')

    return NextResponse.json(event, { status: 201 })
  },
  { bodySchema: createProjectEventRequestSchema, fallbackError: 'Error al crear evento' }
)
