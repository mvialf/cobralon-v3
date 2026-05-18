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

import { prisma } from '@/lib/db'
import type { PrismaTransaction } from '@/lib/db/types'
import { logger } from '@/lib/logger'
import type { PrismaClient } from '@prisma/client'
import { addMoney, greaterThanMoney, minMoney, money, moneyToNumber, subtractMoney } from './money'

export interface CustomerCreditBalance {
  rawBalance: number
  availableBalance: number
}

function normalizeCreditBalance(customerId: string, rawBalance: number): CustomerCreditBalance {
  const rawBalanceMoney = money(rawBalance)
  const availableBalance = moneyToNumber(greaterThanMoney(rawBalanceMoney, 0) ? rawBalanceMoney : 0)

  if (greaterThanMoney(0, rawBalanceMoney)) {
    logger.warn(
      { customerId, rawBalance, availableBalance },
      'Customer credit ledger has negative balance'
    )
  }

  return { rawBalance, availableBalance }
}

/**
 * Calcula el creditBalance de un cliente desde el ledger CreditTransaction.
 * Reemplaza al campo caché Customer.creditBalance.
 *
 * @param customerId - ID del cliente
 * @param db - Cliente Prisma o transacción (para consistencia dentro de tx)
 * @returns creditBalance calculado (>= 0)
 */
export async function getCustomerCreditBalance(
  customerId: string,
  db: PrismaClient | PrismaTransaction = prisma
): Promise<number> {
  const balance = await getCustomerCreditBalanceDetails(customerId, db)
  return balance.availableBalance
}

/**
 * Calcula el saldo raw y el saldo disponible de crédito desde el ledger.
 *
 * rawBalance expone el total real del ledger, incluso si es negativo.
 * availableBalance es el saldo usable por la aplicación y nunca baja de 0.
 */
export async function getCustomerCreditBalanceDetails(
  customerId: string,
  db: PrismaClient | PrismaTransaction = prisma
): Promise<CustomerCreditBalance> {
  const result = await db.creditTransaction.aggregate({
    where: { customerId },
    _sum: { amount: true },
  })

  return normalizeCreditBalance(customerId, moneyToNumber(result._sum.amount ?? 0))
}

/**
 * Bloquea la fila del cliente dentro de una transacción antes de leer/modificar crédito.
 * Esto serializa refunds concurrentes del mismo cliente en PostgreSQL.
 */
export async function lockCustomerCreditBalance(
  customerId: string,
  db: PrismaTransaction
): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE
  `

  return rows.length > 0
}

/**
 * Calcula creditBalance para múltiples clientes en 1 query (evita N+1).
 *
 * @param customerIds - IDs de clientes
 * @param db - Cliente Prisma o transacción
 * @returns Map<customerId, creditBalance>
 */
export async function getCustomerCreditBalances(
  customerIds: string[],
  db: PrismaClient | PrismaTransaction = prisma
): Promise<Map<string, number>> {
  if (customerIds.length === 0) return new Map()

  const results = await db.creditTransaction.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customerIds } },
    _sum: { amount: true },
  })

  const map = new Map<string, number>()
  for (const r of results) {
    const balance = normalizeCreditBalance(r.customerId, moneyToNumber(r._sum.amount ?? 0))
    map.set(r.customerId, balance.availableBalance)
  }
  return map
}

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
  const projectBalanceMoney = money(projectBalance)
  const customerCreditAppliedMoney = money(customerCreditApplied)

  // Total disponible para aplicar al proyecto
  const totalPayment = addMoney(paymentAmount, customerCreditAppliedMoney)

  // ¿Cuánto se aplica al proyecto? (máximo: balance actual)
  const appliedToProject = minMoney(totalPayment, projectBalanceMoney)

  // ¿Cuánto sobra? (se convierte en crédito)
  const generatedCredit = greaterThanMoney(totalPayment, projectBalanceMoney)
    ? subtractMoney(totalPayment, projectBalanceMoney)
    : money(0)

  // Nuevos valores
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
  return moneyToNumber(minMoney(customerCredit, projectBalance))
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
  if (greaterThanMoney(0, requestedAmount)) {
    return { valid: false, error: 'El monto debe ser positivo' }
  }

  if (money(requestedAmount).equals(0)) {
    return { valid: false, error: 'El monto debe ser mayor a 0' }
  }

  if (greaterThanMoney(requestedAmount, customerCredit)) {
    return {
      valid: false,
      error: `Crédito insuficiente. Disponible: $${customerCredit.toLocaleString('es-CL')}`,
    }
  }

  if (greaterThanMoney(requestedAmount, projectBalance)) {
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
  if (!greaterThanMoney(requestedAmount, 0)) {
    return { valid: false, error: 'El monto debe ser mayor a 0' }
  }

  if (greaterThanMoney(requestedAmount, customerCredit)) {
    return {
      valid: false,
      error: `El monto excede el crédito disponible ($${customerCredit.toLocaleString('es-CL')})`,
    }
  }

  return { valid: true }
}
