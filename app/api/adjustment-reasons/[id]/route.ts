import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  adjustmentReasonSchema,
  type AdjustmentReasonFormValues,
} from '@/lib/validations/adjustment-reason-validations'

/**
 * PUT /api/adjustment-reasons/[id]
 * Actualiza una razón de ajuste
 */
export const PUT = withApiHandler<AdjustmentReasonFormValues>(
  async (_request, _logger, { params, body }) => {
    const { id } = params
    const { name, warningLevel, isActive } = body

    const existing = await prisma.adjustmentReason.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new BusinessError('Razón de ajuste no encontrada', 404)
    }

    // Validar nombre único (si cambió)
    if (name !== existing.name) {
      const duplicate = await prisma.adjustmentReason.findUnique({
        where: { name },
      })
      if (duplicate) {
        throw new BusinessError(`La razón "${name}" ya existe`, 409)
      }
    }

    const updated = await prisma.adjustmentReason.update({
      where: { id },
      data: { name, warningLevel, isActive },
      include: {
        _count: {
          select: { adjustments: true },
        },
      },
    })

    return NextResponse.json({ adjustmentReason: updated })
  },
  {
    bodySchema: adjustmentReasonSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar la razón de ajuste',
  }
)

/**
 * DELETE /api/adjustment-reasons/[id]
 * Elimina una razón de ajuste (solo si no tiene ajustes asociados)
 */
export const DELETE = withApiHandler(
  async (_request, _logger, { params }) => {
    const { id } = params

    const reason = await prisma.adjustmentReason.findUnique({
      where: { id },
      include: {
        _count: {
          select: { adjustments: true },
        },
      },
    })

    if (!reason) {
      throw new BusinessError('Razón de ajuste no encontrada', 404)
    }

    if (reason._count.adjustments > 0) {
      throw new BusinessError(
        `No se puede eliminar "${reason.name}" porque tiene ${reason._count.adjustments} ajuste(s) asociado(s)`,
        409
      )
    }

    await prisma.adjustmentReason.delete({
      where: { id },
    })

    return NextResponse.json({
      message: `La razón "${reason.name}" se eliminó correctamente`,
    })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar la razón de ajuste' }
)
