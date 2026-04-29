import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { Prisma } from '@prisma/client'
import { canRefundCredit, getCustomerCreditBalance } from '@/lib/business-logic/credit-management'
import type { PrismaTransaction } from '@/lib/db/types'
import { refundCreditSchema, type RefundCreditFormData } from '@/lib/validations/credit-validations'

/**
 * POST /api/customers/[id]/credit/refund
 *
 * Procesa una devolución de crédito a un cliente
 */
export const POST = withApiHandler<RefundCreditFormData>(
  async (_request, logger, { params, body }) => {
    const customerId = params.id

    // Procesar devolución en transacción atómica.
    // Lectura, validación y escritura se hacen DENTRO de la tx con lock pesimista
    // sobre el Customer para evitar race conditions: dos refunds concurrentes
    // (o un refund concurrente con un pago aplicando crédito) podrían leer el
    // mismo saldo y consumir crédito que ya no existe.
    const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
      // Lock pesimista. Falla con P2025 si el cliente no existe.
      const lockedRows = await tx.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT id, name FROM "Customer" WHERE id = ${customerId}::uuid FOR UPDATE
      `
      if (lockedRows.length === 0) {
        throw new BusinessError('Cliente no encontrado', 404)
      }
      const customerName = lockedRows[0].name

      // Re-leer saldo dentro de la tx (con lock ya tomado)
      const creditBalance = await getCustomerCreditBalance(customerId, tx)

      const validation = canRefundCredit(body.amount, creditBalance)
      if (!validation.valid) {
        throw new BusinessError(validation.error!)
      }

      const transaction = await tx.creditTransaction.create({
        data: {
          customerId,
          amount: new Prisma.Decimal(-body.amount),
          type: 'WITHDRAWAL',
          description: body.comments || `Devolución vía ${body.refundMethod.toLowerCase()}`,
          metadata: {
            refundDate: body.refundDate,
            refundMethod: body.refundMethod,
            comments: body.comments,
          },
        },
      })

      const newCreditBalance = await getCustomerCreditBalance(customerId, tx)

      const updatedCustomer = await tx.customer.findUnique({
        where: { id: customerId },
      })

      return {
        customer: { ...updatedCustomer, creditBalance: newCreditBalance },
        transaction,
        customerName,
      }
    })

    logger.info(
      { customerId, amount: body.amount, method: body.refundMethod },
      `Credit refund processed for ${result.customerName}`
    )

    return NextResponse.json({
      success: true,
      customer: result.customer,
      transaction: result.transaction,
    })
  },
  {
    bodySchema: refundCreditSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al procesar devolución de crédito',
  }
)
