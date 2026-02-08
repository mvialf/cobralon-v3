import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { Prisma } from '@prisma/client'
import { canRefundCredit } from '@/lib/business-logic/credit-management'
import { updateCustomerCreditBalance } from '@/lib/business-logic/update-customer-credit-balance'
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

    // Obtener cliente actual
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, creditBalance: true },
    })

    if (!customer) {
      throw new BusinessError('Cliente no encontrado', 404)
    }

    // Convertir Decimal a number para validación
    const creditBalance = Number(customer.creditBalance)

    // Validar que se puede hacer la devolución
    const validation = canRefundCredit(body.amount, creditBalance)

    if (!validation.valid) {
      throw new BusinessError(validation.error!)
    }

    // Procesar devolución en transacción atómica
    const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
      // 1. Crear registro de transacción de crédito
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

      // 2. Recalcular creditBalance desde ledger
      await updateCustomerCreditBalance(customerId, tx)

      // 3. Obtener customer actualizado
      const updatedCustomer = await tx.customer.findUnique({
        where: { id: customerId },
      })

      return { customer: updatedCustomer, transaction }
    })

    logger.info(
      { customerId, amount: body.amount, method: body.refundMethod },
      `Credit refund processed for ${customer.name}`
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
