import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createVisitEventSchema } from '@/lib/validations/calendar-validations'

/**
 * POST /api/visit-events
 *
 * Crea un nuevo evento de visita
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar datos
    const validationResult = createVisitEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Verificar que la visita existe
    const visit = await prisma.visit.findUnique({
      where: { id: data.visitId },
      include: { visitStatus: true },
    })

    if (!visit) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }

    // Verificar que la visita NO esté finalizada
    if (visit.visitStatus.isFinal) {
      return NextResponse.json(
        { error: 'No se puede crear evento para una visita finalizada' },
        { status: 400 }
      )
    }

    // Verificar que no exista duplicado
    const existingEvent = await prisma.visitEvent.findFirst({
      where: {
        visitId: data.visitId,
        scheduledDate: data.scheduledDate,
      },
    })

    if (existingEvent) {
      return NextResponse.json(
        { error: 'Ya existe un evento para esta visita en esta fecha' },
        { status: 400 }
      )
    }

    // Crear evento
    const newEvent = await prisma.visitEvent.create({
      data: {
        visitId: data.visitId,
        scheduledDate: data.scheduledDate,
        notes: data.notes,
      },
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

    return NextResponse.json(newEvent, { status: 201 })
  } catch (_error) {
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 })
  }
}
