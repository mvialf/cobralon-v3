import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVisitEventWithUpdateSchema } from '@/lib/validations/visit-event-validations'
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
 *
 * Body:
 * - visitId, scheduledDate (datos del evento)
 * - visitStatusId, name, phone, observations (datos de la visita)
 * - street, apartment, comuna, region (datos de dirección)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar datos de entrada con schema extendido
    const validationResult = createVisitEventWithUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      console.warn('Invalid visit event with update data:', validationResult.error.errors)
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Convertir código de región a nombre (form envía código, DB guarda nombre)
    const regionData = getRegionByCodigo(data.region)
    const regionNombre = regionData?.nombre || data.region

    // TRANSACCIÓN: Actualizar visita + Crear evento (atómico)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que la visita existe y obtener datos actuales
      const currentVisit = await tx.visit.findUnique({
        where: { id: data.visitId },
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
        throw new Error('VISIT_NOT_FOUND')
      }

      if (currentVisit.visitStatus?.isFinal) {
        throw new Error('VISIT_FINALIZED')
      }

      // 2. Detectar si hay cambios en los datos de la visita
      const hasVisitChanges =
        currentVisit.visitStatusId !== data.visitStatusId ||
        currentVisit.name !== data.name ||
        currentVisit.phone !== (data.phone || null) ||
        currentVisit.observations !== (data.observations || null) ||
        currentVisit.street !== data.street ||
        currentVisit.apartment !== (data.apartment || null) ||
        currentVisit.comuna !== data.comuna ||
        currentVisit.region !== regionNombre

      // 3. Actualizar visita SOLO si hay cambios
      if (hasVisitChanges) {
        await tx.visit.update({
          where: { id: data.visitId },
          data: {
            visitStatusId: data.visitStatusId,
            name: data.name,
            phone: data.phone || null,
            observations: data.observations || null,
            street: data.street,
            apartment: data.apartment || null,
            comuna: data.comuna,
            region: regionNombre,
          },
        })

        console.log('Visit updated:', {
          visitId: data.visitId,
          changedFields: {
            visitStatusId: currentVisit.visitStatusId !== data.visitStatusId,
            name: currentVisit.name !== data.name,
            phone: currentVisit.phone !== (data.phone || null),
            observations: currentVisit.observations !== (data.observations || null),
            street: currentVisit.street !== data.street,
            apartment: currentVisit.apartment !== (data.apartment || null),
            comuna: currentVisit.comuna !== data.comuna,
            region: currentVisit.region !== regionNombre,
          },
        })
      }

      // 4. Verificar que no exista un evento para esta visita en esta fecha
      const existingEvent = await tx.visitEvent.findFirst({
        where: {
          visitId: data.visitId,
          scheduledDate: new Date(data.scheduledDate),
        },
      })

      if (existingEvent) {
        throw new Error('EVENT_ALREADY_EXISTS')
      }

      // 5. Crear evento de calendario
      const event = await tx.visitEvent.create({
        data: {
          visitId: data.visitId,
          scheduledDate: new Date(data.scheduledDate),
          // Conectar teamTags si se proporcionan
          ...(data.teamTagIds &&
            data.teamTagIds.length > 0 && {
              teamTags: {
                connect: data.teamTagIds.map((id) => ({ id })),
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

    console.log('Visit event created with updates:', {
      eventId: result.event.id,
      visitId: data.visitId,
      visitUpdated: result.visitUpdated,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // Manejo de errores específicos
    if (error instanceof Error) {
      if (error.message === 'VISIT_NOT_FOUND') {
        console.warn('Visit not found')
        return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
      }

      if (error.message === 'VISIT_FINALIZED') {
        console.warn('Cannot create event for finalized visit')
        return NextResponse.json(
          { error: 'No se pueden crear eventos para visitas finalizadas' },
          { status: 400 }
        )
      }

      if (error.message === 'EVENT_ALREADY_EXISTS') {
        console.warn('Event already exists for this visit and date')
        return NextResponse.json(
          { error: 'Ya existe un evento para esta visita en esta fecha' },
          { status: 400 }
        )
      }
    }

    console.error('Failed to create visit event with update:', error)
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 })
  }
}
