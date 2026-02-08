import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateStatusApiSchema,
  type UpdateStatusApiBody,
} from '@/lib/validations/base-status-validations'

/**
 * PUT /api/aftersale-status/[id]
 *
 * Actualiza un estado de postventa existente
 *
 * Validaciones:
 * - Si se marca isInitial=true, se desmarca el estado inicial anterior
 * - Si se marca isFinal=true, se desmarca el estado final anterior
 * - El nombre debe ser único (si se cambia)
 */
export const PUT = withApiHandler<UpdateStatusApiBody>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    const existingStatus = await prisma.aftersaleStatus.findUnique({
      where: { id },
    })

    if (!existingStatus) {
      throw new BusinessError('Estado no encontrado', 404)
    }

    if (body.name && body.name !== existingStatus.name) {
      const duplicateName = await prisma.aftersaleStatus.findUnique({
        where: { name: body.name },
      })

      if (duplicateName) {
        throw new BusinessError(`Ya existe un estado con el nombre "${body.name}"`)
      }
    }

    if (body.colorId) {
      const colorExists = await prisma.badgeColor.findUnique({
        where: { id: body.colorId },
      })

      if (!colorExists) {
        throw new BusinessError('El color seleccionado no existe')
      }
    }

    if (body.isInitial === true && !existingStatus.isInitial) {
      await prisma.aftersaleStatus.updateMany({
        where: { isInitial: true, isActive: true },
        data: { isInitial: false },
      })
    }

    if (body.isFinal === true && !existingStatus.isFinal) {
      await prisma.aftersaleStatus.updateMany({
        where: { isFinal: true, isActive: true },
        data: { isFinal: false },
      })
    }

    const updateData = { ...body }
    if (body.isInitial !== undefined || body.isFinal !== undefined) {
      const newIsInitial = body.isInitial ?? existingStatus.isInitial
      const newIsFinal = body.isFinal ?? existingStatus.isFinal

      if (newIsInitial && !existingStatus.isInitial) {
        updateData.order = 0
      } else if (newIsFinal && !existingStatus.isFinal) {
        updateData.order = 999
      } else if (
        !newIsInitial &&
        !newIsFinal &&
        (existingStatus.isInitial || existingStatus.isFinal)
      ) {
        const maxNormalOrder = await prisma.aftersaleStatus.findFirst({
          where: {
            isInitial: false,
            isFinal: false,
            order: { lt: 999 },
          },
          orderBy: { order: 'desc' },
          select: { order: true },
        })
        updateData.order = maxNormalOrder ? maxNormalOrder.order + 10 : 10
      }
    }

    const updatedStatus = await prisma.aftersaleStatus.update({
      where: { id },
      data: updateData,
      include: {
        color: true,
        _count: {
          select: { aftersales: true },
        },
      },
    })

    return NextResponse.json({ aftersaleStatus: updatedStatus })
  },
  {
    bodySchema: updateStatusApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar el estado de postventa',
  }
)

/**
 * DELETE /api/aftersale-status/[id]
 *
 * Elimina (soft delete) un estado de postventa
 *
 * Validaciones:
 * - No se puede eliminar un estado que tiene casos de postventa asignados
 * - No se puede eliminar el estado inicial (debe haber siempre uno activo)
 * - No se puede eliminar el estado final (debe haber siempre uno activo)
 *
 * Query params:
 * - force: "true" para hacer hard delete
 */
export const DELETE = withApiHandler(
  async (request, _logger, { params }) => {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const existingStatus = await prisma.aftersaleStatus.findUnique({
      where: { id },
      include: {
        _count: {
          select: { aftersales: true },
        },
      },
    })

    if (!existingStatus) {
      throw new BusinessError('Estado no encontrado', 404)
    }

    if (existingStatus._count.aftersales > 0) {
      throw new BusinessError(
        `No se puede eliminar el estado "${existingStatus.name}" porque tiene ${existingStatus._count.aftersales} caso(s) de postventa asignado(s)`
      )
    }

    if (existingStatus.isInitial && existingStatus.isActive) {
      const otherInitialActive = await prisma.aftersaleStatus.findFirst({
        where: {
          id: { not: id },
          isInitial: true,
          isActive: true,
        },
      })

      if (!otherInitialActive) {
        throw new BusinessError(
          'No se puede eliminar el estado inicial. Debe haber al menos un estado inicial activo.'
        )
      }
    }

    if (existingStatus.isFinal && existingStatus.isActive) {
      const otherFinalActive = await prisma.aftersaleStatus.findFirst({
        where: {
          id: { not: id },
          isFinal: true,
          isActive: true,
        },
      })

      if (!otherFinalActive) {
        throw new BusinessError(
          'No se puede eliminar el estado final. Debe haber al menos un estado final activo.'
        )
      }
    }

    if (force) {
      await prisma.aftersaleStatus.delete({
        where: { id },
      })

      return NextResponse.json({ message: 'Estado eliminado permanentemente' })
    } else {
      const deletedStatus = await prisma.aftersaleStatus.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: 'Estado desactivado',
        aftersaleStatus: deletedStatus,
      })
    }
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al eliminar el estado de postventa',
  }
)
