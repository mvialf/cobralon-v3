import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withLogging } from '@/lib/logger-middleware'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import { getInstallmentStatus } from '@/lib/business-logic/installments'
import { getEndOfTodayAppTZ } from '@/lib/timezone'

/**
 * GET /api/installments
 *
 * Obtiene lista global de installments con filtros opcionales
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - status: filtrar por estado derivado ('upcoming' o 'due') — se traduce a filtro por dueDate
 *   - paymentId: filtrar por pago específico
 *   - customerId: filtrar por cliente específico
 *   - startDate: filtrar cuotas con vencimiento desde esta fecha (ISO string)
 *   - endDate: filtrar cuotas con vencimiento hasta esta fecha (ISO string)
 *
 * Response:
 *   - installments: Array de installments con payment, customer y allocations incluidas
 *   - pagination: { page, limit, total, totalPages }
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    const status = searchParams.get('status') || ''
    const paymentId = searchParams.get('paymentId') || ''
    const customerId = searchParams.get('customerId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // Construir filtro dinámico
    const where: Prisma.InstallmentWhereInput = {}

    // Estado derivado: status se traduce a filtro por dueDate
    // Usa timezone de la aplicación para comparar correctamente
    if (status) {
      const endOfToday = getEndOfTodayAppTZ()

      if (status === 'due') {
        where.dueDate = { ...((where.dueDate as object) || {}), lte: endOfToday }
      } else if (status === 'upcoming') {
        where.dueDate = { ...((where.dueDate as object) || {}), gt: endOfToday }
      }
    }

    if (paymentId) {
      where.paymentId = paymentId
    }

    // Filtro de rango de fechas (dueDate) — se combina con status si ambos están
    if (startDate || endDate) {
      const existing = (where.dueDate as Record<string, Date>) || {}
      if (startDate) {
        existing.gte = new Date(startDate)
      }
      if (endDate) {
        existing.lte = new Date(endDate)
      }
      where.dueDate = existing
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
        relationLoadStrategy: 'join',
        where,
        skip,
        take: limit,
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
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

    // Enriquecer con status derivado de dueDate
    const installmentsWithStatus = installments.map((i) => ({
      ...i,
      status: getInstallmentStatus(i.dueDate),
    }))

    return NextResponse.json({
      installments: installmentsWithStatus,
      pagination: buildPaginationResponse(page, limit, total),
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching installments')
    return NextResponse.json({ error: 'Error al obtener cuotas' }, { status: 500 })
  }
})
