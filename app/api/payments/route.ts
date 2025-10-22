import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { AllocationInput, PaymentWhereInput } from '@/types/api'

/**
 * GET /api/payments
 *
 * Obtiene lista de pagos con filtros opcionales
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - customerId: filtrar por cliente específico
 *   - projectId: filtrar por proyecto específico
 *   - status: filtrar por estado (ACTIVE o CANCELLED)
 *   - startDate: filtrar pagos desde esta fecha (ISO string)
 *   - endDate: filtrar pagos hasta esta fecha (ISO string)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const customerId = searchParams.get('customerId') || ''
    const projectId = searchParams.get('projectId') || ''
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const skip = (page - 1) * limit

    // Construir filtro dinámico
    const where: PaymentWhereInput = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (status) {
      where.status = status
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

    // Filtro por proyecto (via allocations)
    if (projectId) {
      where.allocations = {
        some: {
          projectId,
        },
      }
    }

    // Obtener pagos y total count
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' }, // Más recientes primero
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
              requiresReference: true,
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
                createdAt: 'asc', // Ordenar por FIFO
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ])

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
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 })
  }
}

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
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerId, amount, currency, date, paymentMethodId, reference, notes, allocations } =
      body

    // Validaciones básicas
    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json({ error: 'El cliente es requerido' }, { status: 400 })
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    if (!currency || typeof currency !== 'string' || currency.length !== 3) {
      return NextResponse.json(
        { error: 'La moneda debe ser un código de 3 letras' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })
    }

    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      return NextResponse.json({ error: 'El método de pago es requerido' }, { status: 400 })
    }

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: 'Debe asignar el pago a al menos un proyecto' },
        { status: 400 }
      )
    }

    // Verificar que el customer existe
    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customerExists) {
      return NextResponse.json({ error: 'El cliente no existe' }, { status: 404 })
    }

    // Verificar que el payment method existe
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    })

    if (!paymentMethod) {
      return NextResponse.json({ error: 'El método de pago no existe' }, { status: 404 })
    }

    // Verificar que se provee reference si es requerido
    if (paymentMethod.requiresReference && (!reference || reference.trim().length === 0)) {
      return NextResponse.json(
        { error: `El método de pago "${paymentMethod.name}" requiere una referencia` },
        { status: 400 }
      )
    }

    // Verificar que no haya projectIds duplicados
    const projectIds = allocations.map((a: AllocationInput) => a.projectId)
    if (new Set(projectIds).size !== projectIds.length) {
      return NextResponse.json(
        { error: 'No puede asignar el mismo proyecto dos veces' },
        { status: 400 }
      )
    }

    // Verificar que todos los proyectos existen y pertenecen al mismo cliente
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
      },
      select: {
        id: true,
        customerId: true,
        currency: true,
      },
    })

    if (projects.length !== projectIds.length) {
      return NextResponse.json({ error: 'Uno o más proyectos no existen' }, { status: 404 })
    }

    // Verificar que todos los proyectos pertenecen al mismo cliente
    const allSameCustomer = projects.every((p) => p.customerId === customerId)
    if (!allSameCustomer) {
      return NextResponse.json(
        { error: 'Todos los proyectos deben pertenecer al mismo cliente' },
        { status: 400 }
      )
    }

    // Verificar que todos los proyectos tienen la misma moneda
    const allSameCurrency = projects.every((p) => p.currency === currency)
    if (!allSameCurrency) {
      return NextResponse.json(
        { error: 'Todos los proyectos deben tener la misma moneda que el pago' },
        { status: 400 }
      )
    }

    // Verificar que la suma de allocations sea igual al amount (con tolerancia de decimales)
    const totalAllocated = allocations.reduce(
      (sum: number, a: AllocationInput) => sum + a.allocatedAmount,
      0
    )
    if (Math.abs(totalAllocated - amount) >= 0.01) {
      return NextResponse.json(
        { error: 'La suma de los montos asignados debe ser igual al monto total del pago' },
        { status: 400 }
      )
    }

    // Crear el pago con sus allocations en una transacción
    const payment = await prisma.payment.create({
      data: {
        customerId,
        amount: new Decimal(amount),
        currency,
        date: new Date(date),
        paymentMethodId,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
        status: 'ACTIVE',
        allocations: {
          create: allocations.map((a: AllocationInput) => ({
            projectId: a.projectId,
            allocatedAmount: new Decimal(a.allocatedAmount),
          })),
        },
      },
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
            requiresReference: true,
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
        },
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Error al crear pago' }, { status: 500 })
  }
}
