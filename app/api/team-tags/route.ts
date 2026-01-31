import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { teamTagSchema, generateAbbreviation } from '@/lib/validations/team-tag-validations'
import { z } from 'zod'

/**
 * GET /api/team-tags
 *
 * Obtiene todos los team tags (integrantes del equipo), ordenados por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir tags inactivas (default: false)
 * - includeColor: "true" para incluir datos del color (default: true)
 *
 * Response:
 * ```json
 * {
 *   "teamTags": [
 *     {
 *       "id": "uuid",
 *       "name": "Juan Pérez",
 *       "abbreviation": "JP",
 *       "order": 1,
 *       "colorId": "uuid",
 *       "color": { "name": "Azul", "bgClass": "bg-blue-500", ... },
 *       "isActive": true
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

    // Build query options
    const queryOptions: Parameters<typeof prisma.teamTag.findMany>[0] = {
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
    }

    // Add include conditionally
    if (includeColor) {
      queryOptions.include = {
        color: {
          select: {
            id: true,
            name: true,
            key: true,
            bgClass: true,
            textClass: true,
          },
        },
      }
    }

    const teamTags = await prisma.teamTag.findMany(queryOptions)

    return NextResponse.json({ teamTags })
  } catch (error) {
    console.error('Error fetching team tags:', error)
    return NextResponse.json({ error: 'Error al obtener los team tags' }, { status: 500 })
  }
}

/**
 * POST /api/team-tags
 *
 * Crea un nuevo team tag (integrante del equipo)
 *
 * Body:
 * ```json
 * {
 *   "name": "Juan Pérez",
 *   "abbreviation": "JP",  // Opcional: se auto-genera si no se provee
 *   "colorId": "uuid-del-color",
 *   "order": 5  // Opcional
 * }
 * ```
 *
 * Validaciones:
 * - El nombre debe ser único
 * - La abreviatura debe tener exactamente 2 letras mayúsculas
 * - El colorId debe existir en BadgeColor
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Auto-generar abbreviation si viene vacío
    const dataToValidate = {
      ...body,
      abbreviation: body.abbreviation || generateAbbreviation(body.name),
    }

    const validatedData = teamTagSchema.parse(dataToValidate)

    // Validaciones en paralelo: nombre único, color existe, max order
    const [existingByName, colorExists, maxOrderResult] = await Promise.all([
      prisma.teamTag.findUnique({
        where: { name: validatedData.name },
      }),
      prisma.badgeColor.findUnique({
        where: { id: validatedData.colorId },
      }),
      body.order === undefined
        ? prisma.teamTag.findFirst({
            orderBy: { order: 'desc' },
            select: { order: true },
          })
        : Promise.resolve(null),
    ])

    if (existingByName) {
      return NextResponse.json(
        { error: `Ya existe un integrante con el nombre "${validatedData.name}"` },
        { status: 400 }
      )
    }

    if (!colorExists) {
      return NextResponse.json({ error: 'El color seleccionado no existe' }, { status: 400 })
    }

    // Calcular order automáticamente si no se provee
    const order =
      body.order !== undefined ? body.order : maxOrderResult ? maxOrderResult.order + 10 : 10

    // Crear el team tag
    const newTag = await prisma.teamTag.create({
      data: {
        name: validatedData.name,
        abbreviation: validatedData.abbreviation,
        colorId: validatedData.colorId,
        order,
      },
      include: {
        color: true,
      },
    })

    return NextResponse.json({ teamTag: newTag }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error creating team tag:', error)
    return NextResponse.json({ error: 'Error al crear el team tag' }, { status: 500 })
  }
}
