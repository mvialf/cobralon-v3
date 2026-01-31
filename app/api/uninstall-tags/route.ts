import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  uninstallTagWithOptionalAbbreviationSchema,
  normalizeUninstallTagPayload,
} from '@/lib/validations/uninstall-tag-validations'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * GET /api/uninstall-tags
 *
 * Obtiene todas las tags de desinstalación, ordenadas por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir tags inactivas (default: false)
 * - includeColor: "true" para incluir datos del color (default: true)
 *
 * Response:
 * ```json
 * {
 *   "uninstallTags": [
 *     {
 *       "id": "uuid",
 *       "name": "Material X",
 *       "abbreviation": "MX",
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
    const queryOptions: Prisma.UninstallTagFindManyArgs = {
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

    const uninstallTags = await prisma.uninstallTag.findMany(queryOptions)

    return NextResponse.json({ uninstallTags })
  } catch (error) {
    console.error('Error fetching uninstall tags:', error)
    return NextResponse.json({ error: 'Error al obtener las uninstall tags' }, { status: 500 })
  }
}

/**
 * POST /api/uninstall-tags
 *
 * Crea una nueva uninstall tag
 *
 * Body:
 * ```json
 * {
 *   "name": "Material X",
 *   "abbreviation": "MX",  // Opcional: se auto-genera si no se provee
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

    const parsed = uninstallTagWithOptionalAbbreviationSchema.parse(body)
    const validatedData = normalizeUninstallTagPayload(parsed)

    // Validación: nombre único
    const existingByName = await prisma.uninstallTag.findUnique({
      where: { name: validatedData.name },
    })

    if (existingByName) {
      return NextResponse.json(
        { error: `Ya existe una tag con el nombre "${validatedData.name}"` },
        { status: 400 }
      )
    }

    // Validación: colorId existe
    const colorExists = await prisma.badgeColor.findUnique({
      where: { id: validatedData.colorId },
    })

    if (!colorExists) {
      return NextResponse.json({ error: 'El color seleccionado no existe' }, { status: 400 })
    }

    // Calcular order automáticamente si no se provee
    let order: number

    if (body.order !== undefined) {
      order = body.order
    } else {
      // Buscar el máximo order actual
      const maxOrder = await prisma.uninstallTag.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      // Si no hay tags, empezar en 10, sino sumar 10 al máximo
      order = maxOrder ? maxOrder.order + 10 : 10
    }

    // Crear la tag
    const newTag = await prisma.uninstallTag.create({
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

    return NextResponse.json({ uninstallTag: newTag }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error creating uninstall tag:', error)
    return NextResponse.json({ error: 'Error al crear la uninstall tag' }, { status: 500 })
  }
}
