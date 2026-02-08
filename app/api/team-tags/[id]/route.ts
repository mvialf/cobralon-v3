import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateTeamTagApiSchema,
  type UpdateTeamTagApiBody,
  generateAbbreviation,
} from '@/lib/validations/team-tag-validations'

/**
 * GET /api/team-tags/[id]
 *
 * Obtiene un team tag específico por ID
 */
export const GET = withApiHandler(
  async (_request, _logger, { params }) => {
    const teamTag = await prisma.teamTag.findUnique({
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

    if (!teamTag) {
      throw new BusinessError('Team tag no encontrado', 404)
    }

    return NextResponse.json({ teamTag })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al obtener el team tag' }
)

/**
 * PUT /api/team-tags/[id]
 *
 * Actualiza un team tag existente
 *
 * Validaciones:
 * - El nombre debe ser único (si se cambia)
 * - La abreviatura debe tener 2 letras mayúsculas
 * - El colorId debe existir (si se cambia)
 */
export const PUT = withApiHandler<UpdateTeamTagApiBody>(
  async (request, _logger, { params, body }) => {
    const { id } = params

    // Auto-generar abbreviation desde nombre si se cambia nombre sin abbreviation
    const updateData = { ...body }
    if (updateData.name && updateData.abbreviation === undefined) {
      updateData.abbreviation = generateAbbreviation(updateData.name)
    }

    const existingTag = await prisma.teamTag.findUnique({
      where: { id },
    })

    if (!existingTag) {
      throw new BusinessError('Team tag no encontrado', 404)
    }

    if (updateData.name && updateData.name !== existingTag.name) {
      const duplicateName = await prisma.teamTag.findUnique({
        where: { name: updateData.name },
      })

      if (duplicateName) {
        throw new BusinessError(`Ya existe un integrante con el nombre "${updateData.name}"`)
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

    const updatedTag = await prisma.teamTag.update({
      where: { id },
      data: updateData,
      include: {
        color: true,
      },
    })

    return NextResponse.json({ teamTag: updatedTag })
  },
  {
    bodySchema: updateTeamTagApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar el team tag',
  }
)

/**
 * DELETE /api/team-tags/[id]
 *
 * Elimina (soft delete) un team tag
 *
 * Query params:
 * - force: "true" para hacer hard delete
 */
export const DELETE = withApiHandler(
  async (request, _logger, { params }) => {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const existingTag = await prisma.teamTag.findUnique({
      where: { id },
    })

    if (!existingTag) {
      throw new BusinessError('Team tag no encontrado', 404)
    }

    if (force) {
      await prisma.teamTag.delete({
        where: { id },
      })

      return NextResponse.json({ message: 'Team tag eliminado permanentemente' })
    } else {
      const deletedTag = await prisma.teamTag.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: 'Team tag desactivado',
        teamTag: deletedTag,
      })
    }
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al eliminar el team tag',
  }
)
