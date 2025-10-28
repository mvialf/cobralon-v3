// lib/transformers/payment-transformers.ts

import type { PaymentFromAPI, PaymentAllocation, SortOrder } from '@/lib/types/payment.types'

/**
 * Extrae las allocations de un proyecto específico desde una lista de pagos
 *
 * Pure function: Sin side effects, determinística, fácilmente testeable
 *
 * @param payments - Lista de pagos con sus allocations
 * @param projectId - ID del proyecto a filtrar
 * @returns Array de PaymentAllocation para el proyecto
 *
 * @example
 * const payments = await fetchPayments()
 * const allocations = extractProjectAllocations(payments, 'project-123')
 * console.log(allocations.length) // 5
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
 * Pure function: No muta el array original
 *
 * @param allocations - Array de allocations a ordenar
 * @param order - Orden: 'asc' (más antiguo primero) o 'desc' (más reciente primero)
 * @returns Nuevo array ordenado
 *
 * @example
 * const sorted = sortAllocationsByDate(allocations, 'asc')
 * // sorted[0] tiene el pago más antiguo
 */
export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: SortOrder = 'asc'
): PaymentAllocation[] {
  // Spread operator crea nuevo array (no mutate)
  return [...allocations].sort((a, b) => {
    const dateA = new Date(a.payment.date).getTime()
    const dateB = new Date(b.payment.date).getTime()
    const diff = dateA - dateB
    return order === 'asc' ? diff : -diff
  })
}

/**
 * Pipeline completo: extrae y ordena en un solo paso
 *
 * Composer function que combina extractProjectAllocations + sortAllocationsByDate
 *
 * @param payments - Lista de pagos
 * @param projectId - ID del proyecto
 * @param order - Orden de sorting (default: 'asc')
 * @returns Array procesado listo para UI
 *
 * @example
 * const allocations = processProjectPayments(payments, 'project-123', 'asc')
 * // Retorna allocations filtradas y ordenadas
 */
export function processProjectPayments(
  payments: PaymentFromAPI[],
  projectId: string,
  order: SortOrder = 'asc'
): PaymentAllocation[] {
  const allocations = extractProjectAllocations(payments, projectId)
  return sortAllocationsByDate(allocations, order)
}
