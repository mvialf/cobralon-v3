import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { anyFieldMatchesSearch } from '@/lib/utils/normalize'

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

  logger.debug(
    {
      page,
      limit,
      search: search || undefined,
    },
    'Fetching customers with filters'
  )

  try {
    // Obtener todos los clientes (sin paginación inicial)
    const allCustomers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Filtrar con búsqueda normalizada (ignora acentos/tildes)
    // "jose" encontrará "José", "garcia" encontrará "García"
    const filteredCustomers = search
      ? allCustomers.filter((customer) =>
          anyFieldMatchesSearch([customer.name, customer.email, customer.phone], search)
        )
      : allCustomers

    // Aplicar paginación manualmente
    const total = filteredCustomers.length
    const skip = (page - 1) * limit
    const customers = filteredCustomers.slice(skip, skip + limit)

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
