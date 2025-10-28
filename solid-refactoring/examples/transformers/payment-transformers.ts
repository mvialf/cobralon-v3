/**
 * Payment Transformers
 *
 * Colección de pure functions para transformar datos de pagos.
 *
 * Características:
 * - ✅ Pure functions (sin side effects)
 * - ✅ Inmutables (no modifican input, retornan nuevo valor)
 * - ✅ Testeable al 100% (sin mocks necesarios)
 * - ✅ Composables (unas funciones usan otras)
 * - ✅ Type-safe (TypeScript strict mode)
 *
 * Principios SOLID:
 * - SRP: Cada función tiene UNA responsabilidad
 * - OCP: Extensible (agregar funciones) sin modificar existentes
 * - DIP: No depende de abstracciones externas
 */

import type {
  PaymentFromAPI,
  AllocationFromAPI,
  PaymentAllocation,
} from '@/lib/types/payment.types'

// ============================================================================
// Core Transformers
// ============================================================================

/**
 * Extrae allocations de un proyecto específico desde un array de pagos
 *
 * Transforma:
 * PaymentFromAPI[] → PaymentAllocation[]
 *
 * Lógica:
 * 1. Filtra allocations que pertenecen al proyecto
 * 2. Mapea a estructura PaymentAllocation (denormalizada)
 *
 * @param payments Array de pagos desde API
 * @param projectId ID del proyecto a filtrar
 * @returns Array de allocations del proyecto con info del payment
 *
 * @example
 * const payments = [
 *   { id: 'p1', allocations: [{ project: { id: 'proj-1' }, amount: 100 }] },
 *   { id: 'p2', allocations: [{ project: { id: 'proj-2' }, amount: 200 }] }
 * ]
 * const result = extractProjectAllocations(payments, 'proj-1')
 * // result.length === 1
 * // result[0].allocatedAmount === 100
 */
export function extractProjectAllocations(
  payments: PaymentFromAPI[],
  projectId: string
): PaymentAllocation[] {
  return payments.flatMap((payment) =>
    payment.allocations
      .filter((alloc) => alloc.project.id === projectId)
      .map((alloc) => mapToPaymentAllocation(payment, alloc))
  )
}

/**
 * Mapea PaymentFromAPI + AllocationFromAPI → PaymentAllocation
 *
 * Helper function para extractProjectAllocations.
 * Denormaliza la estructura para facilitar rendering.
 *
 * @internal
 */
