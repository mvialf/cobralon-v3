import { formatCurrency } from '@/lib/format'
import { addMoney, greaterThanMoney, minMoney, money, moneyToNumber, subtractMoney } from './money'

export interface ProcessPaymentWithCreditResult {
  appliedToProject: number
  generatedCredit: number
  newProjectBalance: number
  newCustomerCredit: number
}

/**
 * Calculate how a payment should be distributed between project and customer credit.
 */
export function calculatePaymentDistribution(
  projectBalance: number,
  paymentAmount: number,
  customerCreditApplied: number = 0
): ProcessPaymentWithCreditResult {
  const projectBalanceMoney = money(projectBalance)
  const customerCreditAppliedMoney = money(customerCreditApplied)

  const totalPayment = addMoney(paymentAmount, customerCreditAppliedMoney)
  const appliedToProject = minMoney(totalPayment, projectBalanceMoney)
  const generatedCredit = greaterThanMoney(totalPayment, projectBalanceMoney)
    ? subtractMoney(totalPayment, projectBalanceMoney)
    : money(0)

  const newProjectBalance = subtractMoney(projectBalanceMoney, appliedToProject)
  const newCustomerCredit = subtractMoney(generatedCredit, customerCreditAppliedMoney)

  return {
    appliedToProject: moneyToNumber(appliedToProject),
    generatedCredit: moneyToNumber(generatedCredit),
    newProjectBalance: moneyToNumber(newProjectBalance),
    newCustomerCredit: moneyToNumber(newCustomerCredit),
  }
}

/**
 * Calculate maximum credit that can be applied to a project.
 */
export function calculateMaxCreditApplication(
  customerCredit: number,
  projectBalance: number
): number {
  return moneyToNumber(minMoney(customerCredit, projectBalance))
}

export interface CreditApplicationValidation {
  valid: boolean
  error?: string
}

/**
 * Validate if a credit application is possible.
 */
export function canApplyCredit(
  requestedAmount: number,
  customerCredit: number,
  projectBalance: number
): CreditApplicationValidation {
  if (greaterThanMoney(0, requestedAmount)) {
    return { valid: false, error: 'El monto debe ser positivo' }
  }

  if (money(requestedAmount).equals(0)) {
    return { valid: false, error: 'El monto debe ser mayor a 0' }
  }

  if (greaterThanMoney(requestedAmount, customerCredit)) {
    return {
      valid: false,
      error: `Crédito insuficiente. Disponible: ${formatCurrency(customerCredit, 'CLP')}`,
    }
  }

  if (greaterThanMoney(requestedAmount, projectBalance)) {
    return {
      valid: false,
      error: `El monto excede el balance del proyecto (${formatCurrency(projectBalance, 'CLP')})`,
    }
  }

  return { valid: true }
}

/**
 * Validate if a credit refund is possible.
 */
export function canRefundCredit(
  requestedAmount: number,
  customerCredit: number
): CreditApplicationValidation {
  if (!greaterThanMoney(requestedAmount, 0)) {
    return { valid: false, error: 'El monto debe ser mayor a 0' }
  }

  if (greaterThanMoney(requestedAmount, customerCredit)) {
    return {
      valid: false,
      error: `El monto excede el crédito disponible (${formatCurrency(customerCredit, 'CLP')})`,
    }
  }

  return { valid: true }
}
