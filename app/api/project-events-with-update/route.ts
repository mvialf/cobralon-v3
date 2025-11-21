import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createProjectEventWithProjectUpdateSchema } from '@/lib/validations/calendar-validations'
import { withLogging } from '@/lib/logger-middleware'

/**
 * POST /api/project-events-with-update
 *
 * Crea un nuevo evento de calendario Y actualiza datos del proyecto en una transacci�n at�mica
 *
 * Features:
 * - Transacci�n Prisma (todo o nada)
 * - Detecta cambios en el proyecto antes de actualizar
 * - Solo actualiza si hay diferencias
 * - Rollback autom�tico si falla alguna operaci�n
 *
 * Body:
 * - projectId, scheduledDate, notes (datos del evento)
 * - phone, street, apartment, comuna, region, windowsCount, squareMeters, description (datos del proyecto)
 */
export const POST = withLogging(async (request, logger) => {
  try {
    const body = await request.json()

    // Validar datos de entrada con schema extendido
    const validationResult = createProjectEventWithProjectUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      logger.warn(
        { errors: validationResult.error.errors },
        'Invalid project event with update data'
      )
      return NextResponse.json(
        { error: 'Datos inv�lidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // TRANSACCI�N: Actualizar proyecto + Crear evento (at�mico)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el proyecto existe y obtener datos actuales
      const currentProject = await tx.project.findUnique({
        where: { id: data.projectId },
        select: {
          id: true,
          phone: true,
          street: true,
          apartment: true,
          comuna: true,
          region: true,
          windowsCount: true,
          squareMeters: true,
          description: true,
          projectStatus: {
            select: {
              isFinal: true,
            },
          },
        },
      })

      if (!currentProject) {
        throw new Error('PROJECT_NOT_FOUND')
      }

      if (currentProject.projectStatus?.isFinal) {
        throw new Error('PROJECT_FINALIZED')
      }

      // 2. Detectar si hay cambios en los datos del proyecto
      const hasChanges =
        currentProject.phone !== data.phone ||
        currentProject.street !== data.street ||
        currentProject.apartment !== data.apartment ||
        currentProject.comuna !== data.comuna ||
        currentProject.region !== data.region ||
        currentProject.windowsCount !== data.windowsCount ||
        currentProject.squareMeters.toString() !== data.squareMeters.toString() ||
        currentProject.description !== data.description

      // 3. Actualizar proyecto SOLO si hay cambios
      if (hasChanges) {
        await tx.project.update({
          where: { id: data.projectId },
          data: {
            phone: data.phone,
            street: data.street,
            apartment: data.apartment,
            comuna: data.comuna,
            region: data.region,
            windowsCount: data.windowsCount,
            squareMeters: data.squareMeters,
            description: data.description,
          },
        })

        logger.info(
          {
            projectId: data.projectId,
            changedFields: {
              phone: currentProject.phone !== data.phone,
              street: currentProject.street !== data.street,
              apartment: currentProject.apartment !== data.apartment,
              comuna: currentProject.comuna !== data.comuna,
              region: currentProject.region !== data.region,
              windowsCount: currentProject.windowsCount !== data.windowsCount,
              squareMeters: currentProject.squareMeters.toString() !== data.squareMeters.toString(),
              description: currentProject.description !== data.description,
            },
          },
          'Project data updated during event creation'
        )
      }

      // 4. Verificar que no exista un evento para este proyecto en esta fecha
      const existingEvent = await tx.projectEvent.findFirst({
        where: {
          projectId: data.projectId,
          scheduledDate: new Date(data.scheduledDate),
        },
      })

      if (existingEvent) {
        throw new Error('EVENT_ALREADY_EXISTS')
      }

      // 5. Crear evento de calendario
      const event = await tx.projectEvent.create({
        data: {
          projectId: data.projectId,
          scheduledDate: new Date(data.scheduledDate),
          notes: data.notes || null,
        },
        include: {
          project: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
              projectStatus: {
                select: {
                  id: true,
                  name: true,
                  color: {
                    select: {
                      bgClass: true,
                      textClass: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      return { event, projectUpdated: hasChanges }
    })

    logger.info(
      {
        eventId: result.event.id,
        projectId: data.projectId,
        projectUpdated: result.projectUpdated,
      },
      'Project event created with optional project update'
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // Manejo de errores espec�ficos
    if (error instanceof Error) {
      if (error.message === 'PROJECT_NOT_FOUND') {
        logger.warn({ projectId: (await request.json()).projectId }, 'Project not found')
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
      }

      if (error.message === 'PROJECT_FINALIZED') {
        logger.warn(
          { projectId: (await request.json()).projectId },
          'Cannot create event for finalized project'
        )
        return NextResponse.json(
          { error: 'No se pueden crear eventos para proyectos finalizados' },
          { status: 400 }
        )
      }

      if (error.message === 'EVENT_ALREADY_EXISTS') {
        logger.warn('Event already exists for this project and date')
        return NextResponse.json(
          { error: 'Ya existe un evento para este proyecto en esta fecha' },
          { status: 400 }
        )
      }
    }

    logger.error({ error }, 'Failed to create project event with project update')
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 })
  }
})