function mapToPaymentAllocation(
  payment: PaymentFromAPI,
  allocation: AllocationFromAPI
): PaymentAllocation {
  return {
    id: allocation.id,
    allocatedAmount: allocation.allocatedAmount,
    payment: {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      date: payment.date,
      type: payment.type,
      notes: payment.notes,
      paymentMethod: {
        id: payment.paymentMethod.id,
        name: payment.paymentMethod.name,
        icon: payment.paymentMethod.icon,
      },
      customer: {
        id: payment.customer.id,
        name: payment.customer.name,
      },
    },
  }
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Ordena allocations por fecha del payment
 *
 * @param allocations Array a ordenar
 * @param order 'asc' (más antiguo primero) o 'desc' (más reciente primero)
 * @returns Nuevo array ordenado (no modifica original)
 *
 * @example
 * const allocations = [
 *   { payment: { date: '2025-01-15' } },
 *   { payment: { date: '2025-01-10' } }
 * ]
 * const sorted = sortAllocationsByDate(allocations, 'asc')
 * // sorted[0].payment.date === '2025-01-10'
 */
export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[] {
  // ✅ Inmutable: Copia el array antes de ordenar
  return [...allocations].sort((a, b) => {
    const dateA = new Date(a.payment.date).getTime()
    const dateB = new Date(b.payment.date).getTime()
    const diff = dateA - dateB
    return order === 'asc' ? diff : -diff
  })
}

/**
 * Ordena allocations por monto asignado
 *
 * @param allocations Array a ordenar
 * @param order 'asc' (menor a mayor) o 'desc' (mayor a menor)
 * @returns Nuevo array ordenado
 *
 * @example
 * const allocations = [
 *   { allocatedAmount: 500 },
 *   { allocatedAmount: 100 }
 * ]
 * const sorted = sortAllocationsByAmount(allocations, 'desc')
 * // sorted[0].allocatedAmount === 500
 */
export function sortAllocationsByAmount(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[] {
  return [...allocations].sort((a, b) => {
    const diff = a.allocatedAmount - b.allocatedAmount
    return order === 'asc' ? diff : -diff
  })
}

/**
 * Ordena allocations por nombre del cliente
 *
 * @param allocations Array a ordenar
 * @param order 'asc' (A-Z) o 'desc' (Z-A)
 * @returns Nuevo array ordenado
 */
export function sortAllocationsByCustomerName(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[] {
  return [...allocations].sort((a, b) => {
    const nameA = a.payment.customer.name.toLowerCase()
    const nameB = b.payment.customer.name.toLowerCase()
    const comparison = nameA.localeCompare(nameB)
    return order === 'asc' ? comparison : -comparison
  })
}

// ============================================================================
// Filtering Functions
// ============================================================================

/**
 * Filtra allocations por tipo de pago
 *
 * @param allocations Array a filtrar
 * @param type 'Project' (pago directo) o 'Customer' (pago global)
 * @returns Allocations del tipo especificado
 *
 * @example
 * const allocations = [
 *   { payment: { type: 'Project' } },
 *   { payment: { type: 'Customer' } }
 * ]
 * const projectPayments = filterByPaymentType(allocations, 'Project')
 * // projectPayments.length === 1
 */
export function filterByPaymentType(
  allocations: PaymentAllocation[],
  type: 'Project' | 'Customer'
): PaymentAllocation[] {
  return allocations.filter((alloc) => alloc.payment.type === type)
}

/**
 * Filtra allocations por método de pago
 *
 * @param allocations Array a filtrar
 * @param paymentMethodId ID del método de pago
 * @returns Allocations con ese método de pago
 */
export function filterByPaymentMethod(
  allocations: PaymentAllocation[],
  paymentMethodId: string
): PaymentAllocation[] {
  return allocations.filter((alloc) => alloc.payment.paymentMethod.id === paymentMethodId)
}

/**
 * Filtra allocations por rango de fechas
 *
 * @param allocations Array a filtrar
 * @param startDate Fecha inicial (inclusive)
 * @param endDate Fecha final (inclusive)
 * @returns Allocations en el rango especificado
 *
 * @example
 * const allocations = [...]
 * const filtered = filterByDateRange(
 *   allocations,
 *   '2025-01-01',
 *   '2025-01-31'
 * )
 * // Solo pagos de enero 2025
 */
export function filterByDateRange(
  allocations: PaymentAllocation[],
  startDate: string,
  endDate: string
): PaymentAllocation[] {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()

  return allocations.filter((alloc) => {
    const date = new Date(alloc.payment.date).getTime()
    return date >= start && date <= end
  })
}

/**
 * Filtra allocations por monto mínimo
 *
 * @param allocations Array a filtrar
 * @param minAmount Monto mínimo (inclusive)
 * @returns Allocations con monto >= minAmount
 */
export function filterByMinAmount(
  allocations: PaymentAllocation[],
  minAmount: number
): PaymentAllocation[] {
  return allocations.filter((alloc) => alloc.allocatedAmount >= minAmount)
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Calcula el total de montos asignados
 *
 * @param allocations Array de allocations
 * @returns Suma total de allocatedAmount
 *
 * @example
 * const allocations = [
 *   { allocatedAmount: 100 },
 *   { allocatedAmount: 200 }
 * ]
 * const total = calculateTotalAllocated(allocations)
 * // total === 300
 */
export function calculateTotalAllocated(allocations: PaymentAllocation[]): number {
  return allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0)
}

/**
 * Agrupa allocations por mes del payment
 *
 * @param allocations Array a agrupar
 * @returns Map donde key = 'YYYY-MM' y value = allocations de ese mes
 *
 * @example
 * const allocations = [
 *   { payment: { date: '2025-01-15' } },
 *   { payment: { date: '2025-01-20' } },
 *   { payment: { date: '2025-02-10' } }
 * ]
 * const grouped = groupAllocationsByMonth(allocations)
 * // grouped.get('2025-01').length === 2
 * // grouped.get('2025-02').length === 1
 */
export function groupAllocationsByMonth(
  allocations: PaymentAllocation[]
): Map<string, PaymentAllocation[]> {
  const grouped = new Map<string, PaymentAllocation[]>()

  allocations.forEach((alloc) => {
    const date = new Date(alloc.payment.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, [])
    }
    grouped.get(monthKey)!.push(alloc)
  })

  return grouped
}

/**
 * Agrupa allocations por método de pago
 *
 * @param allocations Array a agrupar
 * @returns Map donde key = payment method name y value = allocations
 */
export function groupAllocationsByPaymentMethod(
  allocations: PaymentAllocation[]
): Map<string, PaymentAllocation[]> {
  const grouped = new Map<string, PaymentAllocation[]>()

  allocations.forEach((alloc) => {
    const methodName = alloc.payment.paymentMethod.name

    if (!grouped.has(methodName)) {
      grouped.set(methodName, [])
    }
    grouped.get(methodName)!.push(alloc)
  })

  return grouped
}

/**
 * Obtiene estadísticas de allocations
 *
 * @param allocations Array a analizar
 * @returns Objeto con estadísticas agregadas
 *
 * @example
 * const stats = getAllocationStatistics(allocations)
 * // {
 * //   count: 10,
 * //   totalAmount: 5000,
 * //   averageAmount: 500,
 * //   minAmount: 100,
 * //   maxAmount: 1000,
 * //   projectPayments: 7,
 * //   customerPayments: 3
 * // }
 */
export function getAllocationStatistics(allocations: PaymentAllocation[]): {
  count: number
  totalAmount: number
  averageAmount: number
  minAmount: number
  maxAmount: number
  projectPayments: number
  customerPayments: number
} {
  if (allocations.length === 0) {
    return {
      count: 0,
      totalAmount: 0,
      averageAmount: 0,
      minAmount: 0,
      maxAmount: 0,
      projectPayments: 0,
      customerPayments: 0,
    }
  }

  const amounts = allocations.map((a) => a.allocatedAmount)
  const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)

  return {
    count: allocations.length,
    totalAmount,
    averageAmount: totalAmount / allocations.length,
    minAmount: Math.min(...amounts),
    maxAmount: Math.max(...amounts),
    projectPayments: filterByPaymentType(allocations, 'Project').length,
    customerPayments: filterByPaymentType(allocations, 'Customer').length,
  }
}

// ============================================================================
// Composition Functions (High-Order Functions)
// ============================================================================

/**
 * Aplica múltiples transformaciones en pipeline
 *
 * @param allocations Array inicial
 * @param transformers Array de funciones de transformación
 * @returns Resultado de aplicar todas las transformaciones
 *
 * @example
 * const result = pipeTransformers(allocations, [
 *   (data) => filterByPaymentType(data, 'Project'),
 *   (data) => sortAllocationsByDate(data, 'desc'),
 *   (data) => data.slice(0, 10)
 * ])
 * // Resultado: 10 pagos directos más recientes
 */
export function pipeTransformers(
  allocations: PaymentAllocation[],
  transformers: Array<(data: PaymentAllocation[]) => PaymentAllocation[]>
): PaymentAllocation[] {
  return transformers.reduce((acc, transformer) => transformer(acc), allocations)
}

/**
 * Crea una función de ordenamiento custom
 *
 * @param compareFn Función de comparación custom
 * @param order Orden ascendente o descendente
 * @returns Función de ordenamiento lista para usar
 *
 * @example
 * const sortByCustomerAndDate = createSorter(
 *   (a, b) => {
 *     const customerCompare = a.payment.customer.name.localeCompare(
 *       b.payment.customer.name
 *     )
 *     if (customerCompare !== 0) return customerCompare
 *
 *     return new Date(a.payment.date).getTime() - new Date(b.payment.date).getTime()
 *   },
 *   'asc'
 * )
 * const sorted = sortByCustomerAndDate(allocations)
 */
export function createSorter(
  compareFn: (a: PaymentAllocation, b: PaymentAllocation) => number,
  order: 'asc' | 'desc' = 'asc'
): (allocations: PaymentAllocation[]) => PaymentAllocation[] {
  return (allocations) => {
    return [...allocations].sort((a, b) => {
      const result = compareFn(a, b)
      return order === 'asc' ? result : -result
    })
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Verifica si un allocation es un pago dividido (tipo Customer)
 *
 * @param allocation Allocation a verificar
 * @returns true si es de tipo Customer
 */
export function isSplitPayment(allocation: PaymentAllocation): boolean {
  return allocation.payment.type === 'Customer'
}

/**
 * Verifica si un allocation tiene notas
 *
 * @param allocation Allocation a verificar
 * @returns true si tiene notas
 */
export function hasNotes(allocation: PaymentAllocation): boolean {
  return allocation.payment.notes !== null && allocation.payment.notes.trim() !== ''
}

/**
 * Obtiene un array con los IDs únicos de pagos
 *
 * @param allocations Array de allocations
 * @returns Array de payment IDs únicos
 */
export function getUniquePaymentIds(allocations: PaymentAllocation[]): string[] {
  return Array.from(new Set(allocations.map((a) => a.payment.id)))
}

/**
 * Cuenta cuántos pagos únicos existen en las allocations
 *
 * @param allocations Array de allocations
 * @returns Número de pagos únicos
 */
export function countUniquePayments(allocations: PaymentAllocation[]): number {
  return getUniquePaymentIds(allocations).length
}

// ============================================================================
// Export conveniente
// ============================================================================

/**
 * Objeto con todos los transformers para importación conveniente
 *
 * @example
 * import { PaymentTransformers } from '@/lib/transformers/payment-transformers'
 *
 * const allocations = PaymentTransformers.extractProjectAllocations(...)
 * const sorted = PaymentTransformers.sortAllocationsByDate(allocations, 'desc')
 */
export const PaymentTransformers = {
  // Core
  extractProjectAllocations,

  // Sorting
  sortAllocationsByDate,
  sortAllocationsByAmount,
  sortAllocationsByCustomerName,

  // Filtering
  filterByPaymentType,
  filterByPaymentMethod,
  filterByDateRange,
  filterByMinAmount,

  // Aggregation
  calculateTotalAllocated,
  groupAllocationsByMonth,
  groupAllocationsByPaymentMethod,
  getAllocationStatistics,

  // Composition
  pipeTransformers,
  createSorter,

  // Utilities
  isSplitPayment,
  hasNotes,
  getUniquePaymentIds,
  countUniquePayments,
}
