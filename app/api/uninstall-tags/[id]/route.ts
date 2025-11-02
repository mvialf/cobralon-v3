import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAbbreviation } from '@/lib/validations/uninstall-tag-validations'
import { z } from 'zod'

/**
 * Schema de validación para actualizar UninstallTag (campos opcionales)
 */
const updateUninstallTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  abbreviation: z
    .string()
    .length(2)
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  colorId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/uninstall-tags/[id]
 *
 * Obtiene una uninstall tag específica por ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const uninstallTag = await prisma.uninstallTag.findUnique({
      where: { id },
      include: {
        color: {
          select: {
            id: true,
            name: true,
            key: true,
            bgClass: true,
            textClass: true,
          },
        },
      },
    })

    if (!uninstallTag) {
      return NextResponse.json({ error: 'Uninstall tag no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ uninstallTag })
  } catch (error) {
    console.error('Error fetching uninstall tag:', error)
    return NextResponse.json({ error: 'Error al obtener la uninstall tag' }, { status: 500 })
  }
}

/**
 * PUT /api/uninstall-tags/[id]
 *
 * Actualiza una uninstall tag existente
 *
 * Body: Campos opcionales a actualizar
 * ```json
 * {
 *   "name": "Nuevo nombre",
 *   "abbreviation": "NN",
 *   "colorId": "uuid",
 *   "order": 5
 * }
 * ```
 *
 * Validaciones:
 * - El nombre debe ser único (si se cambia)
 * - La abreviatura debe tener 2 letras mayúsculas
 * - El colorId debe existir (si se cambia)
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Auto-generar abbreviation desde nombre si viene vacía
    const dataToValidate = {
      ...body,
      abbreviation: body.abbreviation || (body.name ? generateAbbreviation(body.name) : undefined),
    }

    const validatedData = updateUninstallTagSchema.parse(dataToValidate)

    // Verificar que la tag existe
    const existingTag = await prisma.uninstallTag.findUnique({
      where: { id },
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Uninstall tag no encontrada' }, { status: 404 })
    }

    // Validación: nombre único (si se está cambiando)
    if (validatedData.name && validatedData.name !== existingTag.name) {
      const duplicateName = await prisma.uninstallTag.findUnique({
        where: { name: validatedData.name },
      })

      if (duplicateName) {
        return NextResponse.json(
          { error: `Ya existe una tag con el nombre "${validatedData.name}"` },
          { status: 400 }
        )
      }
    }

    // Validación: colorId existe (si se está cambiando)
    if (validatedData.colorId) {
      const colorExists = await prisma.badgeColor.findUnique({
        where: { id: validatedData.colorId },
      })

      if (!colorExists) {
        return NextResponse.json({ error: 'El color seleccionado no existe' }, { status: 400 })
      }
    }

    // Actualizar la tag
    const updatedTag = await prisma.uninstallTag.update({
      where: { id },
      data: validatedData,
      include: {
        color: true,
      },
    })

    return NextResponse.json({ uninstallTag: updatedTag })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error updating uninstall tag:', error)
    return NextResponse.json({ error: 'Error al actualizar la uninstall tag' }, { status: 500 })
  }
}

/**
 * DELETE /api/uninstall-tags/[id]
 *
 * Elimina (soft delete) una uninstall tag
 *
 * Query params:
 * - force: "true" para hacer hard delete (usar con precaución)
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Verificar que la tag existe
    const existingTag = await prisma.uninstallTag.findUnique({
      where: { id },
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Uninstall tag no encontrada' }, { status: 404 })
    }

    if (force) {
      // Hard delete
      await prisma.uninstallTag.delete({
        where: { id },
      })

      return NextResponse.json({ message: 'Uninstall tag eliminada permanentemente' })
    } else {
      // Soft delete
      const deletedTag = await prisma.uninstallTag.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: 'Uninstall tag desactivada',
        uninstallTag: deletedTag,
      })
    }
  } catch (error) {
    console.error('Error deleting uninstall tag:', error)
    return NextResponse.json({ error: 'Error al eliminar la uninstall tag' }, { status: 500 })
  }
}
