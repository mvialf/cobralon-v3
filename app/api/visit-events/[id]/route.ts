import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { updateVisitEventSchema } from '@/lib/validations/calendar-validations'
import { Prisma } from '@prisma/client'

/**
 * GET /api/visit-events/[id]
 *
 * Obtiene un evento de visita por ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const event = await prisma.visitEvent.findUnique({
      where: { id },
      include: {
        visit: {
          include: {
            visitStatus: {
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
 * PUT /api/visit-events/[id]
 *
 * Actualiza un evento de visita
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validar datos
    const validationResult = updateVisitEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Verificar que el evento existe
    const existingEvent = await prisma.visitEvent.findUnique({
      where: { id },
      include: { visit: { include: { visitStatus: true } } },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Si se está cambiando la fecha, verificar duplicados
    if (
      data.scheduledDate &&
      data.scheduledDate.getTime() !== existingEvent.scheduledDate.getTime()
    ) {
      const duplicateEvent = await prisma.visitEvent.findFirst({
        where: {
          visitId: existingEvent.visitId,
          scheduledDate: data.scheduledDate,
          id: { not: id },
        },
      })

      if (duplicateEvent) {
        return NextResponse.json(
          { error: 'Ya existe un evento para esta visita en esta fecha' },
          { status: 400 }
        )
      }
    }

    // Construir data para update
    const updateData: Prisma.VisitEventUpdateInput = {
      scheduledDate: data.scheduledDate,
      notes: data.notes,
    }

    // Manejar teamTags: usar 'set' para reemplazar todos los teamTags
    if (data.teamTagIds !== undefined) {
      updateData.teamTags = {
        set: data.teamTagIds?.map((id) => ({ id })) || [],
      }
    }

    // Actualizar evento
    const updatedEvent = await prisma.visitEvent.update({
      where: { id },
      data: updateData,
      include: {
        visit: {
          include: {
            visitStatus: {
              include: {
                color: true,
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

    return NextResponse.json(updatedEvent)
  } catch (_error) {
    return NextResponse.json({ error: 'Error al actualizar evento' }, { status: 500 })
  }
}

/**
 * PATCH /api/visit-events/[id]
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
    const existingEvent = await prisma.visitEvent.findUnique({
      where: { id },
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Verificar que no hay duplicado en la nueva fecha
    const duplicateEvent = await prisma.visitEvent.findFirst({
      where: {
        visitId: existingEvent.visitId,
        scheduledDate: scheduledDate,
        id: { not: id },
      },
    })

    if (duplicateEvent) {
      return NextResponse.json(
        { error: 'Ya existe un evento para esta visita en esta fecha' },
        { status: 400 }
      )
    }

    // Actualizar solo la fecha
    const updatedEvent = await prisma.visitEvent.update({
      where: { id },
      data: { scheduledDate },
      include: {
        visit: {
          include: {
            visitStatus: {
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
 * DELETE /api/visit-events/[id]
 *
 * Elimina un evento de visita
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar que existe
    const event = await prisma.visitEvent.findUnique({
      where: { id },
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Eliminar
    await prisma.visitEvent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json({ error: 'Error al eliminar evento' }, { status: 500 })
  }
}
