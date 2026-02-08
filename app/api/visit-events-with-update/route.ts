import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createVisitEventWithUpdateSchema,
  type CreateVisitEventWithUpdateInput,
} from '@/lib/validations/visit-event-validations'
import { getRegionByCodigo } from '@/lib/regiones-chile'

/**
 * POST /api/visit-events-with-update
 *
 * Crea un nuevo evento de calendario Y actualiza datos de la Visit en una transacción atómica
 *
 * Features:
 * - Transacción Prisma (todo o nada)
 * - Detecta cambios en la visita antes de actualizar
 * - Solo actualiza si hay diferencias
 * - Rollback automático si falla alguna operación
 */
export const POST = withApiHandler<CreateVisitEventWithUpdateInput>(
  async (_request, logger, { body }) => {
    // Convertir código de región a nombre (form envía código, DB guarda nombre)
    const regionData = getRegionByCodigo(body.region)
    const regionNombre = regionData?.nombre || body.region

    // TRANSACCIÓN: Actualizar visita + Crear evento (atómico)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que la visita existe y obtener datos actuales
      const currentVisit = await tx.visit.findUnique({
        where: { id: body.visitId },
        select: {
          id: true,
          name: true,
          phone: true,
          street: true,
          apartment: true,
          comuna: true,
          region: true,
          observations: true,
          visitStatusId: true,
          visitStatus: {
            select: {
              isFinal: true,
            },
          },
        },
      })

      if (!currentVisit) {
        throw new BusinessError('Visita no encontrada', 404)
      }

      if (currentVisit.visitStatus?.isFinal) {
        throw new BusinessError('No se pueden crear eventos para visitas finalizadas', 400)
      }

      // 2. Detectar si hay cambios en los datos de la visita
      const hasVisitChanges =
        currentVisit.visitStatusId !== body.visitStatusId ||
        currentVisit.name !== body.name ||
        currentVisit.phone !== (body.phone || null) ||
        currentVisit.observations !== (body.observations || null) ||
        currentVisit.street !== body.street ||
        currentVisit.apartment !== (body.apartment || null) ||
        currentVisit.comuna !== body.comuna ||
        currentVisit.region !== regionNombre

      // 3. Actualizar visita SOLO si hay cambios
      if (hasVisitChanges) {
        await tx.visit.update({
          where: { id: body.visitId },
          data: {
            visitStatusId: body.visitStatusId,
            name: body.name,
            phone: body.phone || null,
            observations: body.observations || null,
            street: body.street,
            apartment: body.apartment || null,
            comuna: body.comuna,
            region: regionNombre,
          },
        })

        logger.info(
          {
            visitId: body.visitId,
            changedFields: {
              visitStatusId: currentVisit.visitStatusId !== body.visitStatusId,
              name: currentVisit.name !== body.name,
              phone: currentVisit.phone !== (body.phone || null),
              observations: currentVisit.observations !== (body.observations || null),
              street: currentVisit.street !== body.street,
              apartment: currentVisit.apartment !== (body.apartment || null),
              comuna: currentVisit.comuna !== body.comuna,
              region: currentVisit.region !== regionNombre,
            },
          },
          'Visit updated'
        )
      }

      // 4. Verificar que no exista un evento para esta visita en esta fecha
      const existingEvent = await tx.visitEvent.findFirst({
        where: {
          visitId: body.visitId,
          scheduledDate: new Date(body.scheduledDate),
        },
      })

      if (existingEvent) {
        throw new BusinessError('Ya existe un evento para esta visita en esta fecha', 400)
      }

      // 5. Crear evento de calendario
      const event = await tx.visitEvent.create({
        data: {
          visitId: body.visitId,
          scheduledDate: new Date(body.scheduledDate),
          ...(body.teamTagIds &&
            body.teamTagIds.length > 0 && {
              teamTags: {
                connect: body.teamTagIds.map((id) => ({ id })),
              },
            }),
        },
        include: {
          visit: {
            include: {
              visitStatus: {
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
        visitUpdated: hasVisitChanges,
      }
    })

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
