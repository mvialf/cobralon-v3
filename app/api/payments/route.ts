import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { PaymentWhereInput } from '@/types/api'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler } from '@/lib/api-handler'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import {
  createPaymentApiSchema,
  type CreatePaymentApiBody,
} from '@/lib/validations/payment-validations'
import { createPayment } from '@/lib/use-cases/create-payment'

/**
 * GET /api/payments
 *
 * Obtiene lista de pagos con filtros opcionales y facets para server-side filtering
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - search: búsqueda global por cliente o proyecto
 *   - type: filtrar por tipo ('Project' | 'Customer')
 *   - paymentMethodId: filtrar por método de pago
 *   - projectNumber: filtrar por número de proyecto (via allocations)
 *   - customerId: filtrar por cliente específico
 *   - projectId: filtrar por proyecto específico
 *   - startDate: filtrar pagos desde esta fecha (ISO string)
 *   - endDate: filtrar pagos hasta esta fecha (ISO string)
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const { page, limit, skip } = parsePaginationParams(searchParams)

  // Filtros de server-side filtering
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || ''
  const paymentMethodId = searchParams.get('paymentMethodId') || ''
  const projectNumber = searchParams.get('projectNumber') || ''

  // Filtros existentes
  const customerId = searchParams.get('customerId') || ''
  const projectId = searchParams.get('projectId') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const includeFacets = searchParams.get('includeFacets') === 'true'

  // Sorting params con validación Zod
  const sortBySchema = z.enum(['date', 'amount', 'type', 'paymentMethodName']).optional()
  const sortOrderSchema = z.enum(['asc', 'desc']).optional()
  const sortBy = sortBySchema.safeParse(searchParams.get('sortBy') || undefined).data
  const sortOrder = sortOrderSchema.safeParse(searchParams.get('sortOrder') || undefined).data

  logger.debug(
    {
      page,
      limit,
      filters: {
        search: search || undefined,
        type: type || undefined,
        paymentMethodId: paymentMethodId || undefined,
        projectNumber: projectNumber || undefined,
        customerId: customerId || undefined,
        projectId: projectId || undefined,
        dateRange: startDate || endDate ? { startDate, endDate } : undefined,
      },
    },
    'Fetching payments with filters'
  )

  // Construir filtro dinámico
  const where: PaymentWhereInput = {}

  // Filtro de búsqueda global (por cliente o proyecto)
  // Usa normalize_text() de PostgreSQL para ignorar acentos/tildes
  // Ej: "garcia" encuentra "García", "perez" encuentra "Pérez"
  if (search) {
    const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT pm.id
      FROM "Payment" pm
      JOIN "Customer" c ON c.id = pm."customerId"
      LEFT JOIN "PaymentAllocation" pa ON pa."paymentId" = pm.id
      LEFT JOIN "Project" p ON p.id = pa."projectId"
      WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
         OR normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`})
         OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`})
    `
    where.id = { in: matchingIds.map((r) => r.id) }
  }

  // Filtro por tipo de pago
  if (type && (type === 'Project' || type === 'Customer')) {
    where.type = type
  }

  // Filtro por método de pago
  if (paymentMethodId) {
    where.paymentMethodId = paymentMethodId
  }

  // Filtro por número de proyecto (via allocations)
  if (projectNumber) {
    where.allocations = {
      some: {
        project: {
          projectNumber: projectNumber,
        },
      },
    }
  }

  if (customerId) {
    where.customerId = customerId
  }

  // Filtro de rango de fechas
  if (startDate || endDate) {
    where.date = {}
    if (startDate) {
      where.date.gte = new Date(startDate)
    }
    if (endDate) {
      where.date.lte = new Date(endDate)
    }
  }

  // Filtro por proyecto (via allocations) - Si ya hay filtro de projectNumber, combinar
  if (projectId && !projectNumber) {
    where.allocations = {
      some: {
        projectId,
      },
    }
  }

  try {
    // Queries base: pagos + count (siempre se ejecutan)
    const baseQueries = [
      // Query principal
      prisma.payment.findMany({
        relationLoadStrategy: 'join',
        where,
        skip,
        take: limit,
        orderBy: (() => {
          if (!sortBy) return { date: 'desc' } as Prisma.PaymentOrderByWithRelationInput
          const order = sortOrder || 'asc'
          if (sortBy === 'paymentMethodName') return { paymentMethod: { name: order } }
          return { [sortBy]: order } as Prisma.PaymentOrderByWithRelationInput
        })(),
        include: {
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
                  totalAmount: true,
                  currency: true,
                },
              },
            },
            orderBy: {
              project: {
                createdAt: 'asc',
              },
            },
          },
        },
      }),
      // Count total
      prisma.payment.count({ where }),
    ] as const

    // Facets: solo si el cliente las solicita (carga inicial + cambio de filtros)
    if (includeFacets) {
      const [
        payments,
        total,
        typeFacets,
        paymentMethodFacets,
        projectNumberFacets,
        paymentMethods,
      ] = await Promise.all([
        ...baseQueries,
        // Facet: tipo de pago
        prisma.payment.groupBy({
          by: ['type'],
          where,
          _count: true,
        }),
        // Facet: método de pago
        prisma.payment.groupBy({
          by: ['paymentMethodId'],
          where,
          _count: true,
        }),
        // Facet: números de proyecto (raw query para aplanar allocations)
        prisma.$queryRaw<Array<{ projectNumber: string; count: bigint }>>`
          SELECT p."projectNumber", COUNT(*) as count
          FROM "PaymentAllocation" pa
          JOIN "Project" p ON pa."projectId" = p.id
          JOIN "Payment" pm ON pa."paymentId" = pm.id
          ${search ? Prisma.sql`JOIN "Customer" c ON c.id = pm."customerId"` : Prisma.empty}
          WHERE 1=1
            ${search ? Prisma.sql`AND (normalize_text(c.name) LIKE normalize_text(${`%${search}%`}) OR normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`}) OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`}))` : Prisma.empty}
            ${type ? Prisma.sql`AND pm.type = ${type}` : Prisma.empty}
            ${paymentMethodId ? Prisma.sql`AND pm."paymentMethodId"::text = ${paymentMethodId}` : Prisma.empty}
            ${customerId ? Prisma.sql`AND pm."customerId"::text = ${customerId}` : Prisma.empty}
            ${startDate ? Prisma.sql`AND pm.date >= ${new Date(startDate)}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND pm.date <= ${new Date(endDate)}` : Prisma.empty}
          GROUP BY p."projectNumber"
          ORDER BY p."projectNumber"
        `,
        // Nombres de métodos de pago (para labels de facets)
        prisma.paymentMethod.findMany({
          where: { active: true },
          select: { id: true, name: true },
        }),
      ])

      const paymentMethodMap = new Map(paymentMethods.map((pm) => [pm.id, pm.name]))
      const validPaymentMethodFacets = paymentMethodFacets.filter((f) => f.paymentMethodId !== null)

      logger.info(
        { found: payments.length, total, page, includeFacets: true },
        'Payments fetched successfully'
      )

      return NextResponse.json({
        payments,
        pagination: buildPaginationResponse(page, limit, total),
        facets: {
          type: typeFacets.map((f) => ({
            value: f.type,
            label: f.type === 'Project' ? 'Proyecto' : 'Cliente',
            count: f._count,
          })),
          paymentMethod: validPaymentMethodFacets.map((f) => ({
            value: f.paymentMethodId as string,
            label: paymentMethodMap.get(f.paymentMethodId as string) || f.paymentMethodId,
            count: f._count,
          })),
          projectNumber: projectNumberFacets.map((f) => ({
            value: f.projectNumber,
            label: f.projectNumber,
            count: Number(f.count),
          })),
        },
      })
    }

    // Sin facets: solo pagos + count
    const [payments, total] = await Promise.all(baseQueries)

    logger.info(
      { found: payments.length, total, page, includeFacets: false },
      'Payments fetched successfully'
    )

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching payments')
    return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 })
  }
})

/**
 * POST /api/payments
 *
 * Crea un nuevo pago
 *
 * Body:
 *   - customerId: string (requerido)
 *   - amount: number (requerido)
 *   - currency: string (requerido, ej: 'CLP')
 *   - date: ISO date string (requerido)
 *   - paymentMethodId: string (requerido)
 *   - reference: string (opcional, requerido si payment method lo requiere)
 *   - notes: string (opcional)
 *   - allocations: Array<{ projectId: string, allocatedAmount: number }> (min 1)
 */
export const POST = withApiHandler<CreatePaymentApiBody>(
  async (_request, logger, { body }) => {
    const payment = await createPayment(body, { prisma, logger })
    return NextResponse.json(payment, { status: 201 })
  },
  { bodySchema: createPaymentApiSchema, fallbackError: 'Error al crear pago' }
)
