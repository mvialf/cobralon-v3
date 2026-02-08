import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateUninstallTagApiSchema,
  type UpdateUninstallTagApiBody,
  generateAbbreviation,
} from '@/lib/validations/uninstall-tag-validations'

/**
 * GET /api/uninstall-tags/[id]
 *
 * Obtiene una uninstall tag específica por ID
 */
export const GET = withApiHandler(
  async (_request, _logger, { params }) => {
    const uninstallTag = await prisma.uninstallTag.findUnique({
      where: { id: params.id },
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
      throw new BusinessError('Uninstall tag no encontrada', 404)
    }

    return NextResponse.json({ uninstallTag })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al obtener la uninstall tag' }
)

/**
 * PUT /api/uninstall-tags/[id]
 *
 * Actualiza una uninstall tag existente
 *
 * Validaciones:
 * - El nombre debe ser único (si se cambia)
 * - La abreviatura debe tener 2 letras mayúsculas
 * - El colorId debe existir (si se cambia)
 */
export const PUT = withApiHandler<UpdateUninstallTagApiBody>(
  async (request, _logger, { params, body }) => {
    const { id } = params

    // Auto-generar abbreviation desde nombre si se cambia nombre sin abbreviation
    const updateData = { ...body }
    if (updateData.name && updateData.abbreviation === undefined) {
      updateData.abbreviation = generateAbbreviation(updateData.name)
    }

    const existingTag = await prisma.uninstallTag.findUnique({
      where: { id },
    })

    if (!existingTag) {
      throw new BusinessError('Uninstall tag no encontrada', 404)
    }

    if (updateData.name && updateData.name !== existingTag.name) {
      const duplicateName = await prisma.uninstallTag.findUnique({
        where: { name: updateData.name },
      })

      if (duplicateName) {
        throw new BusinessError(`Ya existe una tag con el nombre "${updateData.name}"`)
      }
    }

    if (updateData.colorId) {
      const colorExists = await prisma.badgeColor.findUnique({
        where: { id: updateData.colorId },
      })

      if (!colorExists) {
        throw new BusinessError('El color seleccionado no existe')
      }
    }

    const updatedTag = await prisma.uninstallTag.update({
      where: { id },
      data: updateData,
      include: {
        color: true,
      },
    })

    return NextResponse.json({ uninstallTag: updatedTag })
  },
  {
    bodySchema: updateUninstallTagApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar la uninstall tag',
  }
)

/**
 * DELETE /api/uninstall-tags/[id]
 *
 * Elimina (soft delete) una uninstall tag
 *
 * Query params:
 * - force: "true" para hacer hard delete (usar con precaución)
 */
export const DELETE = withApiHandler(
  async (request, _logger, { params }) => {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const existingTag = await prisma.uninstallTag.findUnique({
      where: { id },
    })

    if (!existingTag) {
      throw new BusinessError('Uninstall tag no encontrada', 404)
    }

    if (force) {
      await prisma.uninstallTag.delete({
        where: { id },
      })

      return NextResponse.json({ message: 'Uninstall tag eliminada permanentemente' })
    } else {
      const deletedTag = await prisma.uninstallTag.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: 'Uninstall tag desactivada',
        uninstallTag: deletedTag,
      })
    }
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al eliminar la uninstall tag',
  }
)
