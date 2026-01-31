import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Schema de validación para crear/actualizar VisitStatus
 */
const visitStatusSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
  colorId: z.string().uuid('Color ID inválido'),
  order: z.number().int().min(0, 'El orden debe ser >= 0').optional(),
  isInitial: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/visit-status
 *
 * Obtiene todos los estados de visita, ordenados por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir estados inactivos (default: false)
 * - includeColor: "true" para incluir datos del color (default: true)
 *
 * Response:
 * ```json
 * {
 *   "visitStatuses": [
 *     {
 *       "id": "uuid",
 *       "name": "Agendada",
 *       "order": 1,
 *       "colorId": "uuid",
 *       "color": { "name": "Azul", "bgClass": "bg-blue-500", ... },
 *       "isInitial": true,
 *       "isFinal": false,
 *       "isActive": true,
 *       "_count": { "visits": 5 }
 *     }
 *   ]
 * }
 * ```
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const includeColor = searchParams.get('includeColor') !== 'false' // default true

    const visitStatuses = await prisma.visitStatus.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        order: true,
        colorId: true,
        isInitial: true,
        isFinal: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ...(includeColor && {
          color: {
            select: {
              id: true,
              name: true,
              key: true,
              bgClass: true,
              textClass: true,
            },
          },
        }),
        _count: {
          select: { visits: true },
        },
      },
    })

    return NextResponse.json({ visitStatuses })
  } catch (error) {
    console.error('Error fetching visit statuses:', error)
    return NextResponse.json({ error: 'Error al obtener los estados de visita' }, { status: 500 })
  }
}

/**
 * POST /api/visit-status
 *
 * Crea un nuevo estado de visita
 *
 * Body:
 * ```json
 * {
 *   "name": "En Proceso",
 *   "colorId": "uuid-del-color",
 *   "order": 5,
 *   "isInitial": false,
 *   "isFinal": false
 * }
 * ```
 *
 * Validaciones:
 * - Solo puede haber un estado con isInitial=true
 * - Solo puede haber un estado con isFinal=true
 * - El nombre debe ser único
 * - El colorId debe existir en BadgeColor
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = visitStatusSchema.parse(body)

    // Validaciones en paralelo: nombre único, color existe, estado inicial/final
    const [existingByName, colorExists, currentInitial, currentFinal] = await Promise.all([
      prisma.visitStatus.findUnique({
        where: { name: validatedData.name },
      }),
      prisma.badgeColor.findUnique({
        where: { id: validatedData.colorId },
      }),
      validatedData.isInitial
        ? prisma.visitStatus.findFirst({
            where: { isInitial: true, isActive: true },
          })
        : Promise.resolve(null),
      validatedData.isFinal
        ? prisma.visitStatus.findFirst({
            where: { isFinal: true, isActive: true },
          })
        : Promise.resolve(null),
    ])

    if (existingByName) {
      return NextResponse.json(
        { error: `Ya existe un estado con el nombre "${validatedData.name}"` },
        { status: 400 }
      )
    }

    if (validatedData.isInitial && currentInitial) {
      return NextResponse.json(
        {
          error: `Ya existe un estado inicial: "${currentInitial.name}". Solo puede haber uno.`,
        },
        { status: 400 }
      )
    }

    if (validatedData.isFinal && currentFinal) {
      return NextResponse.json(
        { error: `Ya existe un estado final: "${currentFinal.name}". Solo puede haber uno.` },
        { status: 400 }
      )
    }

    if (!colorExists) {
      return NextResponse.json({ error: 'El color seleccionado no existe' }, { status: 400 })
    }

    // Calcular order automáticamente según tipo de estado
    let order: number

    if (validatedData.isInitial) {
      // Estado inicial: siempre primero (order = 0)
      order = 0
    } else if (validatedData.isFinal) {
      // Estado final: siempre último (order = 999)
      order = 999
    } else {
      // Estado normal: calcular siguiente order disponible en el medio
      // Buscar el máximo order de estados normales (excluir inicial=0 y final=999)
      const maxNormalOrder = await prisma.visitStatus.findFirst({
        where: {
          isInitial: false,
          isFinal: false,
          order: { lt: 999 }, // Excluir final
        },
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      // Si no hay estados normales, empezar en 10
      // Si hay, sumar 10 al máximo (gaps para reordenar)
      order = maxNormalOrder ? maxNormalOrder.order + 10 : 10
    }

    // Crear el estado
    const newStatus = await prisma.visitStatus.create({
      data: {
        name: validatedData.name,
        colorId: validatedData.colorId,
        order,
        isInitial: validatedData.isInitial ?? false,
        isFinal: validatedData.isFinal ?? false,
        isActive: validatedData.isActive ?? true,
      },
      include: {
        color: true,
      },
    })

    return NextResponse.json({ visitStatus: newStatus }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error creating visit status:', error)
    return NextResponse.json({ error: 'Error al crear el estado de visita' }, { status: 500 })
  }
}
