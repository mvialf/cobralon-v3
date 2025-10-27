/**
 * Payment Transformers - Pure functions para transformar datos de pagos
 *
 * Estas funciones son:
 * - Pure (sin side effects)
 * - Testables (sin mocks necesarios)
 * - Reutilizables (server Y client)
 * - Composables (se pueden combinar)
 */

import type {
  PaymentFromAPI,
  PaymentAllocation,
  SortOrder,
} from '@/lib/types/payment.types'

/**
 * Extrae las allocations de un proyecto específico desde una lista de pagos
 *
 * Toma un array de pagos (cada uno con múltiples allocations) y filtra
 * solo las allocations que pertenecen al proyecto especificado.
 *
 * @param payments - Lista de pagos con sus allocations
 * @param projectId - ID del proyecto a filtrar
 * @returns Array de PaymentAllocation para el proyecto (aplanado)
 *
 * @example
 * ```ts
 * const payments = [...] // PaymentFromAPI[]
 * const allocations = extractProjectAllocations(payments, 'project-123')
 * // allocations: PaymentAllocation[]
 * ```
 */
export function extractProjectAllocations(
  payments: PaymentFromAPI[],
  projectId: string
): PaymentAllocation[] {
  return payments.flatMap((payment) =>
    payment.allocations
      .filter((alloc) => alloc.project.id === projectId)
      .map((alloc) => ({
        id: alloc.id,
        allocatedAmount: alloc.allocatedAmount,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          date: payment.date,
          type: payment.type,
          notes: payment.notes,
          paymentMethod: payment.paymentMethod,
          customer: payment.customer,
        },
      }))
  )
}

/**
 * Ordena allocations por fecha de pago
 *
 * @param allocations - Array de allocations a ordenar
 * @param order - Orden: 'asc' (más antiguo primero) o 'desc' (más reciente primero)
 * @returns Nuevo array ordenado (no muta el original)
 *
 * @example
 * ```ts
 * const sorted = sortAllocationsByDate(allocations, 'asc')
 * // Cronológico: pagos más antiguos primero
 * ```
 */
export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: SortOrder = 'asc'
): PaymentAllocation[] {
  return [...allocations].sort((a, b) => {
    const dateA = new Date(a.payment.date).getTime()
    const dateB = new Date(b.payment.date).getTime()
    const diff = dateA - dateB
    return order === 'asc' ? diff : -diff
  })
}

/**
 * Pipeline completo: extrae allocations de un proyecto y las ordena
 *
 * Esta es una función "composer" que combina extracción + sorting
 * en un solo paso. Útil cuando siempre necesitas ambas operaciones.
 *
 * @param payments - Lista de pagos
 * @param projectId - ID del proyecto
 * @param order - Orden de sorting (default: 'asc')
 * @returns Array procesado listo para UI
 *
 * @example
 * ```ts
 * const allocations = processProjectPayments(payments, 'project-123', 'asc')
 * // Lista filtrada y ordenada en un solo paso
 * ```
 */
export function processProjectPayments(
  payments: PaymentFromAPI[],
  projectId: string,
  order: SortOrder = 'asc'
): PaymentAllocation[] {
  const allocations = extractProjectAllocations(payments, projectId)
  return sortAllocationsByDate(allocations, order)
}
