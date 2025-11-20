/**
 * Business logic for credit management system
 *
 * This module handles the core business logic for customer credit operations:
 * - Calculating payment distribution (project vs credit)
 * - Validating credit applications
 * - Managing credit balance invariants
 *
 * INVARIANTS:
 * 1. Project.balance >= 0 (ALWAYS)
 * 2. Customer.creditBalance >= 0 (ALWAYS)
 * 3. All credit movements must create CreditTransaction records
 * 4. Credit operations are ATOMIC (database transaction)
 * 5. Cannot apply more credit than available
 */

export interface ProcessPaymentWithCreditResult {
  appliedToProject: number
  generatedCredit: number
  newProjectBalance: number
  newCustomerCredit: number
}

/**
 * Calculate how a payment should be distributed between project and customer credit
 *
 * @param projectBalance - Current project balance (total - totalPaid)
 * @param paymentAmount - Amount being paid in cash/transfer
 * @param customerCreditApplied - Amount of customer credit being applied (default: 0)
 *
 * @returns Distribution details
 *
 * @example
 * // Project: balance $200,000
 * // Payment: $500,000 cash
 * // Customer credit applied: $0
 * calculatePaymentDistribution(200000, 500000, 0)
 * // => {
 * //   appliedToProject: 200,000,
 * //   generatedCredit: 300,000,
 * //   newProjectBalance: 0,
 * //   newCustomerCredit: 300,000
 * // }
 *
 * @example
 * // Project: balance $500,000
 * // Payment: $200,000 cash
 * // Customer credit applied: $300,000
 * calculatePaymentDistribution(500000, 200000, 300000)
 * // => {
 * //   appliedToProject: 500,000,
 * //   generatedCredit: 0,
 * //   newProjectBalance: 0,
 * //   newCustomerCredit: -300,000  // Credit consumed
 * // }
 */
export function calculatePaymentDistribution(
  projectBalance: number,
  paymentAmount: number,
  customerCreditApplied: number = 0
): ProcessPaymentWithCreditResult {
  // Total disponible para aplicar al proyecto
  const totalPayment = paymentAmount + customerCreditApplied

  // ¿Cuánto se aplica al proyecto? (máximo: balance actual)
  const appliedToProject = Math.min(totalPayment, projectBalance)

  // ¿Cuánto sobra? (se convierte en crédito)
  const generatedCredit = Math.max(0, totalPayment - projectBalance)

  // Nuevos valores
  const newProjectBalance = projectBalance - appliedToProject
  const newCustomerCredit = generatedCredit - customerCreditApplied

  return {
    appliedToProject,
    generatedCredit,
    newProjectBalance,
    newCustomerCredit,
  }
}

/**
 * Calculate maximum credit that can be applied to a project
 *
 * @param customerCredit - Available customer credit
 * @param projectBalance - Current project balance
 *
 * @returns Maximum amount that can be applied
 *
 * @example
 * calculateMaxCreditApplication(100000, 50000) // => 50000 (limited by balance)
 * calculateMaxCreditApplication(30000, 100000) // => 30000 (limited by credit)
 */
export function calculateMaxCreditApplication(
  customerCredit: number,
  projectBalance: number
): number {
  return Math.min(customerCredit, projectBalance)
}

export interface CreditApplicationValidation {
  valid: boolean
  error?: string
}

/**
 * Validate if a credit application is possible
 *
 * @param requestedAmount - Amount user wants to apply
 * @param customerCredit - Available customer credit
 * @param projectBalance - Current project balance
 *
 * @returns Validation result with error message if invalid
 */
export function canApplyCredit(
  requestedAmount: number,
  customerCredit: number,
  projectBalance: number
): CreditApplicationValidation {
  if (requestedAmount < 0) {
    return { valid: false, error: 'El monto debe ser positivo' }
  }

  if (requestedAmount === 0) {
    return { valid: false, error: 'El monto debe ser mayor a 0' }
  }

  if (requestedAmount > customerCredit) {
    return {
      valid: false,
      error: `Crédito insuficiente. Disponible: $${customerCredit.toLocaleString('es-CL')}`,
    }
  }

  if (requestedAmount > projectBalance) {
    return {
      valid: false,
      error: `El monto excede el balance del proyecto ($${projectBalance.toLocaleString('es-CL')})`,
    }
  }

  return { valid: true }
}

/**
 * Validate if a credit refund is possible
 *
 * @param requestedAmount - Amount to refund
 * @param customerCredit - Available customer credit
 *
 * @returns Validation result
 */
export function canRefundCredit(
  requestedAmount: number,
  customerCredit: number
): CreditApplicationValidation {
  if (requestedAmount <= 0) {
    return { valid: false, error: 'El monto debe ser mayor a 0' }
  }

  if (requestedAmount > customerCredit) {
    return {
      valid: false,
      error: `El monto excede el crédito disponible ($${customerCredit.toLocaleString('es-CL')})`,
    }
  }

  return { valid: true }
}
