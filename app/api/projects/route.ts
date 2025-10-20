import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * GET /api/projects
 *
 * Obtiene lista de proyectos con paginaci�n opcional
 *
 * Query params:
 *   - page: n�mero de p�gina (default: 1)
 *   - limit: registros por p�gina (default: 10, max: 100)
 *   - search: buscar por nombre de proyecto, n�mero o cliente
 *   - customerId: filtrar por cliente espec�fico
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search') || ''
    const customerId = searchParams.get('customerId') || ''

    const skip = (page - 1) * limit

    // Construir filtro de b�squeda
    const where: any = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (search) {
      where.OR = [
        { projectNumber: { contains: search, mode: 'insensitive' as const } },
        { projectName: { contains: search, mode: 'insensitive' as const } },
        { projectStatus: { name: { contains: search, mode: 'insensitive' as const } } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
      ]
    }

    // Obtener proyectos y total count
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          projectStatus: {
            select: {
              id: true,
              name: true,
              color: {
                select: {
                  bgClass: true,
                },
              },
            },
          },
          paymentAllocations: {
            select: {
              allocatedAmount: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ])

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
  }
}

/**
 * POST /api/projects
 *
 * Crea un nuevo proyecto
 *
 * Body:
 *   - customerId: string (requerido)
 *   - projectNumber: string (requerido)
 *   - projectName: string (opcional)
 *   - phone: string (requerido)
 *   - projectStatusId: string (opcional - FK a ProjectStatus)
 *   - date: ISO date string
 *   - subtotal: number (requerido)
 *   - taxRate: number (default: 19)
 *   - total: number (calculado)
 *   - windowsCount: number (default: 0)
 *   - squareMeters: number (default: 0)
 *   - description: string (opcional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customerId,
      projectNumber,
      projectName,
      phone,
      street,
      apartment,
      comuna,
      region,
      projectStatusId,
      date,
      subtotal,
      taxRate,
      total,
      totalAmount, // Para sistema de pagos
      currency, // Para sistema de pagos
      windowsCount,
      squareMeters,
      description,
    } = body

    // Validaciones b�sicas
    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json({ error: 'El cliente es requerido' }, { status: 400 })
    }

    if (!projectNumber || typeof projectNumber !== 'string' || projectNumber.trim().length === 0) {
      return NextResponse.json({ error: 'El n�mero de proyecto es requerido' }, { status: 400 })
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
      return NextResponse.json({ error: 'El tel�fono es requerido' }, { status: 400 })
    }

    if (!street || typeof street !== 'string' || street.trim().length === 0) {
      return NextResponse.json({ error: 'La calle es obligatoria' }, { status: 400 })
    }

    if (!comuna || typeof comuna !== 'string' || comuna.trim().length === 0) {
      return NextResponse.json({ error: 'La comuna es obligatoria' }, { status: 400 })
    }

    if (!region || typeof region !== 'string' || region.trim().length === 0) {
      return NextResponse.json({ error: 'La región es obligatoria' }, { status: 400 })
    }

    if (subtotal === undefined || subtotal === null || typeof subtotal !== 'number') {
      return NextResponse.json({ error: 'El subtotal es requerido' }, { status: 400 })
    }

    if (subtotal <= 0) {
      return NextResponse.json({ error: 'El subtotal debe ser mayor a 0' }, { status: 400 })
    }

    // Verificar que el customer existe
    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customerExists) {
      return NextResponse.json({ error: 'El cliente no existe' }, { status: 404 })
    }

    // Calcular total si no viene en el body
    const finalTaxRate = taxRate ?? 19
    const calculatedTotal = total ?? subtotal + subtotal * (finalTaxRate / 100)

    // totalAmount es el mismo que calculatedTotal si no viene en el body
    const finalTotalAmount = totalAmount ?? calculatedTotal

    // Crear proyecto
    const project = await prisma.project.create({
      data: {
        customerId,
        projectNumber: projectNumber.trim(),
        projectName: projectName?.trim() || null,
        phone: phone.trim(),
        street: street.trim(),
        apartment: apartment?.trim() || null,
        comuna: comuna.trim(),
        region: region.trim(),
        projectStatusId: projectStatusId || null,
        date: date ? new Date(date) : new Date(),
        subtotal: new Decimal(subtotal),
        taxRate: new Decimal(finalTaxRate),
        total: new Decimal(calculatedTotal),
        totalAmount: finalTotalAmount ? new Decimal(finalTotalAmount) : null,
        currency: currency || 'CLP',
        windowsCount: windowsCount || 0,
        squareMeters: new Decimal(squareMeters || 0),
        description: description?.trim() || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        projectStatus: {
          select: {
            id: true,
            name: true,
            color: {
              select: {
                bgClass: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}
