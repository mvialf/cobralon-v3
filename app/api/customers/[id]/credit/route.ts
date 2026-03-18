import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { getCustomerCreditBalance } from '@/lib/business-logic/credit-management'

/**
 * GET /api/customers/[id]/credit
 *
 * Obtiene el crédito disponible y el historial de transacciones de un cliente
 *
 * @returns {
 *   creditBalance: number,
 *   transactions: CreditTransaction[]
 * }
 */
export const GET = withLogging(async (_request, logger, context) => {
  try {
    const { id: customerId } = await context.params

    // Obtener cliente con transacciones (sin creditBalance — se calcula)
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        creditTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 50, // Últimas 50 transacciones
          include: {
            project: {
              select: {
                id: true,
                projectNumber: true,
                projectName: true,
              },
            },
            payment: {
              select: {
                id: true,
                amount: true,
                date: true,
              },
            },
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Calcular creditBalance desde ledger
    const creditBalance = await getCustomerCreditBalance(customerId)

    return NextResponse.json({
      creditBalance,
      transactions: customer.creditTransactions,
    })
  } catch (error) {
    logger.error({ err: error }, '[GET /api/customers/[id]/credit] Error')
    return NextResponse.json({ error: 'Error al obtener información de crédito' }, { status: 500 })
  }
})
