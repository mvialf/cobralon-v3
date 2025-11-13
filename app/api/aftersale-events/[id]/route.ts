import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateAftersaleEventSchema } from '@/lib/validations/calendar-validations'

/**
 * GET /api/aftersale-events/[id]
 *
 * Obtiene un evento de postventa por ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const event = await prisma.aftersaleEvent.findUnique({
      where: { id },
      include: {
        aftersale: {
          include: {
            project: {
              include: {
                customer: true,
              },
            },
            aftersaleStatus: {
              include: {
                color: true,
              },
            },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (_error) {
    return NextResponse.json({ error: 'Error al obtener evento' }, { status: 500 })
  }
}

/**
 * PUT /api/aftersale-events/[id]
 *
 * Actualiza un evento de postventa
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = updateAftersaleEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Verificar que el evento existe
    const existingEvent = await prisma.aftersaleEvent.findUnique({
      where: { id },
      include: { aftersale: { include: { aftersaleStatus: true } } },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Si se está cambiando la fecha, verificar duplicados
    if (
      data.scheduledDate &&
      data.scheduledDate.getTime() !== existingEvent.scheduledDate.getTime()
    ) {
      const duplicateEvent = await prisma.aftersaleEvent.findFirst({
        where: {
          aftersaleId: existingEvent.aftersaleId,
          scheduledDate: data.scheduledDate,
          id: { not: id },
        },
      })

      if (duplicateEvent) {
        return NextResponse.json(
          { error: 'Ya existe un evento para esta postventa en esta fecha' },
          { status: 400 }
        )
      }
    }

    // Actualizar evento
    const updatedEvent = await prisma.aftersaleEvent.update({
      where: { id },
      data: {
        scheduledDate: data.scheduledDate,
        notes: data.notes,
      },
      include: {
        aftersale: {
          include: {
            project: {
              include: {
                customer: true,
              },
            },
            aftersaleStatus: {
              include: {
                color: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedEvent)
  } catch (_error) {
    return NextResponse.json({ error: 'Error al actualizar evento' }, { status: 500 })
  }
}

/**
 * PATCH /api/aftersale-events/[id]
 *
 * Actualiza solo la fecha de un evento (usado para drag & drop)
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validar que scheduledDate existe
    if (!body.scheduledDate) {
      return NextResponse.json({ error: 'scheduledDate es requerido' }, { status: 400 })
    }

    const scheduledDate = new Date(body.scheduledDate)

    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'scheduledDate inválido' }, { status: 400 })
    }

    // Verificar que el evento existe
    const existingEvent = await prisma.aftersaleEvent.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Verificar que no hay duplicado en la nueva fecha
    const duplicateEvent = await prisma.aftersaleEvent.findFirst({
      where: {
        aftersaleId: existingEvent.aftersaleId,
        scheduledDate: scheduledDate,
        id: { not: id },
      },
    })

    if (duplicateEvent) {
      return NextResponse.json(
        { error: 'Ya existe un evento para esta postventa en esta fecha' },
        { status: 400 }
      )
    }

    // Actualizar solo la fecha
    const updatedEvent = await prisma.aftersaleEvent.update({
      where: { id },
      data: { scheduledDate },
      include: {
        aftersale: {
          include: {
            project: {
              include: {
                customer: true,
              },
            },
            aftersaleStatus: {
              include: {
                color: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedEvent)
  } catch (_error) {
    return NextResponse.json({ error: 'Error al actualizar fecha del evento' }, { status: 500 })
  }
}

/**
 * DELETE /api/aftersale-events/[id]
 *
 * Elimina un evento de postventa
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar que existe
    const event = await prisma.aftersaleEvent.findUnique({
      where: { id },
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Eliminar
    await prisma.aftersaleEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json({ error: 'Error al eliminar evento' }, { status: 500 })
  }
}
