import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createProjectEventWithProjectUpdateSchema,
  type CreateProjectEventWithProjectUpdateInput,
} from '@/lib/validations/calendar-validations'

/**
 * POST /api/project-events-with-update
 *
 * Crea un nuevo evento de calendario Y actualiza datos del proyecto en una transacción atómica
 *
 * Features:
 * - Transacción Prisma (todo o nada)
 * - Detecta cambios en el proyecto antes de actualizar
 * - Solo actualiza si hay diferencias
 * - Rollback automático si falla alguna operación
 */
export const POST = withApiHandler<CreateProjectEventWithProjectUpdateInput>(
  async (_request, logger, { body }) => {
    // TRANSACCIÓN: Actualizar proyecto + Crear evento (atómico)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el proyecto existe y obtener datos actuales
      const currentProject = await tx.project.findUnique({
        where: { id: body.projectId },
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
        throw new BusinessError('Proyecto no encontrado', 404)
      }

      if (currentProject.projectStatus?.isFinal) {
        throw new BusinessError('No se pueden crear eventos para proyectos finalizados', 400)
      }

      // 2. Detectar si hay cambios en los datos del proyecto
      const hasChanges =
        currentProject.phone !== body.phone ||
        currentProject.street !== body.street ||
        currentProject.apartment !== body.apartment ||
        currentProject.comuna !== body.comuna ||
        currentProject.region !== body.region ||
        currentProject.windowsCount !== body.windowsCount ||
        currentProject.squareMeters.toString() !== body.squareMeters.toString() ||
        currentProject.description !== body.description

      // 3. Actualizar proyecto SOLO si hay cambios
      if (hasChanges) {
        await tx.project.update({
          where: { id: body.projectId },
          data: {
            phone: body.phone,
            street: body.street,
            apartment: body.apartment,
            comuna: body.comuna,
            region: body.region,
            windowsCount: body.windowsCount,
            squareMeters: body.squareMeters,
            description: body.description,
          },
        })

        logger.info(
          {
            projectId: body.projectId,
            changedFields: {
              phone: currentProject.phone !== body.phone,
              street: currentProject.street !== body.street,
              apartment: currentProject.apartment !== body.apartment,
              comuna: currentProject.comuna !== body.comuna,
              region: currentProject.region !== body.region,
              windowsCount: currentProject.windowsCount !== body.windowsCount,
              squareMeters: currentProject.squareMeters.toString() !== body.squareMeters.toString(),
              description: currentProject.description !== body.description,
            },
          },
          'Project data updated during event creation'
        )
      }

      // 4. Verificar que no exista un evento para este proyecto en esta fecha
      const existingEvent = await tx.projectEvent.findFirst({
        where: {
          projectId: body.projectId,
          scheduledDate: new Date(body.scheduledDate),
        },
      })

      if (existingEvent) {
        throw new BusinessError('Ya existe un evento para este proyecto en esta fecha', 400)
      }

      // 5. Crear evento de calendario
      const event = await tx.projectEvent.create({
        data: {
          projectId: body.projectId,
          scheduledDate: new Date(body.scheduledDate),
          tasks: body.tasks || [],
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
          teamTags: {
            include: {
              color: true,
            },
          },
        },
      })

      return { event, projectUpdated: hasChanges }
    })

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
