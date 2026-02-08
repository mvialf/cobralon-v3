import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer-validations'

/**
 * GET /api/customers
 *
 * Obtiene lista de clientes con paginación opcional
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - search: buscar por nombre, email o teléfono
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const search = searchParams.get('search') || ''

  // Sorting params con validación Zod
  const sortBySchema = z.enum(['name', 'createdAt', 'creditBalance']).optional()
  const sortOrderSchema = z.enum(['asc', 'desc']).optional()
  const sortBy = sortBySchema.safeParse(searchParams.get('sortBy') || undefined).data
  const sortOrder = sortOrderSchema.safeParse(searchParams.get('sortOrder') || undefined).data

  logger.debug(
    {
      page,
      limit,
      search: search || undefined,
    },
    'Fetching customers with filters'
  )

  try {
    const skip = (page - 1) * limit

    // Construir condición WHERE para búsqueda SQL
    // Usa `mode: insensitive` para búsqueda case-insensitive en PostgreSQL
    const whereCondition = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

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

    logger.info(
      {
        found: customers.length,
        total,
        page,
      },
      'Customers fetched successfully'
    )

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
