import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createProjectAdjustmentSchema,
  type CreateProjectAdjustmentInput,
} from '@/lib/validations/project-adjustment-validations'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'

/**
 * GET /api/projects/[id]/adjustments
 *
 * Obtiene todos los ajustes de un proyecto
 */
export const GET = withApiHandler(
  async (_request, _logger, { params }) => {
    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!project) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    // Obtener ajustes ordenados por fecha de aplicación
    const adjustments = await prisma.projectAdjustment.findMany({
      where: { projectId: params.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        adjustmentReason: {
          select: { name: true, warningLevel: true },
        },
      },
    })

    // Convertir Decimal a number para la respuesta JSON
    const formattedAdjustments = adjustments.map((adjustment) => ({
      ...adjustment,
      amount: Number(adjustment.amount),
    }))

    return NextResponse.json(formattedAdjustments)
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al obtener los ajustes',
  }
)

/**
 * POST /api/projects/[id]/adjustments
 *
 * Crea un nuevo ajuste para el proyecto
 */
export const POST = withApiHandler<CreateProjectAdjustmentInput>(
  async (_request, _logger, { params, body }) => {
    const { amount, reason, reasonId, description, appliedAt } = body

    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        customerId: true,
      },
    })

    if (!project) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      const financials = await getProjectFinancials(params.id, tx)
      if (!financials) {
        throw new BusinessError('Proyecto no encontrado', 404)
      }

      if (amount - financials.balance > 0.01) {
        throw new BusinessError(
          `El ajuste excede el balance. Máximo ajuste permitido: ${financials.balance.toFixed(2)}`,
          400
        )
      }

      const adjustment = await tx.projectAdjustment.create({
        data: {
          projectId: params.id,
          amount: new Decimal(amount),
          reason,
          reasonId: reasonId || null,
          description: description || null,
          appliedAt: appliedAt || new Date(),
        },
      })

      await tx.projectApplication.create({
        data: {
          projectId: params.id,
          customerId: project.customerId,
          amount: new Decimal(amount),
          sourceType: 'ADJUSTMENT',
          projectAdjustmentId: adjustment.id,
          createdAt: adjustment.createdAt,
        },
      })

      return adjustment
    })

    return NextResponse.json(
      {
        ...adjustment,
        amount: Number(adjustment.amount),
      },
      { status: 201 }
    )
  },
  {
    bodySchema: createProjectAdjustmentSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al crear el ajuste',
  }
)
