import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { canRefundCredit } from '@/lib/business-logic/credit-management'
import { Prisma } from '@prisma/client'
import { updateCustomerCreditBalance } from '@/lib/business-logic/update-customer-credit-balance'
import type { PrismaTransaction } from '@/lib/business-logic/update-project-balance'

interface RefundCreditRequest {
  amount: number
  refundDate: string // ISO date string
  refundMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE'
  comments?: string
}

/**
 * POST /api/customers/[id]/credit/refund
 *
 * Procesa una devolución de crédito a un cliente
 *
 * @body {
 *   amount: number,
 *   refundDate: string,
 *   refundMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE',
 *   comments?: string
 * }
 *
 * @returns Updated customer with new credit balance
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await params
    const body: RefundCreditRequest = await request.json()

    // Validar body
    if (!body.amount || !body.refundDate || !body.refundMethod) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: amount, refundDate, refundMethod' },
        { status: 400 }
      )
    }

    // Obtener cliente actual
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, creditBalance: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Convertir Decimal a number para validación
    const creditBalance = Number(customer.creditBalance)

    // Validar que se puede hacer la devolución
    const validation = canRefundCredit(body.amount, creditBalance)

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Procesar devolución en transacción atómica
    const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
      // 1. Crear registro de transacción de crédito
      const transaction = await tx.creditTransaction.create({
        data: {
          customerId,
          amount: new Prisma.Decimal(-body.amount), // Negativo = salida de crédito
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

    // Log de auditoría
    console.log(
      `[CREDIT REFUND] Customer ${customer.name} (${customerId}): ` +
        `$${body.amount} refunded via ${body.refundMethod}`
    )

    return NextResponse.json(
      {
        success: true,
        customer: result.customer,
        transaction: result.transaction,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/customers/[id]/credit/refund] Error:', error)

    // Manejar errores específicos de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }
    }

    return NextResponse.json({ error: 'Error al procesar devolución de crédito' }, { status: 500 })
  }
}
