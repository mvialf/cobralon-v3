import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  adjustmentReasonSchema,
  type AdjustmentReasonFormValues,
} from '@/lib/validations/adjustment-reason-validations'

/**
 * GET /api/adjustment-reasons
 * Lista todas las razones de ajuste ordenadas
 */
export const GET = withApiHandler(
  async () => {
    const reasons = await prisma.adjustmentReason.findMany({
      orderBy: [{ isActive: 'desc' }, { order: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { adjustments: true },
        },
      },
    })

    return NextResponse.json({ adjustmentReasons: reasons })
  },
  { fallbackError: 'Error al obtener las razones de ajuste' }
)

/**
 * POST /api/adjustment-reasons
 * Crea una nueva razón de ajuste
 */
export const POST = withApiHandler<AdjustmentReasonFormValues>(
  async (_request, _logger, { body }) => {
    const { name, warningLevel, isActive } = body

    // Validar nombre único
    const existing = await prisma.adjustmentReason.findUnique({
      where: { name },
    })

    if (existing) {
      throw new BusinessError(`La razón "${name}" ya existe`, 409)
    }

    // Calcular order automático
    const maxOrder = await prisma.adjustmentReason.aggregate({
      _max: { order: true },
    })
    const newOrder = (maxOrder._max.order || 0) + 1

    const reason = await prisma.adjustmentReason.create({
      data: {
        name,
        warningLevel: warningLevel || 'none',
        isActive: isActive ?? true,
        order: newOrder,
      },
      include: {
        _count: {
          select: { adjustments: true },
        },
      },
    })

    return NextResponse.json({ adjustmentReason: reason }, { status: 201 })
  },
  { bodySchema: adjustmentReasonSchema, fallbackError: 'Error al crear la razón de ajuste' }
)
