import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { withLogging } from '@/lib/logger-middleware'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer-validations'
import { getCustomerCreditBalances } from '@/lib/business-logic/credit-management'
import { FINANCIAL } from '@/lib/constants/financial-constants'

/**
 * GET /api/customers
 *
 * Obtiene lista de clientes con paginación opcional
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - search: buscar por nombre, email o teléfono
 *   - withPendingBalance: filtrar clientes con al menos un proyecto con saldo pendiente
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const { page, limit, skip } = parsePaginationParams(searchParams)
  const search = searchParams.get('search') || ''
  const withPendingBalance = searchParams.get('withPendingBalance') === 'true'

  // Sorting params con validación Zod
  const sortBySchema = z.enum(['name', 'createdAt', 'phone', 'email']).optional()
  const sortOrderSchema = z.enum(['asc', 'desc']).optional()
  const sortBy = sortBySchema.safeParse(searchParams.get('sortBy') || undefined).data
  const sortOrder = sortOrderSchema.safeParse(searchParams.get('sortOrder') || undefined).data

  logger.debug(
    {
      page,
      limit,
      search: search || undefined,
      withPendingBalance: withPendingBalance || undefined,
    },
    'Fetching customers with filters'
  )

  try {
    // Búsqueda normalizada (sin acentos, case-insensitive) via normalize_text() de PostgreSQL
    let whereCondition: Prisma.CustomerWhereInput = {}

    if (search || withPendingBalance) {
      const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT c.id
        FROM "Customer" c
        ${
          withPendingBalance
            ? Prisma.sql`
              JOIN "Project" p ON p."customerId" = c.id
              JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
            `
            : Prisma.empty
        }
        WHERE (
          normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
          OR normalize_text(COALESCE(c.email, '')) LIKE normalize_text(${`%${search}%`})
          OR normalize_text(c.phone) LIKE normalize_text(${`%${search}%`})
        )
        ${withPendingBalance ? Prisma.sql`AND pf.balance > ${FINANCIAL.BALANCE_TOLERANCE}` : Prisma.empty}
      `
      whereCondition = { id: { in: matchingIds.map((r) => r.id) } }
    }

    // Ejecutar queries en paralelo: total y datos paginados
    const [total, customers] = await Promise.all([
      prisma.customer.count({ where: whereCondition }),
      prisma.customer.findMany({
        where: whereCondition,
        orderBy: sortBy
          ? ({ [sortBy]: sortOrder || 'asc' } as Prisma.CustomerOrderByWithRelationInput)
          : { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    // Enriquecer con creditBalance y conteo de proyectos (queries batch en paralelo)
    const customerIds = customers.map((c) => c.id)
    const [creditMap, projectCounts, activeProjectCounts] = await Promise.all([
      getCustomerCreditBalances(customerIds),
      prisma.project.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds } },
        _count: true,
      }),
      customerIds.length > 0
        ? prisma.$queryRaw<Array<{ customerId: string; count: bigint }>>`
            SELECT p."customerId", COUNT(*)::bigint AS count
            FROM "Project" p
            JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
            LEFT JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
            WHERE p."customerId"::text = ANY(${customerIds})
              AND (pf.balance > ${FINANCIAL.BALANCE_TOLERANCE} OR ps."isFinal" IS NOT TRUE)
            GROUP BY p."customerId"
          `
        : Promise.resolve([]),
    ])

    const totalProjectsMap = new Map(projectCounts.map((r) => [r.customerId, r._count]))
    const activeProjectsMap = new Map(
      activeProjectCounts.map((r) => [r.customerId, Number(r.count)])
    )

    const customersWithCredit = customers.map((c) => ({
      ...c,
      creditBalance: creditMap.get(c.id) ?? 0,
      totalProjects: totalProjectsMap.get(c.id) ?? 0,
      activeProjects: activeProjectsMap.get(c.id) ?? 0,
    }))

    logger.info(
      {
        found: customers.length,
        total,
        page,
      },
      'Customers fetched successfully'
    )

    return NextResponse.json({
      customers: customersWithCredit,
      pagination: buildPaginationResponse(page, limit, total),
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching customers')
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
})

/**
 * POST /api/customers
 *
 * Crea un nuevo cliente
 *
 * Body validado con customerSchema:
 *   - name: string (min 2 chars)
 *   - phone: string (teléfono chileno, normalizado a E.164)
 *   - email: string (opcional)
 */
export const POST = withApiHandler<CustomerFormData>(
  async (_request, logger, { body }) => {
    const { name, email, phone } = body

    const customerLogger = logger.child({
      name,
      email: email || undefined,
      phone,
    })

    customerLogger.info('Customer creation requested')

    // Check email duplicado con mensaje explícito (mejor que P2002 genérico)
    if (email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { email },
      })
      if (existingCustomer) {
        throw new BusinessError('Ya existe un cliente con ese email', 409, 'EMAIL_DUPLICATE')
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email: email || null,
      },
    })

    customerLogger.info({ customerId: customer.id }, 'Customer created successfully')

    return NextResponse.json(customer, { status: 201 })
  },
  {
    bodySchema: customerSchema,
    fallbackError: 'Error al crear cliente',
  }
)
