import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateStatusApiSchema,
  type UpdateStatusApiBody,
} from '@/lib/validations/base-status-validations'

/**
 * PUT /api/visit-status/[id]
 *
 * Actualiza un estado de visita existente
 *
 * Validaciones:
 * - Si se marca isInitial=true, se desmarca el estado inicial anterior
 * - Si se marca isFinal=true, se desmarca el estado final anterior
 * - El nombre debe ser único (si se cambia)
 */
export const PUT = withApiHandler<UpdateStatusApiBody>(
  async (_request, _logger, { params, body }) => {
    const { id } = params

    // Verificar que el estado existe
    const existingStatus = await prisma.visitStatus.findUnique({
      where: { id },
    })

    if (!existingStatus) {
      throw new BusinessError('Estado no encontrado', 404)
    }

    // Validación: nombre único (si se está cambiando)
    if (body.name && body.name !== existingStatus.name) {
      const duplicateName = await prisma.visitStatus.findUnique({
        where: { name: body.name },
      })

      if (duplicateName) {
        throw new BusinessError(`Ya existe un estado con el nombre "${body.name}"`)
      }
    }

    // Validación: colorId existe (si se está cambiando)
    if (body.colorId) {
      const colorExists = await prisma.badgeColor.findUnique({
        where: { id: body.colorId },
      })

      if (!colorExists) {
        throw new BusinessError('El color seleccionado no existe')
      }
    }

    // Si se marca como inicial, desmarcar el anterior
    if (body.isInitial === true && !existingStatus.isInitial) {
      await prisma.visitStatus.updateMany({
        where: { isInitial: true, isActive: true },
        data: { isInitial: false },
      })
    }

    // Si se marca como final, desmarcar el anterior
    if (body.isFinal === true && !existingStatus.isFinal) {
      await prisma.visitStatus.updateMany({
        where: { isFinal: true, isActive: true },
        data: { isFinal: false },
      })
    }

    // Calcular order automáticamente si cambia el tipo de estado
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
        const maxNormalOrder = await prisma.visitStatus.findFirst({
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

    const updatedStatus = await prisma.visitStatus.update({
      where: { id },
      data: updateData,
      include: {
        color: true,
        _count: {
          select: { visits: true },
        },
      },
    })

    return NextResponse.json({ visitStatus: updatedStatus })
  },
  {
    bodySchema: updateStatusApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar el estado de visita',
  }
)

/**
 * DELETE /api/visit-status/[id]
 *
 * Elimina (soft delete) un estado de visita
 *
 * Validaciones:
 * - No se puede eliminar un estado que tiene visitas asignadas
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

    const existingStatus = await prisma.visitStatus.findUnique({
      where: { id },
      include: {
        _count: {
          select: { visits: true },
        },
      },
    })

    if (!existingStatus) {
      throw new BusinessError('Estado no encontrado', 404)
    }

    if (existingStatus._count.visits > 0) {
      throw new BusinessError(
        `No se puede eliminar el estado "${existingStatus.name}" porque tiene ${existingStatus._count.visits} visita(s) asignada(s)`
      )
    }

    if (existingStatus.isInitial && existingStatus.isActive) {
      const otherInitialActive = await prisma.visitStatus.findFirst({
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
      const otherFinalActive = await prisma.visitStatus.findFirst({
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
      await prisma.visitStatus.delete({
        where: { id },
      })

      return NextResponse.json({ message: 'Estado eliminado permanentemente' })
    } else {
      const deletedStatus = await prisma.visitStatus.update({
        where: { id },
        data: { isActive: false },
      })

      return NextResponse.json({
        message: 'Estado desactivado',
        visitStatus: deletedStatus,
      })
    }
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al eliminar el estado de visita',
  }
)
