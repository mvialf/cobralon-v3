import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * GET /api/installments
 *
 * Obtiene lista global de installments con filtros opcionales
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - status: filtrar por estado ('pending' o 'paid')
 *   - paymentId: filtrar por pago específico
 *   - customerId: filtrar por cliente específico
 *   - startDate: filtrar cuotas con vencimiento desde esta fecha (ISO string)
 *   - endDate: filtrar cuotas con vencimiento hasta esta fecha (ISO string)
 *
 * Response:
 *   - installments: Array de installments con payment, customer y allocations incluidas
 *   - pagination: { page, limit, total, totalPages }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const status = searchParams.get('status') || ''
    const paymentId = searchParams.get('paymentId') || ''
    const customerId = searchParams.get('customerId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const skip = (page - 1) * limit

    // Construir filtro dinámico
    const where: Prisma.InstallmentWhereInput = {}

    if (status) {
      where.status = status
    }

    if (paymentId) {
      where.paymentId = paymentId
    }

    // Filtro de rango de fechas (dueDate)
    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) {
        where.dueDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.dueDate.lte = new Date(endDate)
      }
    }

    // Filtro por cliente (via payment -> customer)
    if (customerId) {
      where.payment = {
        customerId,
      }
    }

    // Obtener installments y total count
    const [installments, total] = await Promise.all([
      prisma.installment.findMany({
        relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
        where,
        skip,
        take: limit,
        orderBy: [
          { dueDate: 'asc' }, // Vencimientos más próximos primero
          { installmentNumber: 'asc' }, // Número de cuota
        ],
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              date: true,
              reference: true,
              selectedInstallments: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
              paymentMethod: {
                select: {
                  id: true,
                  name: true,
                  icon: true,
                },
              },
              allocations: {
                select: {
                  id: true,
                  allocatedAmount: true,
                  project: {
                    select: {
                      id: true,
                      projectNumber: true,
                      projectName: true,
                      currency: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.installment.count({ where }),
    ])

    return NextResponse.json({
      installments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching installments:', error)
    return NextResponse.json({ error: 'Error al obtener cuotas' }, { status: 500 })
  }
}
