/**
 * Helper para actualizar el creditBalance de un cliente desde el ledger
 *
 * CUÁNDO USAR:
 * - Después de crear un pago con crédito aplicado (APPLIED)
 * - Después de un sobrepago que genera crédito (OVERPAYMENT)
 * - Después de eliminar un pago con credit_transactions
 * - Después de procesar un refund (WITHDRAWAL)
 *
 * ARQUITECTURA:
 * - Recalcula creditBalance como SUM(credit_transactions.amount)
 * - Invariante: creditBalance >= 0 (Math.max)
 * - Patrón idéntico a updateProjectBalance()
 */

import { FINANCIAL } from '../constants/financial-constants'

import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import type { PrismaTransaction } from './update-project-balance'

/**
 * Recalcula y actualiza el creditBalance de un cliente desde credit_transactions
 *
 * @param customerId - ID del cliente
 * @param tx - Transacción de Prisma (opcional, usa prisma global si no se proporciona)
 * @returns creditBalance actualizado
 *
 * @example
 * // Dentro de una transacción (recomendado)
 * await prisma.$transaction(async (tx) => {
 *   await tx.creditTransaction.create({ ... })
 *   await updateCustomerCreditBalance(customerId, tx)
 * })
 */
export async function updateCustomerCreditBalance(
  customerId: string,
  tx?: PrismaTransaction
): Promise<number> {
  const db = tx || prisma

  const result = await db.creditTransaction.aggregate({
    where: { customerId },
    _sum: { amount: true },
  })

  const calculatedBalance = Math.max(0, Number(result._sum.amount ?? 0))

  await db.customer.update({
    where: { id: customerId },
    data: {
      creditBalance: new Decimal(calculatedBalance),
    },
  })

  return calculatedBalance
}

/**
 * Verifica si el creditBalance de un cliente es consistente con el ledger
 *
 * @param customerId - ID del cliente
 * @returns true si el balance es correcto, false si necesita corrección
 *
 * @example
 * const isConsistent = await verifyCustomerCreditBalance(customerId)
 * if (!isConsistent) {
 *   await updateCustomerCreditBalance(customerId)
 * }
 */
export async function verifyCustomerCreditBalance(customerId: string): Promise<boolean> {
  const [customer, aggregation] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: { creditBalance: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { customerId },
      _sum: { amount: true },
    }),
  ])

  if (!customer) {
    throw new Error(`Customer ${customerId} not found`)
  }

  const dbBalance = Number(customer.creditBalance)
  const calculatedBalance = Math.max(0, Number(aggregation._sum.amount ?? 0))

  return Math.abs(dbBalance - calculatedBalance) < FINANCIAL.TOLERANCE
}
