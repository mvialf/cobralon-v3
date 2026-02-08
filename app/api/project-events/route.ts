import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createProjectEventSchema,
  type CreateProjectEventInput,
} from '@/lib/validations/calendar-validations'

/**
 * POST /api/project-events
 *
 * Crea un nuevo evento de calendario para un proyecto
 */
export const POST = withApiHandler<CreateProjectEventInput>(
  async (_request, logger, { body }) => {
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
  { bodySchema: createProjectEventSchema, fallbackError: 'Error al crear evento' }
)
