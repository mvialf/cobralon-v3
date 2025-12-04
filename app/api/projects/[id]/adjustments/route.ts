import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { createProjectAdjustmentSchema } from '@/lib/validations/project-adjustment-validations'
import { updateProjectBalanceWithAdjustments } from '@/lib/business-logic/update-project-balance'

/**
 * GET /api/projects/[id]/adjustments
 *
 * Obtiene todos los ajustes de un proyecto
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Obtener ajustes ordenados por fecha de aplicación
    const adjustments = await prisma.projectAdjustment.findMany({
      where: { projectId: id },
      orderBy: { appliedAt: 'desc' },
    })

    // Convertir Decimal a number para la respuesta JSON
    const formattedAdjustments = adjustments.map((adjustment) => ({
      ...adjustment,
      amount: Number(adjustment.amount),
    }))

    return NextResponse.json(formattedAdjustments)
  } catch (error) {
    console.error('Error fetching project adjustments:', error)
    return NextResponse.json({ error: 'Error al obtener los ajustes' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/adjustments
 *
 * Crea un nuevo ajuste para el proyecto
 * Recalcula automáticamente el balance del proyecto
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validar datos de entrada
    const validationResult = createProjectAdjustmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { amount, reason, description, appliedAt } = validationResult.data

    // Verificar que el proyecto existe
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        balance: true,
        totalAmount: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Validar que el ajuste no haga el balance negativo
    // (a menos que ya sea negativo por sobrepago)
    const currentBalance = Number(project.balance)
    const newBalance = currentBalance - amount

    if (newBalance < -0.01 && currentBalance > 0) {
      // Permitir ajuste máximo hasta dejar balance en 0
      return NextResponse.json(
        {
          error: `El ajuste excede el balance. Máximo ajuste permitido: ${currentBalance.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    // Crear el ajuste y actualizar el balance en una transacción
    const adjustment = await prisma.$transaction(async (tx) => {
      // 1. Crear el ajuste
      const newAdjustment = await tx.projectAdjustment.create({
        data: {
          projectId: id,
          amount: new Decimal(amount),
          reason,
          description: description || null,
          appliedAt: appliedAt || new Date(),
        },
      })

      // 2. Actualizar el balance del proyecto
      await updateProjectBalanceWithAdjustments(id, tx)

      return newAdjustment
    })

    return NextResponse.json(
      {
        ...adjustment,
        amount: Number(adjustment.amount),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating project adjustment:', error)
    return NextResponse.json({ error: 'Error al crear el ajuste' }, { status: 500 })
  }
}
