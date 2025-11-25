import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAftersaleEventWithUpdateSchema } from '@/lib/validations/aftersale-event-validations'
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
 *
 * Body:
 * - aftersaleId, scheduledDate (datos del evento)
 * - aftersaleStatusId, contactPhone, description, tasks (datos del aftersale)
 * - street, apartment, comuna, region (datos de dirección del project)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar datos de entrada con schema extendido
    const validationResult = createAftersaleEventWithUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      console.warn('Invalid aftersale event with update data:', validationResult.error.errors)
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Convertir código de región a nombre (form envía código, DB guarda nombre)
    const regionData = getRegionByCodigo(data.region)
    const regionNombre = regionData?.nombre || data.region

    // TRANSACCIÓN: Actualizar aftersale + project + Crear evento (atómico)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el aftersale existe y obtener datos actuales
      const currentAftersale = await tx.aftersale.findUnique({
        where: { id: data.aftersaleId },
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
        throw new Error('AFTERSALE_NOT_FOUND')
      }

      if (currentAftersale.aftersaleStatus?.isFinal) {
        throw new Error('AFTERSALE_FINALIZED')
      }

      // 2. Detectar si hay cambios en los datos del aftersale
      const hasAftersaleChanges =
        currentAftersale.aftersaleStatusId !== data.aftersaleStatusId ||
        currentAftersale.contactPhone !== data.contactPhone ||
        currentAftersale.description !== data.description ||
        JSON.stringify(currentAftersale.tasks) !== JSON.stringify(data.tasks || [])

      // 3. Detectar si hay cambios en los datos del proyecto (dirección)
      const hasProjectChanges =
        currentAftersale.project.street !== data.street ||
        currentAftersale.project.apartment !== data.apartment ||
        currentAftersale.project.comuna !== data.comuna ||
        currentAftersale.project.region !== regionNombre

      // 4. Actualizar aftersale SOLO si hay cambios
      if (hasAftersaleChanges) {
        await tx.aftersale.update({
          where: { id: data.aftersaleId },
          data: {
            aftersaleStatusId: data.aftersaleStatusId,
            contactPhone: data.contactPhone,
            description: data.description,
            tasks: data.tasks || [],
          },
        })

        console.log('Aftersale updated:', {
          aftersaleId: data.aftersaleId,
          changedFields: {
            aftersaleStatusId: currentAftersale.aftersaleStatusId !== data.aftersaleStatusId,
            contactPhone: currentAftersale.contactPhone !== data.contactPhone,
            description: currentAftersale.description !== data.description,
            tasks: JSON.stringify(currentAftersale.tasks) !== JSON.stringify(data.tasks || []),
          },
        })
      }

      // 5. Actualizar proyecto SOLO si hay cambios en dirección
      if (hasProjectChanges) {
        await tx.project.update({
          where: { id: currentAftersale.projectId },
          data: {
            street: data.street,
            apartment: data.apartment,
            comuna: data.comuna,
            region: regionNombre,
          },
        })

        console.log('Project address updated:', {
          projectId: currentAftersale.projectId,
          changedFields: {
            street: currentAftersale.project.street !== data.street,
            apartment: currentAftersale.project.apartment !== data.apartment,
            comuna: currentAftersale.project.comuna !== data.comuna,
            region: currentAftersale.project.region !== regionNombre,
          },
        })
      }

      // 6. Verificar que no exista un evento para este aftersale en esta fecha
      const existingEvent = await tx.aftersaleEvent.findFirst({
        where: {
          aftersaleId: data.aftersaleId,
          scheduledDate: new Date(data.scheduledDate),
        },
      })

      if (existingEvent) {
        throw new Error('EVENT_ALREADY_EXISTS')
      }

      // 7. Crear evento de calendario
      const event = await tx.aftersaleEvent.create({
        data: {
          aftersaleId: data.aftersaleId,
          scheduledDate: new Date(data.scheduledDate),
          // notes no se usa según requerimiento
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
        },
      })

      return {
        event,
        aftersaleUpdated: hasAftersaleChanges,
        projectUpdated: hasProjectChanges,
      }
    })

    console.log('Aftersale event created with updates:', {
      eventId: result.event.id,
      aftersaleId: data.aftersaleId,
      aftersaleUpdated: result.aftersaleUpdated,
      projectUpdated: result.projectUpdated,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // Manejo de errores específicos
    if (error instanceof Error) {
      if (error.message === 'AFTERSALE_NOT_FOUND') {
        console.warn('Aftersale not found')
        return NextResponse.json({ error: 'Postventa no encontrada' }, { status: 404 })
      }

      if (error.message === 'AFTERSALE_FINALIZED') {
        console.warn('Cannot create event for finalized aftersale')
        return NextResponse.json(
          { error: 'No se pueden crear eventos para postventas finalizadas' },
          { status: 400 }
        )
      }

      if (error.message === 'EVENT_ALREADY_EXISTS') {
        console.warn('Event already exists for this aftersale and date')
        return NextResponse.json(
          { error: 'Ya existe un evento para esta postventa en esta fecha' },
          { status: 400 }
        )
      }
    }

    console.error('Failed to create aftersale event with update:', error)
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 })
  }
}
