import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { AllocationInput, PaymentWhereInput } from '@/types/api'
import { withLogging } from '@/lib/logger-middleware'

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
 *   - startDate: filtrar pagos desde esta fecha (ISO string)
 *   - endDate: filtrar pagos hasta esta fecha (ISO string)
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const customerId = searchParams.get('customerId') || ''
  const projectId = searchParams.get('projectId') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  logger.debug(
    {
      page,
      limit,
      filters: {
        customerId: customerId || undefined,
        projectId: projectId || undefined,
        dateRange: startDate || endDate ? { startDate, endDate } : undefined,
      },
    },
    'Fetching payments with filters'
  )

  const skip = (page - 1) * limit

  // Construir filtro dinámico
  const where: PaymentWhereInput = {}

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

  // Filtro por proyecto (via allocations)
  if (projectId) {
    where.allocations = {
      some: {
        projectId,
      },
    }
  }

  try {
    // Obtener pagos y total count
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        relationLoadStrategy: 'join', // ← Fix N+1: Force database-level JOINs
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

    logger.info(
      {
        found: payments.length,
        total,
        page,
      },
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
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
  const {
    type,
    customerId,
    amount,
    currency,
    date,
    paymentMethodId,
    reference,
    notes,
    allocations,
    selectedInstallments,
  } = body

  // Child logger con contexto de negocio
  const paymentLogger = logger.child({
    type,
    customerId,
    amount,
    currency,
    allocationCount: allocations?.length,
  })

  paymentLogger.info('Payment creation requested')

  try {
    // Validaciones básicas
    paymentLogger.debug('Starting basic validations')

    if (!type || (type !== 'Project' && type !== 'Customer')) {
      paymentLogger.warn({ providedType: type }, 'Invalid payment type')
      return NextResponse.json(
        { error: 'El tipo de pago debe ser "Project" o "Customer"' },
        { status: 400 }
      )
    }

    if (!customerId || typeof customerId !== 'string') {
      paymentLogger.warn('Missing or invalid customerId')
      return NextResponse.json({ error: 'El cliente es requerido' }, { status: 400 })
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      paymentLogger.warn({ amount }, 'Invalid amount')
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    if (!currency || typeof currency !== 'string' || currency.length !== 3) {
      paymentLogger.warn({ currency }, 'Invalid currency')
      return NextResponse.json(
        { error: 'La moneda debe ser un código de 3 letras' },
        { status: 400 }
      )
    }

    if (!date) {
      paymentLogger.warn('Missing date')
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })
    }

    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      paymentLogger.warn('Missing or invalid paymentMethodId')
      return NextResponse.json({ error: 'El método de pago es requerido' }, { status: 400 })
    }

    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      paymentLogger.warn('Missing or empty allocations')
      return NextResponse.json(
        { error: 'Debe asignar el pago a al menos un proyecto' },
        { status: 400 }
      )
    }

    // Validación estricta: type debe coincidir con número de allocations
    if (type === 'Project' && allocations.length !== 1) {
      paymentLogger.warn(
        { expected: 1, actual: allocations.length },
        'Project payment must have exactly 1 allocation'
      )
      return NextResponse.json(
        { error: 'Un pago tipo "Project" debe tener exactamente 1 asignación' },
        { status: 400 }
      )
    }

    if (type === 'Customer' && allocations.length < 1) {
      paymentLogger.warn(
        { actual: allocations.length },
        'Customer payment must have at least 1 allocation'
      )
      return NextResponse.json(
        { error: 'Un pago tipo "Customer" debe tener al menos 1 asignación' },
        { status: 400 }
      )
    }

    paymentLogger.debug('Basic validations passed')

    // Verificar que el customer existe
    paymentLogger.debug('Validating customer exists')
    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customerExists) {
      paymentLogger.warn('Customer not found')
      return NextResponse.json({ error: 'El cliente no existe' }, { status: 404 })
    }

    // Verificar que el payment method existe
    paymentLogger.debug({ paymentMethodId }, 'Validating payment method exists')
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    })

    if (!paymentMethod) {
      paymentLogger.warn('Payment method not found')
      return NextResponse.json({ error: 'El método de pago no existe' }, { status: 404 })
    }

    // Verificar que no haya projectIds duplicados
    const projectIds = allocations.map((a: AllocationInput) => a.projectId)
    if (new Set(projectIds).size !== projectIds.length) {
      paymentLogger.warn({ projectIds }, 'Duplicate project IDs detected')
      return NextResponse.json(
        { error: 'No puede asignar el mismo proyecto dos veces' },
        { status: 400 }
      )
    }

    // Verificar que todos los proyectos existen y pertenecen al mismo cliente
    paymentLogger.debug({ projectIds }, 'Validating projects')
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
      },
      select: {
        id: true,
        customerId: true,
        currency: true, // Solo traer campos necesarios para validación
      },
    })

    if (projects.length !== projectIds.length) {
      paymentLogger.warn(
        { expected: projectIds.length, found: projects.length },
        'Some projects not found'
      )
      return NextResponse.json({ error: 'Uno o más proyectos no existen' }, { status: 404 })
    }

    // Verificar que todos los proyectos pertenecen al mismo cliente
    const allSameCustomer = projects.every((p) => p.customerId === customerId)
    if (!allSameCustomer) {
      paymentLogger.warn('Not all projects belong to same customer')
      return NextResponse.json(
        { error: 'Todos los proyectos deben pertenecer al mismo cliente' },
        { status: 400 }
      )
    }

    // Verificar que todos los proyectos tienen la misma moneda
    const allSameCurrency = projects.every((p) => p.currency === currency)
    if (!allSameCurrency) {
      paymentLogger.warn({ expected: currency, found: projects.map((p) => p.currency) }, 'Currency mismatch')
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
    const diff = Math.abs(totalAllocated - amount)
    if (diff >= 0.01) {
      paymentLogger.warn(
        { expected: amount, actual: totalAllocated, diff },
        'Allocation sum mismatch'
      )
      return NextResponse.json(
        { error: 'La suma de los montos asignados debe ser igual al monto total del pago' },
        { status: 400 }
      )
    }

    paymentLogger.debug('All validations passed')

    // Crear el pago con sus allocations en una transacción
    const paymentDate = new Date(date)

    paymentLogger.info(
      {
        installments: selectedInstallments || 1,
        hasInstallments: !!selectedInstallments && selectedInstallments > 1,
      },
      'Creating payment in database'
    )

    const payment = await prisma.payment.create({
      data: {
        type, // ← Agregar tipo de pago
        customerId,
        amount: new Decimal(amount),
        currency,
        date: paymentDate,
        paymentMethodId,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
        selectedInstallments: selectedInstallments || null,
        allocations: {
          create: allocations.map((a: AllocationInput) => ({
            projectId: a.projectId,
            allocatedAmount: new Decimal(a.allocatedAmount),
          })),
        },
        // Crear installments automáticamente si aplica
        installments:
          selectedInstallments && selectedInstallments > 1
            ? {
                create: Array.from({ length: selectedInstallments }, (_, i) => {
                  const installmentNumber = i + 1
                  const isLastInstallment = installmentNumber === selectedInstallments

                  // Calcular monto de la cuota
                  // Dividir el total entre el número de cuotas, redondeando a 2 decimales
                  const baseInstallmentAmount =
                    Math.floor((amount / selectedInstallments) * 100) / 100
                  // Calcular el total de las cuotas base (todas menos la última)
                  const totalBase = baseInstallmentAmount * (selectedInstallments - 1)
                  // La última cuota absorbe la diferencia (centavos restantes)
                  const lastInstallmentAmount = amount - totalBase

                  // Calcular fecha de vencimiento
                  // Primera cuota: día 0 (fecha del pago)
                  // Subsecuentes: cada 30 días
                  const dueDate = new Date(paymentDate)
                  dueDate.setDate(dueDate.getDate() + (installmentNumber - 1) * 30)

                  return {
                    installmentNumber,
                    amount: new Decimal(
                      isLastInstallment ? lastInstallmentAmount : baseInstallmentAmount
                    ),
                    dueDate,
                    status: 'pending',
                  }
                }),
              }
            : undefined,
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
        installments: {
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            dueDate: true,
            paidDate: true,
            status: true,
          },
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
    })

    paymentLogger.info(
      {
        paymentId: payment.id,
        allocationsCreated: payment.allocations.length,
        installmentsCreated: payment.installments.length,
      },
      'Payment created successfully'
    )

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    paymentLogger.error({ err: error }, 'Error creating payment')
    return NextResponse.json({ error: 'Error al crear pago' }, { status: 500 })
  }
})
