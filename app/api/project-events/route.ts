import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createProjectEventSchema } from '@/lib/validations/calendar-validations'
import { withLogging } from '@/lib/logger-middleware'

/**
 * POST /api/project-events
 *
 * Crea un nuevo evento de calendario para un proyecto
 */
export const POST = withLogging(async (request, logger) => {
  try {
    const body = await request.json()

    // Validar datos de entrada
    const validationResult = createProjectEventSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn({ errors: validationResult.error.errors }, 'Invalid project event data')
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Verificar que el proyecto existe y no está finalizado
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      include: { projectStatus: true },
    })

    if (!project) {
      logger.warn({ projectId: data.projectId }, 'Project not found')
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    if (project.projectStatus?.isFinal) {
      logger.warn({ projectId: data.projectId }, 'Cannot create event for finalized project')
      return NextResponse.json(
        { error: 'No se pueden crear eventos para proyectos finalizados' },
        { status: 400 }
      )
    }

    // Verificar que no exista un evento para este proyecto en esta fecha
    const existingEvent = await prisma.projectEvent.findFirst({
      where: {
        projectId: data.projectId,
        scheduledDate: data.scheduledDate,
      },
    })

    if (existingEvent) {
      logger.warn(
        { projectId: data.projectId, scheduledDate: data.scheduledDate },
        'Event already exists for this project and date'
      )
      return NextResponse.json(
        { error: 'Ya existe un evento para este proyecto en esta fecha' },
        { status: 400 }
      )
    }

    // Crear evento con teamTags si se proporcionan
    const event = await prisma.projectEvent.create({
      data: {
        projectId: data.projectId,
        scheduledDate: data.scheduledDate,
        tasks: data.tasks || [],
        // Conectar teamTags si se proporcionan
        ...(data.teamTagIds &&
          data.teamTagIds.length > 0 && {
            teamTags: {
              connect: data.teamTagIds.map((id) => ({ id })),
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

    logger.info({ eventId: event.id, projectId: data.projectId }, 'Project event created')

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'Failed to create project event')
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 })
  }
})
