/**
 * Helper para actualizar el balance de un proyecto en la base de datos
 *
 * CUÁNDO USAR:
 * - Después de crear un pago con allocations
 * - Después de editar un pago (cambiar allocations)
 * - Después de eliminar un pago
 * - Después de marcar un installment como pagado
 *
 * ARQUITECTURA:
 * - App Layer: Llama a este helper después de modificar paymentAllocations
 * - Job Layer: Job nocturno de reconciliación detecta/corrige inconsistencias
 */

import { prisma } from '@/lib/db'
import { calculateProjectBalance } from './project-balance'
import { Decimal } from '@prisma/client/runtime/library'

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

  // Comparar con tolerancia de 0.01 por redondeos decimales
  const dbBalance = Number(project.balance)
  return Math.abs(dbBalance - calculatedBalance) < 0.01
}
