import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'
import { AllocationInput, PaymentWhereInput } from '@/types/api'
import { withLogging } from '@/lib/logger-middleware'
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'
import { canApplyCredit } from '@/lib/business-logic/credit-management'

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
    // Obtener pagos, total count y facets en paralelo
    const [payments, total, typeFacets, paymentMethodFacets, projectNumberFacets] =
      await Promise.all([
        // Query principal
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
        // Count total
        prisma.payment.count({ where }),
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
        SELECT p."projectNumber", COUNT(DISTINCT pa.id) as count
        FROM "PaymentAllocation" pa
        JOIN "Project" p ON pa."projectId" = p.id
        JOIN "Payment" pm ON pa."paymentId" = pm.id
        WHERE 1=1
          ${search ? Prisma.sql`AND (EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = pm."customerId" AND c.name ILIKE ${`%${search}%`}) OR p."projectNumber" ILIKE ${`%${search}%`} OR p."projectName" ILIKE ${`%${search}%`})` : Prisma.empty}
          ${type ? Prisma.sql`AND pm.type = ${type}` : Prisma.empty}
          ${paymentMethodId ? Prisma.sql`AND pm."paymentMethodId"::text = ${paymentMethodId}` : Prisma.empty}
          ${customerId ? Prisma.sql`AND pm."customerId"::text = ${customerId}` : Prisma.empty}
          ${startDate ? Prisma.sql`AND pm.date >= ${new Date(startDate)}` : Prisma.empty}
          ${endDate ? Prisma.sql`AND pm.date <= ${new Date(endDate)}` : Prisma.empty}
        GROUP BY p."projectNumber"
        ORDER BY p."projectNumber"
      `,
      ])

    // Obtener nombres de métodos de pago para los facets (filtrar nulls)
    const validPaymentMethodFacets = paymentMethodFacets.filter((f) => f.paymentMethodId !== null)
    const paymentMethodIds = validPaymentMethodFacets.map((f) => f.paymentMethodId) as string[]

    const paymentMethods =
      paymentMethodIds.length > 0
        ? await prisma.paymentMethod.findMany({
            where: { id: { in: paymentMethodIds } },
            select: { id: true, name: true },
          })
        : []

    const paymentMethodMap = new Map(paymentMethods.map((pm) => [pm.id, pm.name]))

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
      paymentLogger.warn(
        { expected: currency, found: projects.map((p) => p.currency) },
        'Currency mismatch'
      )
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

      // Obtener crédito actual del cliente
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { creditBalance: true },
      })

      if (!customer) {
        paymentLogger.error('Customer not found during credit validation')
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
      }

      customerCreditBalance = Number(customer.creditBalance)

      // Obtener balance del proyecto
      const project = await prisma.project.findUnique({
        where: { id: allocations[0].projectId },
        select: { balance: true },
      })

      if (!project) {
        paymentLogger.error('Project not found during credit validation')
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
      }

      const projectBalance = Number(project.balance)

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
    // CREAR PAYMENT (con crédito aplicado si aplica)
    // ========================================================================
    let payment

    if (creditToApply > 0) {
      // Usar transacción atómica para garantizar consistencia
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Crear el payment
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
            installments:
              selectedInstallments && selectedInstallments > 1
                ? {
                    create: Array.from({ length: selectedInstallments }, (_, i) => {
                      const installmentNumber = i + 1
                      const isLastInstallment = installmentNumber === selectedInstallments
                      const baseInstallmentAmount =
                        Math.floor((amount / selectedInstallments) * 100) / 100
                      const totalBase = baseInstallmentAmount * (selectedInstallments - 1)
                      const lastInstallmentAmount = amount - totalBase
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

        // 2. Reducir crédito del customer
        await tx.customer.update({
          where: { id: customerId },
          data: { creditBalance: { decrement: creditToApply } },
        })

        // 3. Crear registro de transacción de crédito
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

        return newPayment
      })

      payment = result
    } else {
      // Sin crédito aplicado: flujo original
      payment = await prisma.payment.create({
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
          installments:
            selectedInstallments && selectedInstallments > 1
              ? {
                  create: Array.from({ length: selectedInstallments }, (_, i) => {
                    const installmentNumber = i + 1
                    const isLastInstallment = installmentNumber === selectedInstallments
                    const baseInstallmentAmount =
                      Math.floor((amount / selectedInstallments) * 100) / 100
                    const totalBase = baseInstallmentAmount * (selectedInstallments - 1)
                    const lastInstallmentAmount = amount - totalBase
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
    }

    paymentLogger.info(
      {
        paymentId: payment.id,
        allocationsCreated: payment.allocations.length,
        installmentsCreated: payment.installments.length,
        creditApplied: creditToApply,
      },
      'Payment created successfully'
    )

    // Actualizar balance de todos los proyectos afectados
    paymentLogger.debug({ projectIds }, 'Updating project balances')
    try {
      await updateMultipleProjectBalances(projectIds)
      paymentLogger.debug('Project balances updated successfully')
    } catch (balanceError) {
      // Log error pero no fallar la petición (el job nocturno corregirá inconsistencias)
      paymentLogger.error(
        { err: balanceError, projectIds },
        'Error updating project balances - will be fixed by reconciliation job'
      )
    }

    // ========================================================================
    // GENERACIÓN AUTOMÁTICA DE CRÉDITO POR SOBREPAGO
    // ========================================================================
    // Si el pago causó que algún proyecto tenga balance negativo (sobrepago),
    // el excedente se convierte automáticamente en crédito del cliente

    paymentLogger.debug({ projectIds }, 'Checking for overpayments')

    // Obtener proyectos actualizados para verificar si hay sobrepago
    const updatedProjects = await prisma.project.findMany({
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

        try {
          // Transacción atómica para garantizar consistencia
          await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
                paymentId: payment.id,
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
              'Overpayment credit generated successfully'
            )
          })
        } catch (creditError) {
          // Log error crítico pero no fallar la petición
          // El job de reconciliación detectará y corregirá esta inconsistencia
          paymentLogger.error(
            {
              err: creditError,
              projectId: project.id,
              overpaymentAmount,
            },
            'CRITICAL: Failed to generate overpayment credit - manual intervention required'
          )
        }
      }
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    paymentLogger.error({ err: error }, 'Error creating payment')
    return NextResponse.json({ error: 'Error al crear pago' }, { status: 500 })
  }
})
