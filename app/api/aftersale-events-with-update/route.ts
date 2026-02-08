import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createAftersaleEventWithUpdateSchema,
  type CreateAftersaleEventWithUpdateInput,
} from '@/lib/validations/aftersale-event-validations'
import { getRegionByCodigo } from '@/lib/regiones-chile'

/**
 * POST /api/aftersale-events-with-update
 *
 * Crea un nuevo evento de calendario Y actualiza datos del Aftersale + Project en una transacción atómica
 *
 * Features:
 * - Transacción Prisma (todo o nada)
 * - Detecta cambios en el aftersale y project antes de actualizar
 * - Solo actualiza si hay diferencias
 * - Rollback automático si falla alguna operación
 */
export const POST = withApiHandler<CreateAftersaleEventWithUpdateInput>(
  async (_request, logger, { body }) => {
    // Convertir código de región a nombre (form envía código, DB guarda nombre)
    const regionData = getRegionByCodigo(body.region)
    const regionNombre = regionData?.nombre || body.region

    // TRANSACCIÓN: Actualizar aftersale + project + Crear evento (atómico)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el aftersale existe y obtener datos actuales
      const currentAftersale = await tx.aftersale.findUnique({
        where: { id: body.aftersaleId },
        select: {
          id: true,
          projectId: true,
          aftersaleStatusId: true,
          contactPhone: true,
          description: true,
          tasks: true,
          aftersaleStatus: {
            select: {
              isFinal: true,
            },
          },
          project: {
            select: {
              id: true,
              street: true,
              apartment: true,
              comuna: true,
              region: true,
            },
          },
        },
      })

      if (!currentAftersale) {
        throw new BusinessError('Postventa no encontrada', 404)
      }

      if (currentAftersale.aftersaleStatus?.isFinal) {
        throw new BusinessError('No se pueden crear eventos para postventas finalizadas', 400)
      }

      // 2. Detectar si hay cambios en los datos del aftersale
      const hasAftersaleChanges =
        currentAftersale.aftersaleStatusId !== body.aftersaleStatusId ||
        currentAftersale.contactPhone !== body.contactPhone ||
        currentAftersale.description !== body.description ||
        JSON.stringify(currentAftersale.tasks) !== JSON.stringify(body.tasks || [])

      // 3. Detectar si hay cambios en los datos del proyecto (dirección)
      const hasProjectChanges =
        currentAftersale.project.street !== body.street ||
        currentAftersale.project.apartment !== body.apartment ||
        currentAftersale.project.comuna !== body.comuna ||
        currentAftersale.project.region !== regionNombre

      // 4. Actualizar aftersale SOLO si hay cambios
      if (hasAftersaleChanges) {
        await tx.aftersale.update({
          where: { id: body.aftersaleId },
          data: {
            aftersaleStatusId: body.aftersaleStatusId,
            contactPhone: body.contactPhone,
            description: body.description,
            tasks: body.tasks || [],
          },
        })

        logger.info(
          {
            aftersaleId: body.aftersaleId,
            changedFields: {
              aftersaleStatusId: currentAftersale.aftersaleStatusId !== body.aftersaleStatusId,
              contactPhone: currentAftersale.contactPhone !== body.contactPhone,
              description: currentAftersale.description !== body.description,
              tasks: JSON.stringify(currentAftersale.tasks) !== JSON.stringify(body.tasks || []),
            },
          },
          'Aftersale updated'
        )
      }

      // 5. Actualizar proyecto SOLO si hay cambios en dirección
      if (hasProjectChanges) {
        await tx.project.update({
          where: { id: currentAftersale.projectId },
          data: {
            street: body.street,
            apartment: body.apartment,
            comuna: body.comuna,
            region: regionNombre,
          },
        })

        logger.info(
          {
            projectId: currentAftersale.projectId,
            changedFields: {
              street: currentAftersale.project.street !== body.street,
              apartment: currentAftersale.project.apartment !== body.apartment,
              comuna: currentAftersale.project.comuna !== body.comuna,
              region: currentAftersale.project.region !== regionNombre,
            },
          },
          'Project address updated'
        )
      }

      // 6. Verificar que no exista un evento para este aftersale en esta fecha
      const existingEvent = await tx.aftersaleEvent.findFirst({
        where: {
          aftersaleId: body.aftersaleId,
          scheduledDate: new Date(body.scheduledDate),
        },
      })

      if (existingEvent) {
        throw new BusinessError('Ya existe un evento para esta postventa en esta fecha', 400)
      }

      // 7. Crear evento de calendario
      const event = await tx.aftersaleEvent.create({
        data: {
          aftersaleId: body.aftersaleId,
          scheduledDate: new Date(body.scheduledDate),
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
                  customer: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              aftersaleStatus: {
                include: {
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

      return {
        event,
        aftersaleUpdated: hasAftersaleChanges,
        projectUpdated: hasProjectChanges,
      }
    })

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
