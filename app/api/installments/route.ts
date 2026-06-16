import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withLogging } from '@/lib/logger-middleware'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import { getEndOfTodayAppTZ } from '@/lib/timezone'

const DEFAULT_MONTHLY_TOTALS_CURRENCY = 'CLP'

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getMonthRangeFromOffset(offset: number): {
  monthKey: string
  startDate: Date
  endDate: Date
} {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)

  return {
    monthKey: getMonthKey(startDate),
    startDate,
    endDate,
  }
}

function parseMonthlyTotalsMonths(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.min(parsed, 12)
}

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
 *   - monthlyTotals: cantidad de meses futuros a resumir (max 12)
 *
 * Response:
 *   - installments: Array de installments con payment, customer y allocations incluidas.
 *     El status derivado (upcoming/due) se calcula en el cliente a partir de dueDate.
 *   - pagination: { page, limit, total, totalPages }
 *   - monthlyTotals: Array opcional de totales por mes para cuotas próximas
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
    const monthlyTotalsMonths = parseMonthlyTotalsMonths(searchParams.get('monthlyTotals') || '')

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

    let monthlyTotals:
      | Array<{
          monthKey: string
          startDate: string
          endDate: string
          amount: number
          currency: string
        }>
      | undefined

    if (monthlyTotalsMonths > 0) {
      const monthRanges = Array.from({ length: monthlyTotalsMonths }, (_, index) =>
        getMonthRangeFromOffset(index)
      )
      const totalsByMonth = new Map<string, { amount: number; currency: string }>()
      const endOfToday = getEndOfTodayAppTZ()
      const lastMonth = monthRanges[monthRanges.length - 1]

      const summaryInstallments = await prisma.installment.findMany({
        where: {
          dueDate: {
            gt: endOfToday,
            lte: lastMonth.endDate,
          },
        },
        select: {
          amount: true,
          dueDate: true,
          payment: {
            select: {
              currency: true,
            },
          },
        },
      })

      summaryInstallments.forEach((installment) => {
        const monthKey = getMonthKey(installment.dueDate)
        const current = totalsByMonth.get(monthKey) || {
          amount: 0,
          currency: installment.payment.currency || DEFAULT_MONTHLY_TOTALS_CURRENCY,
        }

        totalsByMonth.set(monthKey, {
          ...current,
          amount: current.amount + Number(installment.amount),
        })
      })

      monthlyTotals = monthRanges.map((range) => {
        const total = totalsByMonth.get(range.monthKey)
        return {
          monthKey: range.monthKey,
          startDate: range.startDate.toISOString(),
          endDate: range.endDate.toISOString(),
          amount: total?.amount || 0,
          currency: total?.currency || DEFAULT_MONTHLY_TOTALS_CURRENCY,
        }
      })
    }

    return NextResponse.json({
      installments,
      pagination: buildPaginationResponse(page, limit, total),
      ...(monthlyTotals ? { monthlyTotals } : {}),
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching installments')
    return NextResponse.json({ error: 'Error al obtener cuotas' }, { status: 500 })
  }
})
