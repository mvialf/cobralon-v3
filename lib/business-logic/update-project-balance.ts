/**
 * Helper para actualizar el balance de un proyecto en la base de datos
 *
 * CUÁNDO USAR:
 * - Después de crear un pago con allocations
 * - Después de editar un pago (cambiar allocations)
 * - Después de eliminar un pago
 * - Después de marcar un installment como pagado
 * - Después de crear/eliminar un ajuste de proyecto
 *
 * ARQUITECTURA:
 * - App Layer: Llama a este helper después de modificar paymentAllocations o adjustments
 * - Job Layer: Job nocturno de reconciliación detecta/corrige inconsistencias
 */

import { FINANCIAL } from '../constants/financial-constants'

import { prisma } from '@/lib/db'
import { calculateProjectBalance } from './project-balance'
import { Decimal } from '@prisma/client/runtime/library'
import { PrismaClient } from '@prisma/client'

// Type para transacción de Prisma
type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Actualiza el balance de un proyecto en la DB basándose en sus allocations
 *
 * @param projectId - ID del proyecto a actualizar
 * @returns Balance actualizado
 *
 * @example
 * // Después de crear un pago
 * const payment = await prisma.payment.create({ ... })
 * await updateProjectBalance(payment.projectId)
 *
 * @example
 * // Después de eliminar un pago
 * await prisma.payment.delete({ where: { id } })
 * await updateProjectBalance(projectId)
 */
export async function updateProjectBalance(projectId: string): Promise<number> {
  // Fetch project con allocations
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      total: true,
      paymentAllocations: {
        select: {
          allocatedAmount: true,
        },
      },
    },
  })

  if (!project) {
    throw new Error(`Project ${projectId} not found`)
  }

  // Calcular balance usando helper compartido
  const { balance } = calculateProjectBalance({
    totalAmount: Number(project.total),
    allocations: project.paymentAllocations.map((alloc) => ({
      allocatedAmount: Number(alloc.allocatedAmount),
    })),
  })

  // Actualizar en DB
  await prisma.project.update({
    where: { id: projectId },
    data: {
      balance: new Decimal(balance),
    },
  })

  return balance
}

/**
 * Actualiza el balance de múltiples proyectos en batch
 *
 * @param projectIds - Array de IDs de proyectos
 * @returns Número de proyectos actualizados
 *
 * @example
 * // Útil en jobs de reconciliación
 * const projectIds = ['id1', 'id2', 'id3']
 * const updated = await updateMultipleProjectBalances(projectIds)
 * console.log(`${updated} proyectos actualizados`)
 */
export async function updateMultipleProjectBalances(projectIds: string[]): Promise<number> {
  let updated = 0

  for (const projectId of projectIds) {
    try {
      await updateProjectBalance(projectId)
      updated++
    } catch (error) {
      console.error(`Error updating project ${projectId}:`, error)
      // Continuar con el siguiente proyecto
    }
  }

  return updated
}

/**
 * Verifica si el balance de un proyecto es consistente
 *
 * @param projectId - ID del proyecto
 * @returns true si el balance es correcto, false si necesita corrección
 *
 * @example
 * const isConsistent = await verifyProjectBalance(projectId)
 * if (!isConsistent) {
 *   await updateProjectBalance(projectId)
 * }
 */
export async function verifyProjectBalance(projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      total: true,
      balance: true,
      paymentAllocations: {
        select: {
          allocatedAmount: true,
        },
      },
    },
  })

  if (!project) {
    throw new Error(`Project ${projectId} not found`)
  }

  const { balance: calculatedBalance } = calculateProjectBalance({
    totalAmount: Number(project.total),
    allocations: project.paymentAllocations.map((alloc) => ({
      allocatedAmount: Number(alloc.allocatedAmount),
    })),
  })

  // Comparar con tolerancia por redondeos decimales
  const dbBalance = Number(project.balance)
  return Math.abs(dbBalance - calculatedBalance) < FINANCIAL.TOLERANCE
}

/**
 * Actualiza el balance de un proyecto incluyendo ajustes
 *
 * Fórmula: balance = totalAmount - totalPaid - totalAdjustments
 *
 * @param projectId - ID del proyecto a actualizar
 * @param tx - Transacción de Prisma (opcional, usa prisma global si no se proporciona)
 * @returns Balance actualizado
 *
 * @example
 * // Después de crear un ajuste
 * await prisma.$transaction(async (tx) => {
 *   await tx.projectAdjustment.create({ ... })
 *   await updateProjectBalanceWithAdjustments(projectId, tx)
 * })
 */
export async function updateProjectBalanceWithAdjustments(
  projectId: string,
  tx?: PrismaTransaction
): Promise<number> {
  const db = tx || prisma

  // Fetch project con allocations y ajustes
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      total: true,
      totalAmount: true,
      paymentAllocations: {
        select: {
          allocatedAmount: true,
        },
      },
      adjustments: {
        select: {
          amount: true,
        },
      },
    },
  })

  if (!project) {
    throw new Error(`Project ${projectId} not found`)
  }

  // Calcular balance base (sin ajustes)
  const { balance: baseBalance } = calculateProjectBalance({
    totalAmount: Number(project.totalAmount || project.total),
    allocations: project.paymentAllocations.map((alloc) => ({
      allocatedAmount: Number(alloc.allocatedAmount),
    })),
  })

  // Sumar todos los ajustes (los ajustes reducen el balance)
  const totalAdjustments = project.adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0)

  // Calcular balance final: balance base - ajustes
  const finalBalance = baseBalance - totalAdjustments

  // Actualizar en DB
  await db.project.update({
    where: { id: projectId },
    data: {
      balance: new Decimal(finalBalance),
    },
  })

  return finalBalance
}
