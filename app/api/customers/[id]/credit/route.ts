import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: customerId } = await params

    // Obtener cliente con crédito y transacciones
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        creditBalance: true,
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

    return NextResponse.json({
      creditBalance: customer.creditBalance,
      transactions: customer.creditTransactions,
    })
  } catch (error) {
    console.error('[GET /api/customers/[id]/credit] Error:', error)
    return NextResponse.json({ error: 'Error al obtener información de crédito' }, { status: 500 })
  }
}
