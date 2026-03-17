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
import type { PrismaTransaction } from '@/lib/db/types'

export type { PrismaTransaction } from '@/lib/db/types'

/**
 * Lógica interna compartida para actualizar balance de proyecto
 *
 * @param projectId - ID del proyecto
 * @param includeAdjustments - Si true, resta ajustes del balance
 * @param tx - Transacción de Prisma opcional
 */
async function _updateBalanceInternal(
  projectId: string,
  includeAdjustments: boolean,
  tx?: PrismaTransaction
): Promise<number> {
  const db = tx || prisma

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      totalAmount: true,
      paymentAllocations: {
        select: { allocatedAmount: true },
      },
      ...(includeAdjustments && {
        adjustments: {
          select: { amount: true },
        },
      }),
    },
  })

  if (!project) {
    throw new Error(`Project ${projectId} not found`)
  }

  const { balance: baseBalance } = calculateProjectBalance({
    totalAmount: Number(project.totalAmount),
    allocations: project.paymentAllocations.map((alloc) => ({
      allocatedAmount: Number(alloc.allocatedAmount),
    })),
  })

  const totalAdjustments = includeAdjustments
    ? (((project as Record<string, unknown>).adjustments as Array<{ amount: unknown }>)?.reduce(
        (sum, adj) => sum + Number(adj.amount),
        0
      ) ?? 0)
    : 0

  const finalBalance = baseBalance - totalAdjustments

  await db.project.update({
    where: { id: projectId },
    data: { balance: new Decimal(finalBalance) },
  })

  return finalBalance
}

/**
 * Actualiza el balance de un proyecto en la DB basándose en sus allocations
 *
 * @param projectId - ID del proyecto a actualizar
 * @param tx - Transacción de Prisma (opcional, usa prisma global si no se proporciona)
 * @returns Balance actualizado
 */
export async function updateProjectBalance(
  projectId: string,
  tx?: PrismaTransaction
): Promise<number> {
  return _updateBalanceInternal(projectId, false, tx)
}

/**
 * Actualiza el balance de múltiples proyectos en batch
 *
 * @param projectIds - Array de IDs de proyectos
 * @param tx - Transacción de Prisma (opcional, usa prisma global si no se proporciona)
 * @returns Número de proyectos actualizados
 *
 * @example
 * // Útil en jobs de reconciliación (sin transacción)
 * const projectIds = ['id1', 'id2', 'id3']
 * const updated = await updateMultipleProjectBalances(projectIds)
 * console.log(`${updated} proyectos actualizados`)
 *
 * @example
 * // Dentro de una transacción (recomendado para atomicidad)
 * await prisma.$transaction(async (tx) => {
 *   await tx.payment.create({ ... })
 *   await updateMultipleProjectBalances(projectIds, tx)
 * })
 */
export async function updateMultipleProjectBalances(
  projectIds: string[],
  tx?: PrismaTransaction
): Promise<number> {
  for (const projectId of projectIds) {
    await updateProjectBalance(projectId, tx)
  }

  return projectIds.length
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
      totalAmount: true,
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
    totalAmount: Number(project.totalAmount),
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
 */
export async function updateProjectBalanceWithAdjustments(
  projectId: string,
  tx?: PrismaTransaction
): Promise<number> {
  return _updateBalanceInternal(projectId, true, tx)
}
