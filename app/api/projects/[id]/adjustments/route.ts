import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createProjectAdjustmentSchema,
  type CreateProjectAdjustmentInput,
} from '@/lib/validations/project-adjustment-validations'
import { updateProjectBalanceWithAdjustments } from '@/lib/business-logic/update-project-balance'

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
 * Recalcula automáticamente el balance del proyecto
 */
export const POST = withApiHandler<CreateProjectAdjustmentInput>(
  async (_request, _logger, { params, body }) => {
    const { amount, reason, reasonId, description, appliedAt } = body

    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        balance: true,
        totalAmount: true,
      },
    })

    if (!project) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    // Validar que el ajuste no haga el balance negativo
    // (a menos que ya sea negativo por sobrepago)
    const currentBalance = Number(project.balance)
    const newBalance = currentBalance - amount

    if (newBalance < -0.01 && currentBalance > 0) {
      throw new BusinessError(
        `El ajuste excede el balance. Máximo ajuste permitido: ${currentBalance.toFixed(2)}`,
        400
      )
    }

    // Crear el ajuste y actualizar el balance en una transacción
    const adjustment = await prisma.$transaction(async (tx) => {
      // 1. Crear el ajuste
      const newAdjustment = await tx.projectAdjustment.create({
        data: {
          projectId: params.id,
          amount: new Decimal(amount),
          reason,
          reasonId: reasonId || null,
          description: description || null,
          appliedAt: appliedAt || new Date(),
        },
      })

      // 2. Actualizar el balance del proyecto
      await updateProjectBalanceWithAdjustments(params.id, tx)

      return newAdjustment
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
