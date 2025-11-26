import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAftersaleEventSchema } from '@/lib/validations/calendar-validations'

/**
 * POST /api/aftersale-events
 *
 * Crea un nuevo evento de postventa
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validar datos
    const validationResult = createAftersaleEventSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Verificar que la postventa existe
    const aftersale = await prisma.aftersale.findUnique({
      where: { id: data.aftersaleId },
      include: { aftersaleStatus: true },
    })

    if (!aftersale) {
      return NextResponse.json({ error: 'Postventa no encontrada' }, { status: 404 })
    }

    // Verificar que la postventa NO esté finalizada
    if (aftersale.aftersaleStatus.isFinal) {
      return NextResponse.json(
        { error: 'No se puede crear evento para una postventa finalizada' },
        { status: 400 }
      )
    }

    // Verificar que no exista duplicado
    const existingEvent = await prisma.aftersaleEvent.findFirst({
      where: {
        aftersaleId: data.aftersaleId,
        scheduledDate: data.scheduledDate,
      },
    })

    if (existingEvent) {
      return NextResponse.json(
        { error: 'Ya existe un evento para esta postventa en esta fecha' },
        { status: 400 }
      )
    }

    // Crear evento con teamTags si se proporcionan
    const newEvent = await prisma.aftersaleEvent.create({
      data: {
        aftersaleId: data.aftersaleId,
        scheduledDate: data.scheduledDate,
        notes: data.notes,
        // Conectar teamTags si se proporcionan
        ...(data.teamTagIds &&
          data.teamTagIds.length > 0 && {
            teamTags: {
              connect: data.teamTagIds.map((id) => ({ id })),
            },
          }),
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
        teamTags: {
          include: {
            color: true,
          },
        },
      },
    })

    return NextResponse.json(newEvent, { status: 201 })
  } catch (_error) {
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 })
  }
}
