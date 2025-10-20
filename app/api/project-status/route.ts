import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Schema de validación para crear/actualizar ProjectStatus
 */
const projectStatusSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50, 'Máximo 50 caracteres'),
  colorId: z.string().uuid('Color ID inválido'),
  order: z.number().int().min(0, 'El orden debe ser >= 0').optional(),
  isInitial: z.boolean().optional(),
  isFinal: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/project-status
 *
 * Obtiene todos los estados de proyecto, ordenados por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir estados inactivos (default: false)
 * - includeColor: "true" para incluir datos del color (default: true)
 *
 * Response:
 * ```json
 * {
 *   "projectStatuses": [
 *     {
 *       "id": "uuid",
 *       "name": "Pendiente",
 *       "order": 1,
 *       "colorId": "uuid",
 *       "color": { "name": "Amarillo", "bgClass": "bg-yellow-500", ... },
 *       "isInitial": true,
 *       "isFinal": false,
 *       "isActive": true,
 *       "_count": { "projects": 5 }
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

    const projectStatuses = await prisma.projectStatus.findMany({
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
          select: { projects: true },
        },
      },
    })

    return NextResponse.json({ projectStatuses })
  } catch (error) {
    console.error('Error fetching project statuses:', error)
    return NextResponse.json({ error: 'Error al obtener los estados de proyecto' }, { status: 500 })
  }
}

/**
 * POST /api/project-status
 *
 * Crea un nuevo estado de proyecto
 *
 * Body:
 * ```json
 * {
 *   "name": "En Revisión",
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
    const validatedData = projectStatusSchema.parse(body)

    // Validación: nombre único
    const existingByName = await prisma.projectStatus.findUnique({
      where: { name: validatedData.name },
    })

    if (existingByName) {
      return NextResponse.json(
        { error: `Ya existe un estado con el nombre "${validatedData.name}"` },
        { status: 400 }
      )
    }

    // Validación: solo un estado inicial
    if (validatedData.isInitial) {
      const currentInitial = await prisma.projectStatus.findFirst({
        where: { isInitial: true, isActive: true },
      })

      if (currentInitial) {
        return NextResponse.json(
          {
            error: `Ya existe un estado inicial: "${currentInitial.name}". Solo puede haber uno.`,
          },
          { status: 400 }
        )
      }
    }

    // Validación: solo un estado final
    if (validatedData.isFinal) {
      const currentFinal = await prisma.projectStatus.findFirst({
        where: { isFinal: true, isActive: true },
      })

      if (currentFinal) {
        return NextResponse.json(
          { error: `Ya existe un estado final: "${currentFinal.name}". Solo puede haber uno.` },
          { status: 400 }
        )
      }
    }

    // Validación: colorId existe
    const colorExists = await prisma.badgeColor.findUnique({
      where: { id: validatedData.colorId },
    })

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
      const maxNormalOrder = await prisma.projectStatus.findFirst({
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
    const newStatus = await prisma.projectStatus.create({
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

    return NextResponse.json({ projectStatus: newStatus }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error creating project status:', error)
    return NextResponse.json({ error: 'Error al crear el estado de proyecto' }, { status: 500 })
  }
}
