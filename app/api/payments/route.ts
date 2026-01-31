import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'
import { AllocationInput, PaymentWhereInput } from '@/types/api'
import { withLogging } from '@/lib/logger-middleware'
import { canApplyCredit } from '@/lib/business-logic/credit-management'
import { generatePrismaInstallmentsCreate } from '@/lib/business-logic/installments'
import {
  validatePaymentType,
  validateAllocationsSum,
  validateNoDuplicateProjects,
  validateSameCustomer,
  validateSameCurrency,
} from '@/lib/validations/payment-business-rules'
import {
  updateProjectBalance,
  type PrismaTransaction,
} from '@/lib/business-logic/update-project-balance'

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
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)

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

  const skip = (page - 1) * limit

  // Construir filtro dinámico
  const where: PaymentWhereInput = {}

  // Filtro de búsqueda global (por cliente o proyecto)
  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      {
        allocations: {
          some: {
            project: {
              OR: [
                { projectNumber: { contains: search, mode: 'insensitive' } },
                { projectName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      },
    ]
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
        orderBy: { date: 'desc' },
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
            ${search ? Prisma.sql`AND (c.name ILIKE ${`%${search}%`} OR p."projectNumber" ILIKE ${`%${search}%`} OR p."projectName" ILIKE ${`%${search}%`})` : Prisma.empty}
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
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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
    creditApplied, // ← Nuevo campo opcional
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
    // Pre-calcular projectIds para query en paralelo
    const projectIds = allocations?.map((a: AllocationInput) => a.projectId) ?? []

    // Defer: iniciar 3 queries a DB antes de validaciones sync
    const dbQueriesPromise = Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } }),
      projectIds.length > 0
        ? prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, customerId: true, currency: true },
          })
        : Promise.resolve([] as Array<{ id: string; customerId: string; currency: string }>),
    ])

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
    // Usa validación centralizada de payment-business-rules.ts
    const typeValidation = validatePaymentType(type, allocations)
    if (!typeValidation.valid) {
      paymentLogger.warn(
        { type, allocationCount: allocations.length },
        'Payment type validation failed'
      )
      return NextResponse.json({ error: typeValidation.error }, { status: 400 })
    }

    paymentLogger.debug('Basic validations passed')

    // Await de las 3 queries lanzadas antes de validaciones
    paymentLogger.debug('Validating customer, payment method and projects exist')
    const [customerExists, paymentMethod, projects] = await dbQueriesPromise

    if (!customerExists) {
      paymentLogger.warn('Customer not found')
      return NextResponse.json({ error: 'El cliente no existe' }, { status: 404 })
    }

    if (!paymentMethod) {
      paymentLogger.warn('Payment method not found')
      return NextResponse.json({ error: 'El método de pago no existe' }, { status: 404 })
    }

    // Verificar que no haya projectIds duplicados
    // Usa validación centralizada de payment-business-rules.ts
    const duplicatesValidation = validateNoDuplicateProjects(allocations)
    if (!duplicatesValidation.valid) {
      paymentLogger.warn(
        { projectIds: allocations.map((a: AllocationInput) => a.projectId) },
        'Duplicate project IDs detected'
      )
      return NextResponse.json({ error: duplicatesValidation.error }, { status: 400 })
    }

    // Verificar que todos los proyectos existen y pertenecen al mismo cliente
    paymentLogger.debug({ projectIds }, 'Validating projects')

    if (projects.length !== projectIds.length) {
      paymentLogger.warn(
        { expected: projectIds.length, found: projects.length },
        'Some projects not found'
      )
      return NextResponse.json({ error: 'Uno o más proyectos no existen' }, { status: 404 })
    }

    // Verificar que todos los proyectos pertenecen al mismo cliente
    // Usa validación centralizada de payment-business-rules.ts
    const customerValidation = validateSameCustomer(projects, customerId)
    if (!customerValidation.valid) {
      paymentLogger.warn('Not all projects belong to same customer')
      return NextResponse.json({ error: customerValidation.error }, { status: 400 })
    }

    // Verificar que todos los proyectos tienen la misma moneda
    // Usa validación centralizada de payment-business-rules.ts
    const currencyValidation = validateSameCurrency(projects, currency)
    if (!currencyValidation.valid) {
      paymentLogger.warn(
        { expected: currency, found: projects.map((p) => p.currency) },
        'Currency mismatch'
      )
      return NextResponse.json({ error: currencyValidation.error }, { status: 400 })
    }

    // Verificar que la suma de allocations sea igual al amount
    // Usa validación centralizada de payment-business-rules.ts
    const sumValidation = validateAllocationsSum(amount, allocations)
    if (!sumValidation.valid) {
      paymentLogger.warn(
        {
          expected: amount,
          actual: allocations.reduce((s: number, a: AllocationInput) => s + a.allocatedAmount, 0),
        },
        'Allocation sum mismatch'
      )
      return NextResponse.json({ error: sumValidation.error }, { status: 400 })
    }

    paymentLogger.debug('All validations passed')

    // ========================================================================
    // VALIDACIÓN DE CRÉDITO APLICADO (si aplica)
    // ========================================================================
    const creditToApply = creditApplied || 0
    let customerCreditBalance = 0

    if (creditToApply > 0) {
      paymentLogger.debug({ creditToApply }, 'Credit application requested')

      // Solo permitir aplicar crédito en pagos tipo "Project" con 1 allocation
      if (type !== 'Project' || allocations.length !== 1) {
        paymentLogger.warn('Credit can only be applied to Project payments with 1 allocation')
        return NextResponse.json(
          { error: 'El crédito solo puede aplicarse a pagos de proyecto únicos' },
          { status: 400 }
        )
      }

      // Obtener crédito del cliente y balance del proyecto (en paralelo)
      const [customer, creditProject] = await Promise.all([
        prisma.customer.findUnique({
          where: { id: customerId },
          select: { creditBalance: true },
        }),
        prisma.project.findUnique({
          where: { id: allocations[0].projectId },
          select: { balance: true },
        }),
      ])

      if (!customer) {
        paymentLogger.error('Customer not found during credit validation')
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }

      if (!creditProject) {
        paymentLogger.error('Project not found during credit validation')
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
      }

      customerCreditBalance = Number(customer.creditBalance)
      const projectBalance = Number(creditProject.balance)

      // Validar que se puede aplicar el crédito
      const validation = canApplyCredit(creditToApply, customerCreditBalance, projectBalance)

      if (!validation.valid) {
        paymentLogger.warn(
          {
            creditToApply,
            customerCredit: customerCreditBalance,
            projectBalance,
            error: validation.error,
          },
          'Credit validation failed'
        )
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      paymentLogger.info(
        { creditToApply, customerCredit: customerCreditBalance, projectBalance },
        'Credit validation passed'
      )
    }

    // Crear el pago con sus allocations en una transacción
    const paymentDate = new Date(date)

    paymentLogger.info(
      {
        installments: selectedInstallments || 1,
        hasInstallments: !!selectedInstallments && selectedInstallments > 1,
        creditApplied: creditToApply,
      },
      'Creating payment in database'
    )

    // ========================================================================
    // TRANSACCIÓN ATÓMICA: Crear payment + actualizar balances + sobrepagos
    // ========================================================================
    // TODO EL PROCESO ocurre en UNA SOLA transacción para garantizar consistencia:
    // 1. Crear payment con allocations e installments
    // 2. Aplicar crédito si corresponde (creditApplied > 0)
    // 3. Actualizar balances de todos los proyectos afectados
    // 4. Detectar sobrepagos y generar créditos automáticamente

    const payment = await prisma.$transaction(async (tx: PrismaTransaction) => {
      // ====================================================================
      // PASO 1: Crear el payment con allocations e installments
      // ====================================================================
      const newPayment = await tx.payment.create({
        data: {
          type,
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
          installments: generatePrismaInstallmentsCreate(
            amount,
            selectedInstallments,
            paymentDate,
            Decimal
          ),
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          paymentMethod: { select: { id: true, name: true, icon: true } },
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
            orderBy: { installmentNumber: 'asc' },
          },
        },
      })

      paymentLogger.debug({ paymentId: newPayment.id }, 'Payment created in transaction')

      // ====================================================================
      // PASO 2: Aplicar crédito del cliente (si corresponde)
      // ====================================================================
      if (creditToApply > 0) {
        // Reducir crédito del customer
        await tx.customer.update({
          where: { id: customerId },
          data: { creditBalance: { decrement: creditToApply } },
        })

        // Crear registro de transacción de crédito
        await tx.creditTransaction.create({
          data: {
            customerId,
            amount: new Prisma.Decimal(-creditToApply), // Negativo = salida de crédito
            type: 'APPLIED',
            description: `Crédito aplicado al pago ${newPayment.id.slice(0, 8)}`,
            paymentId: newPayment.id,
            projectId: allocations[0].projectId,
            metadata: {
              paymentAmount: amount,
              creditApplied: creditToApply,
              paymentDate: paymentDate.toISOString(),
            },
          },
        })

        paymentLogger.info(
          {
            paymentId: newPayment.id,
            creditApplied: creditToApply,
            newCustomerCredit: customerCreditBalance - creditToApply,
          },
          'Credit applied successfully in transaction'
        )
      }

      // ====================================================================
      // PASO 3: Actualizar balances de todos los proyectos (en la transacción)
      // ====================================================================
      paymentLogger.debug({ projectIds }, 'Updating project balances in transaction')

      for (const projectId of projectIds) {
        await updateProjectBalance(projectId, tx)
      }

      paymentLogger.debug('Project balances updated successfully in transaction')

      // ====================================================================
      // PASO 4: Detectar sobrepagos y generar créditos automáticamente
      // ====================================================================
      // Si el pago causó que algún proyecto tenga balance negativo (sobrepago),
      // el excedente se convierte automáticamente en crédito del cliente

      paymentLogger.debug({ projectIds }, 'Checking for overpayments in transaction')

      // Obtener proyectos actualizados para verificar si hay sobrepago
      const updatedProjects = await tx.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          id: true,
          projectNumber: true,
          balance: true,
          customerId: true,
        },
      })

      for (const project of updatedProjects) {
        const balance = Number(project.balance)

        // Si el balance es negativo, hay sobrepago
        if (balance < 0) {
          const overpaymentAmount = Math.abs(balance)

          paymentLogger.info(
            {
              projectId: project.id,
              projectNumber: project.projectNumber,
              negativeBalance: balance,
              overpaymentAmount,
            },
            'Overpayment detected - converting to customer credit'
          )

          // 1. Ajustar balance del proyecto a 0 (no puede ser negativo)
          await tx.project.update({
            where: { id: project.id },
            data: { balance: new Decimal(0) },
          })

          // 2. Incrementar crédito del cliente
          await tx.customer.update({
            where: { id: project.customerId },
            data: {
              creditBalance: {
                increment: overpaymentAmount,
              },
            },
          })

          // 3. Crear registro de transacción de crédito
          await tx.creditTransaction.create({
            data: {
              customerId: project.customerId,
              amount: new Prisma.Decimal(overpaymentAmount), // Positivo = entrada de crédito
              type: 'OVERPAYMENT',
              description: `Sobrepago generado en proyecto P-${project.projectNumber}`,
              paymentId: newPayment.id,
              projectId: project.id,
              metadata: {
                paymentAmount: amount,
                projectBalance: balance,
                overpaymentAmount,
                paymentDate: paymentDate.toISOString(),
              },
            },
          })

          paymentLogger.info(
            {
              projectId: project.id,
              projectNumber: project.projectNumber,
              creditGenerated: overpaymentAmount,
            },
            'Overpayment credit generated successfully in transaction'
          )
        }
      }

      return newPayment
    })

    paymentLogger.info(
      {
        paymentId: payment.id,
        allocationsCreated: payment.allocations.length,
        installmentsCreated: payment.installments.length,
        creditApplied: creditToApply,
      },
      'Payment created successfully (atomic transaction completed)'
    )

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    paymentLogger.error({ err: error }, 'Error creating payment')
    return NextResponse.json({ error: 'Error al crear pago' }, { status: 500 })
  }
})
