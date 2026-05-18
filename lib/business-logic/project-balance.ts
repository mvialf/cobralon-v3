/**
 * Lógica de negocio legacy para cálculo de balance de proyectos
 *
 * Contiene funciones críticas para calcular:
 * - Balance individual legacy de proyecto (totalPaid, balance, percentPaid)
 * - Balance total pendiente de múltiples proyectos
 *
 * @module business-logic/project-balance
 */

/**
 * Type para proyecto con allocations
 */
export interface ProjectWithAllocations {
  totalAmount: number
  allocations?: Array<{ allocatedAmount: number }>
}

/**
 * Type para resultado de cálculo de balance
 */
export interface ProjectBalanceResult {
  totalPaid: number
  balance: number
  percentPaid: number
  isFullyPaid: boolean
}

/**
 * Calcula el balance de un proyecto considerando solo allocations.
 *
 * No considera ajustes ni crédito aplicado desde ProjectApplication. Para
 * balances financieros runtime usar ProjectFinancials.
 *
 * Determina el estado legacy de un proyecto basándose en:
 * - Monto total del proyecto (contract amount)
 * - Suma de pagos asignados (allocations)
 *
 * @param project - Proyecto con totalAmount y allocations
 * @returns Objeto con totalPaid, balance, percentPaid, isFullyPaid
 *
 * @example
 * ```ts
 * // Proyecto de $1,000,000 con 3 pagos
 * const result = calculateProjectBalanceWithoutAdjustments({
 *   totalAmount: 1000000,
 *   allocations: [
 *     { allocatedAmount: 300000 },
 *     { allocatedAmount: 250000 },
 *     { allocatedAmount: 150000 }
 *   ]
 * })
 *
 * // Resultado:
 * // {
 * //   totalPaid: 700000,      // Suma de allocations
 * //   balance: 300000,        // $1M - $700k
 * //   percentPaid: 70,        // 70% pagado
 * //   isFullyPaid: false      // Aún falta $300k
 * // }
 * ```
 *
 * @example Edge cases
 * ```ts
 * // Caso 1: Proyecto sin monto total
 * calculateProjectBalanceWithoutAdjustments({ totalAmount: null, allocations: [] })
 * // => { totalPaid: 0, balance: 0, percentPaid: 0, isFullyPaid: true }
 *
 * // Caso 2: Sobrepago
 * calculateProjectBalanceWithoutAdjustments({
 *   totalAmount: 1000,
 *   allocations: [{ allocatedAmount: 1200 }]
 * })
 * // => { totalPaid: 1200, balance: -200, percentPaid: 120, isFullyPaid: true }
 *
 * // Caso 3: Sin allocations
 * calculateProjectBalanceWithoutAdjustments({ totalAmount: 1000, allocations: undefined })
 * // => { totalPaid: 0, balance: 1000, percentPaid: 0, isFullyPaid: false }
 * ```
 *
 * @see {@link docs/project/analysis/frontend-calculations.md#1} - Análisis exhaustivo
 */
export function calculateProjectBalanceWithoutAdjustments(
  project: ProjectWithAllocations
): ProjectBalanceResult {
  const totalAmount = project.totalAmount

  // 1. Sumar todos los pagos asignados al proyecto
  const totalPaid = project.allocations?.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0) || 0

  // 2. Calcular balance restante (puede ser negativo si hay sobrepago)
  const balance = totalAmount - totalPaid

  // 3. Calcular porcentaje de pago
  const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0

  // 4. Determinar si está completamente pagado
  const isFullyPaid = balance <= 0

  return {
    totalPaid,
    balance,
    percentPaid,
    isFullyPaid,
  }
}

/**
 * Type para proyecto con allocations completas (usado en getTotalPendingBalance)
 */
export interface ProjectWithFullAllocations {
  totalAmount: number
  allocations?: Array<{
    allocatedAmount: number
  }>
}

/**
 * Resultado de derivación de progreso de pago desde columna balance persistida
 */
export interface PaymentProgressResult {
  totalPaid: number
  percentPaid: number
  isFullyPaid: boolean
}

/**
 * Deriva totalPaid, percentPaid e isFullyPaid a partir de total y balance persistido.
 *
 * Usar en endpoints GET que leen Project.balance de la DB.
 * NO recalcula balance — solo deriva campos de display.
 *
 * @param total - Monto total del proyecto (Number(project.total))
 * @param balance - Balance persistido en DB (Number(project.balance))
 */
export function derivePaymentProgress(total: number, balance: number): PaymentProgressResult {
  const totalPaid = total - balance
  const percentPaid = total > 0 ? (totalPaid / total) * 100 : 0
  const isFullyPaid = balance <= 0
  return { totalPaid, percentPaid, isFullyPaid }
}

/**
 * Suma los balances positivos (pendientes) de múltiples proyectos.
 * Proyectos pagados o sobrepagados (balance ≤ 0) se ignoran.
 */
export function getTotalPendingBalance(projects: ProjectWithFullAllocations[]): number {
  return projects.reduce((sum, project) => {
    const { balance } = calculateProjectBalanceWithoutAdjustments({
      totalAmount: project.totalAmount,
      allocations: project.allocations,
    })
    return sum + Math.max(0, balance)
  }, 0)
}
