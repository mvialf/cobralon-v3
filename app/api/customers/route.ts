import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Construir filtro de búsqueda
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Obtener clientes y total count
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])

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
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

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
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone } = body

    // Validación básica
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Validar teléfono (obligatorio)
    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return NextResponse.json({ error: 'El teléfono es requerido' }, { status: 400 })
    }

    // Validar email si se proporciona (opcional)
    if (email && typeof email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })
      }

      // Verificar si el email ya existe
      const existingCustomer = await prisma.customer.findFirst({
        where: { email },
      })
      if (existingCustomer) {
        return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 })
      }
    }

    // Crear cliente
    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(), // Obligatorio
        email: email?.trim() || null, // Opcional
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
  }
}
