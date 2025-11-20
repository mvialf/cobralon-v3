/**
 * Business logic for determining credit feature eligibility
 *
 * This module determines when credit-related UI features should be shown
 * based on business rules and data state.
 */

export interface CreditEligibilityCheck {
  eligible: boolean
  reason?: string
  maxApplicable: number
}

/**
 * Check if "Apply Credit" option should be shown in payment form
 *
 * @param customerCredit - Customer's available credit balance
 * @param projectBalance - Project's pending balance
 * @param paymentCustomerId - Customer ID making the payment
 * @param projectCustomerId - Customer ID owning the project
 *
 * @returns Eligibility check with reason if not eligible
 *
 * @example
 * // Customer with credit, project with balance, same customer
 * checkCreditEligibility(50000, 100000, 'c1', 'c1')
 * // => { eligible: true, maxApplicable: 50000 }
 *
 * @example
 * // Customer without credit
 * checkCreditEligibility(0, 100000, 'c1', 'c1')
 * // => { eligible: false, reason: 'Cliente no tiene crédito disponible', maxApplicable: 0 }
 *
 * @example
 * // Different customers
 * checkCreditEligibility(50000, 100000, 'c1', 'c2')
 * // => { eligible: false, reason: 'El crédito solo puede aplicarse a proyectos del mismo cliente', maxApplicable: 0 }
 */
export function checkCreditEligibility(
  customerCredit: number,
  projectBalance: number,
  paymentCustomerId: string,
  projectCustomerId: string
): CreditEligibilityCheck {
  // Validación 1: Cliente debe tener crédito
  if (customerCredit <= 0) {
    return {
      eligible: false,
      reason: 'Cliente no tiene crédito disponible',
      maxApplicable: 0,
    }
  }

  // Validación 2: Proyecto debe tener balance pendiente
  if (projectBalance <= 0) {
    return {
      eligible: false,
      reason: 'Proyecto no tiene balance pendiente',
      maxApplicable: 0,
    }
  }

  // Validación 3: Clientes deben coincidir
  if (paymentCustomerId !== projectCustomerId) {
    return {
      eligible: false,
      reason: 'El crédito solo puede aplicarse a proyectos del mismo cliente',
      maxApplicable: 0,
    }
  }

  // ✅ Todas las validaciones pasaron
  return {
    eligible: true,
    maxApplicable: Math.min(customerCredit, projectBalance),
  }
}

/**
 * Simple check for showing credit application option
 *
 * @param customerCredit - Customer's available credit
 * @param projectBalance - Project's pending balance
 * @param paymentCustomerId - Customer making payment
 * @param projectCustomerId - Customer owning project
 *
 * @returns true if option should be shown
 */
export function shouldShowCreditOption(
  customerCredit: number,
  projectBalance: number,
  paymentCustomerId: string,
  projectCustomerId: string
): boolean {
  return customerCredit > 0 && projectBalance > 0 && paymentCustomerId === projectCustomerId
}

/**
 * Check if "Refund Credit" option should be shown
 *
 * @param creditBalance - Customer's current credit balance
 *
 * @returns true if refund option should be shown
 */
export function shouldShowRefundOption(creditBalance: number): boolean {
  return creditBalance > 0
}

/**
 * Get human-readable label for credit transaction type
 *
 * @param type - Credit transaction type
 * @returns Spanish label
 */
export function getCreditTransactionTypeLabel(
  type: 'OVERPAYMENT' | 'APPLIED' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT'
): string {
  const labels: Record<string, string> = {
    OVERPAYMENT: 'Sobrepago generado',
    APPLIED: 'Crédito aplicado',
    REFUND: 'Devolución recibida',
    WITHDRAWAL: 'Retiro solicitado',
    ADJUSTMENT: 'Ajuste manual',
  }

  return labels[type] || type
}
