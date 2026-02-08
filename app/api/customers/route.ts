import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { withLogging } from '@/lib/logger-middleware'

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
 * Body:
 *   - name: string (requerido)
 *   - email: string (opcional)
 *   - phone: string (opcional)
 */
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
  const { name, email, phone } = body

  // Child logger con contexto de negocio
  const customerLogger = logger.child({
    name,
    email: email || undefined,
    phone,
  })

  customerLogger.info('Customer creation requested')

  try {
    // Validación básica
    customerLogger.debug('Starting validations')

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      customerLogger.warn('Missing or invalid name')
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Validar teléfono (obligatorio)
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      customerLogger.warn('Missing or invalid phone')
      return NextResponse.json({ error: 'El teléfono es requerido' }, { status: 400 })
    }

    // Validar email si se proporciona (opcional)
    if (email && typeof email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        customerLogger.warn({ email }, 'Invalid email format')
        return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })
      }

      // Verificar si el email ya existe
      customerLogger.debug({ email }, 'Checking for duplicate email')
      const existingCustomer = await prisma.customer.findFirst({
        where: { email },
      })
      if (existingCustomer) {
        customerLogger.warn({ email }, 'Email already exists')
        return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 })
      }
    }

    customerLogger.debug('Validations passed')

    // Crear cliente
    customerLogger.info('Creating customer in database')
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(), // Obligatorio
        email: email?.trim() || null, // Opcional
      },
    })

    customerLogger.info(
      {
        customerId: customer.id,
      },
      'Customer created successfully'
    )

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    customerLogger.error({ err: error }, 'Error creating customer')
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
})
