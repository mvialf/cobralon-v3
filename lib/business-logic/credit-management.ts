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
import { greaterThanMoney, money, moneyToNumber } from './money'

export {
  calculateMaxCreditApplication,
  calculatePaymentDistribution,
  canApplyCredit,
  canRefundCredit,
} from './credit-rules'
export type { CreditApplicationValidation, ProcessPaymentWithCreditResult } from './credit-rules'

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
