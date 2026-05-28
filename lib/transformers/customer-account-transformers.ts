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
  totalPaid: number
  balance: number
  currency: string
  createdAt: string
}

/**
 * Resultado del cálculo de totales del estado de cuenta
 */
export interface AccountSummary {
  totalProjects: number // Σ totalAmount de proyectos seleccionados
  totalPaid: number // Σ settledTotal de proyectos seleccionados
  balance: number // Σ balance derivado de ProjectFinancials
  currency: string
}

export type RequestMode = 'full' | 'percentage' | 'fixed'

export interface PaymentRequestOptions {
  mode: RequestMode
  percentage?: number
  fixedAmount?: number
}

export interface RequestedProject extends SelectedProject {
  requestedAmount: number
}

export interface PaymentRequestSummary {
  projects: RequestedProject[]
  requestedTotal: number
  isValid: boolean
  error: string | null
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
  _payments: ConsolidatedPayment[]
): AccountSummary {
  const totalProjects = projects.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalPaid = projects.reduce((sum, p) => sum + p.totalPaid, 0)
  const balance = projects.reduce((sum, p) => sum + Math.max(0, p.balance), 0)
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

/**
 * Calcula cuánto se solicitará cobrar por cada proyecto seleccionado.
 *
 * La solicitud no registra pagos ni modifica saldos: es solo una capa documental
 * sobre el balance derivado desde ProjectFinancials.
 */
export function calculatePaymentRequest(
  projects: SelectedProject[],
  options: PaymentRequestOptions
): PaymentRequestSummary {
  const projectsWithPendingBalance = projects.filter((project) => project.balance > 0)
  const pendingBalance = projectsWithPendingBalance.reduce(
    (sum, project) => sum + project.balance,
    0
  )

  if (pendingBalance <= 0) {
    return buildPaymentRequestResult(projects, [], 'No hay saldo pendiente para solicitar')
  }

  if (options.mode === 'full') {
    return buildPaymentRequestResult(
      projects,
      projectsWithPendingBalance.map((project) => ({
        projectId: project.id,
        requestedAmount: project.balance,
      }))
    )
  }

  if (options.mode === 'percentage') {
    const percentage = options.percentage ?? 0

    if (percentage <= 0 || percentage > 100) {
      return buildPaymentRequestResult(projects, [], 'El porcentaje debe estar entre 1 y 100')
    }

    return buildPaymentRequestResult(
      projects,
      projectsWithPendingBalance.map((project) => ({
        projectId: project.id,
        requestedAmount: Math.round((project.balance * percentage) / 100),
      }))
    )
  }

  const fixedAmount = options.fixedAmount ?? 0

  if (fixedAmount <= 0) {
    return buildPaymentRequestResult(projects, [], 'El monto solicitado debe ser mayor que cero')
  }

  if (fixedAmount > pendingBalance) {
    return buildPaymentRequestResult(
      projects,
      [],
      'El monto solicitado no puede superar el saldo pendiente seleccionado'
    )
  }

  const allocations: Array<{ projectId: string; requestedAmount: number }> = []
  let remaining = fixedAmount

  const sortedProjects = [...projectsWithPendingBalance].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  for (const project of sortedProjects) {
    if (remaining <= 0) break

    const requestedAmount = Math.min(project.balance, remaining)
    allocations.push({ projectId: project.id, requestedAmount })
    remaining -= requestedAmount
  }

  return buildPaymentRequestResult(projects, allocations)
}

function buildPaymentRequestResult(
  projects: SelectedProject[],
  allocations: Array<{ projectId: string; requestedAmount: number }>,
  error: string | null = null
): PaymentRequestSummary {
  const requestedByProject = new Map(
    allocations.map((allocation) => [allocation.projectId, allocation.requestedAmount])
  )

  const requestedProjects = projects.map((project) => ({
    ...project,
    requestedAmount: requestedByProject.get(project.id) ?? 0,
  }))

  const requestedTotal = requestedProjects.reduce(
    (sum, project) => sum + project.requestedAmount,
    0
  )

  return {
    projects: requestedProjects,
    requestedTotal,
    isValid: error === null,
    error,
  }
}
