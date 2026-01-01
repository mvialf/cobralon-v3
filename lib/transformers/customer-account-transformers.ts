/**
 * Customer Account Transformers - Funciones puras para estado de cuenta de cliente
 *
 * Estas funciones manejan la consolidación de pagos para vista multi-proyecto:
 * - Determina si un pago es "completo" o "parcial" según proyectos seleccionados
 * - Calcula montos visibles según allocations en la selección
 */

import type { PaymentFromAPI } from '@/lib/types/payment.types'

/**
 * Pago consolidado para vista de estado de cuenta
 */
export interface ConsolidatedPayment {
  id: string
  date: string
  displayAmount: number // Monto a mostrar (total si completo, suma parcial si no)
  totalAmount: number // Monto original del pago
  currency: string
  isPartial: boolean // true = mostrar (*) porque hay allocations fuera de selección
  paymentMethod: {
    name: string
    icon: string | null
  }
}

/**
 * Proyecto seleccionado para el estado de cuenta
 */
export interface SelectedProject {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: number
  balance: number
  currency: string
}

/**
 * Resultado del cálculo de totales del estado de cuenta
 */
export interface AccountSummary {
  totalProjects: number // Σ totalAmount de proyectos seleccionados
  totalPaid: number // Σ allocatedAmount en proyectos seleccionados
  balance: number // totalProjects - totalPaid
  currency: string
}

/**
 * Consolida pagos para vista de cliente multi-proyecto
 *
 * Lógica híbrida:
 * - Si TODAS las allocations del pago están en proyectos seleccionados → completo
 * - Si ALGUNAS allocations están fuera de selección → parcial (*)
 *
 * @param payments - Lista de pagos del cliente (con todas sus allocations)
 * @param selectedProjectIds - IDs de proyectos seleccionados por el usuario
 * @returns Array de pagos consolidados ordenados por fecha ASC
 *
 * @example
 * ```ts
 * // Pago A: $500k distribuido en P1 ($300k) y P2 ($200k)
 * // Usuario selecciona P1 y P2
 * // → Pago A aparece como $500k (completo)
 *
 * // Usuario selecciona solo P1
 * // → Pago A aparece como (*) $300k (parcial)
 * ```
 */
export function consolidateCustomerPayments(
  payments: PaymentFromAPI[],
  selectedProjectIds: string[]
): ConsolidatedPayment[] {
  const selectedSet = new Set(selectedProjectIds)

  // Filtrar pagos que tienen al menos una allocation en proyectos seleccionados
  const relevantPayments = payments.filter((payment) =>
    payment.allocations.some((alloc) => selectedSet.has(alloc.project.id))
  )

  // Transformar cada pago
  const consolidated = relevantPayments.map((payment) => {
    // Verificar si TODAS las allocations están en la selección
    const isComplete = payment.allocations.every((alloc) => selectedSet.has(alloc.project.id))

    // Calcular monto visible (suma de allocations en selección)
    const visibleAmount = payment.allocations
      .filter((alloc) => selectedSet.has(alloc.project.id))
      .reduce((sum, alloc) => sum + Number(alloc.allocatedAmount), 0)

    return {
      id: payment.id,
      date: payment.date,
      displayAmount: isComplete ? Number(payment.amount) : visibleAmount,
      totalAmount: Number(payment.amount),
      currency: payment.currency,
      isPartial: !isComplete,
      paymentMethod: {
        name: payment.paymentMethod.name,
        icon: payment.paymentMethod.icon,
      },
    }
  })

  // Ordenar por fecha ASC (más antiguo primero)
  return consolidated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/**
 * Calcula los totales del estado de cuenta
 *
 * @param projects - Proyectos seleccionados
 * @param payments - Pagos consolidados (ya procesados con consolidateCustomerPayments)
 * @returns Resumen con totales
 */
export function calculateAccountSummary(
  projects: SelectedProject[],
  payments: ConsolidatedPayment[]
): AccountSummary {
  const totalProjects = projects.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalPaid = payments.reduce((sum, p) => sum + p.displayAmount, 0)
  const balance = totalProjects - totalPaid
  const currency = projects[0]?.currency || 'CLP'

  return {
    totalProjects,
    totalPaid,
    balance,
    currency,
  }
}

/**
 * Filtra proyectos que tienen balance pendiente (balance > 0)
 *
 * Útil para el botón "Auto pendientes"
 *
 * @param projects - Lista de todos los proyectos del cliente
 * @returns Solo proyectos con balance > 0
 */
export function filterProjectsWithPendingBalance(projects: SelectedProject[]): SelectedProject[] {
  return projects.filter((p) => p.balance > 0)
}
