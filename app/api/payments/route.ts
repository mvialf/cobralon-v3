import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { PaymentWhereInput } from '@/types/api'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import {
  canApplyCredit,
  getCustomerCreditBalance,
  lockCustomerCreditBalance,
} from '@/lib/business-logic/credit-management'
import { generatePrismaInstallmentsCreate } from '@/lib/business-logic/installments'
import {
  computePaymentCommission,
  distributeNetToInstallments,
} from '@/lib/business-logic/commission'
import {
  validatePaymentType,
  validatePaymentApplicationSum,
  validateNoDuplicateProjects,
  validateSameCustomer,
  validateSameCurrency,
} from '@/lib/validations/payment-business-rules'
import {
  createPaymentApiSchema,
  type CreatePaymentApiBody,
} from '@/lib/validations/payment-validations'
import type { PrismaTransaction } from '@/lib/db/types'
import { getProjectsFinancials } from '@/lib/business-logic/project-financials'

type ProjectApplicationWriter = PrismaTransaction & {
  creditTransaction: {
    createMany: (args: { data: CreditTransactionCreateManyRow[] }) => Promise<unknown>
    create: PrismaTransaction['creditTransaction']['create']
  }
  projectApplication: {
    createMany: (args: { data: ProjectApplicationCreateManyRow[] }) => Promise<unknown>
  }
}

type NormalizedAllocation = CreatePaymentApiBody['allocations'][number] & {
  creditApplied: number
}

type ProjectApplicationCreateManyRow = {
  projectId: string
  customerId: string
  paymentId: string
  paymentAllocationId?: string
  creditTransactionId?: string
  amount: Prisma.Decimal
  sourceType: 'CASH' | 'CUSTOMER_CREDIT'
}

type CreditTransactionCreateManyRow = {
  id: string
  customerId: string
  amount: Prisma.Decimal
  type: 'APPLIED' | 'OVERPAYMENT'
  description: string
  paymentId: string
  projectId: string
  metadata: Prisma.InputJsonValue
}

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
  const { page, limit, skip } = parsePaginationParams(searchParams)

  // Filtros de server-side filtering
  const rawSearch = searchParams.get('search') || ''
  // Escapa caracteres especiales de LIKE (% y _) para evitar patrones no intencionales
  const search = rawSearch.replace(/([%_])/g, '\\$1')
  const type = searchParams.get('type') || ''
  const paymentMethodId = searchParams.get('paymentMethodId') || ''
  const projectNumber = searchParams.get('projectNumber') || ''

  // Filtros existentes
  const customerId = searchParams.get('customerId') || ''
  const projectId = searchParams.get('projectId') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const includeFacets = searchParams.get('includeFacets') === 'true'

  // Sorting params con validación Zod
  const sortBySchema = z.enum(['date', 'amount', 'type', 'paymentMethodName']).optional()
  const sortOrderSchema = z.enum(['asc', 'desc']).optional()
  const sortBy = sortBySchema.safeParse(searchParams.get('sortBy') || undefined).data
  const sortOrder = sortOrderSchema.safeParse(searchParams.get('sortOrder') || undefined).data

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

  // Construir filtro dinámico
  const where: PaymentWhereInput = {}

  // Filtro de búsqueda global (por cliente o proyecto)
  // Usa normalize_text() de PostgreSQL para ignorar acentos/tildes
  // Ej: "garcia" encuentra "García", "perez" encuentra "Pérez"
  if (search) {
    const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT pm.id
      FROM "Payment" pm
      JOIN "Customer" c ON c.id = pm."customerId"
      LEFT JOIN "PaymentAllocation" pa ON pa."paymentId" = pm.id
      LEFT JOIN "Project" p ON p.id = pa."projectId"
      WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
         OR normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`})
         OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`})
    `
    where.id = { in: matchingIds.map((r) => r.id) }
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
        orderBy: (() => {
          if (!sortBy) return { date: 'desc' } as Prisma.PaymentOrderByWithRelationInput
          const order = sortOrder || 'asc'
          if (sortBy === 'paymentMethodName') return { paymentMethod: { name: order } }
          return { [sortBy]: order } as Prisma.PaymentOrderByWithRelationInput
        })(),
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
              projectId: true,
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
            ${search ? Prisma.sql`AND (normalize_text(c.name) LIKE normalize_text(${`%${search}%`}) OR normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`}) OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`}))` : Prisma.empty}
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
        pagination: buildPaginationResponse(page, limit, total),
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
export const POST = withApiHandler<CreatePaymentApiBody>(
  async (_request, logger, { body }) => {
    const {
      type,
      customerId,
      amount,
      currency,
      date,
      paymentMethodId,
      reference,
      notes,
      allocations: rawAllocations,
      selectedInstallments,
      creditApplied: legacyCreditApplied,
    } = body
    const parsedAllocationCreditTotal = rawAllocations.reduce(
      (sum, allocation) => sum + (allocation.creditApplied ?? 0),
      0
    )
    const allocations: NormalizedAllocation[] = rawAllocations.map((allocation, index) => ({
      ...allocation,
      creditApplied:
        index === 0 &&
        type === 'Project' &&
        parsedAllocationCreditTotal === 0 &&
        legacyCreditApplied > 0
          ? legacyCreditApplied
          : (allocation.creditApplied ?? 0),
    }))
    const totalCreditToApply = allocations.reduce((sum, a) => sum + a.creditApplied, 0)

    // Child logger con contexto de negocio
    const paymentLogger = logger.child({
      type,
      customerId,
      amount,
      currency,
      allocationCount: allocations.length,
    })

    paymentLogger.info('Payment creation requested')

    // Pre-calcular projectIds para query en paralelo
    const projectIds = allocations.map((a) => a.projectId)

    // Defer: iniciar 3 queries a DB antes de validaciones sync
    const dbQueriesPromise = Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.paymentMethod.findUnique({
        where: { id: paymentMethodId },
        include: { commissionTiers: true },
      }),
      prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, customerId: true, currency: true, projectNumber: true },
      }),
    ])

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
        { projectIds: allocations.map((a) => a.projectId) },
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

    // ========================================================================
    // CRÉDITO A APLICAR (se valida dentro de la transacción con datos frescos)
    // ========================================================================
    const legacyCreditToApply = legacyCreditApplied || 0
    if (legacyCreditToApply > 0 && type !== 'Project') {
      return NextResponse.json(
        { error: 'El crédito top-level solo puede aplicarse a pagos de proyecto' },
        { status: 400 }
      )
    }

    // Verificar que la suma de allocations sea igual al total aplicado.
    // Payment.amount es dinero nuevo; creditApplied es aplicación separada.
    // Usa validación centralizada de payment-business-rules.ts
    const sumValidation = validatePaymentApplicationSum(
      type,
      amount,
      totalCreditToApply,
      allocations
    )
    if (!sumValidation.valid) {
      paymentLogger.warn(
        {
          expected: amount,
          actual: allocations.reduce((s, a) => s + a.allocatedAmount, 0),
        },
        'Allocation sum mismatch'
      )
      return NextResponse.json({ error: sumValidation.error }, { status: 400 })
    }

    paymentLogger.debug('All validations passed')

    // Crear el pago con sus allocations en una transacción
    const paymentDate = new Date(date)

    // Calcular comisión del método de pago
    const commissionTiers = paymentMethod.commissionTiers.map((t) => ({
      minInstallments: t.minInstallments,
      maxInstallments: t.maxInstallments,
      percentageFee: Number(t.percentageFee),
      fixedFee: Number(t.fixedFee),
    }))
    const commissionResult = computePaymentCommission(amount, commissionTiers, selectedInstallments)

    paymentLogger.info(
      {
        installments: selectedInstallments || 1,
        hasInstallments: !!selectedInstallments && selectedInstallments > 1,
        creditApplied: totalCreditToApply,
        commission: commissionResult
          ? { amount: commissionResult.commissionAmount, rate: commissionResult.percentageFee }
          : null,
      },
      'Creating payment in database'
    )

    // ========================================================================
    // TRANSACCIÓN ATÓMICA: Crear payment + aplicar créditos + sobrepagos
    // ========================================================================
    // TODO EL PROCESO ocurre en UNA SOLA transacción para garantizar consistencia:
    // 1. Crear payment con allocations e installments
    // 2. Aplicar crédito si corresponde (creditApplied > 0)
    // 3. Detectar sobrepagos con balance derivado y generar créditos automáticamente

    const transactionStartedAt = Date.now()
    const payment = await prisma.$transaction(async (tx: PrismaTransaction) => {
      const initialFinancials = await getProjectsFinancials(projectIds, tx)

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
          commissionAmount: commissionResult
            ? new Decimal(commissionResult.commissionAmount)
            : null,
          netAmount: commissionResult ? new Decimal(commissionResult.netAmount) : null,
          commissionRate: commissionResult ? new Decimal(commissionResult.percentageFee) : null,
          commissionFixed: commissionResult ? new Decimal(commissionResult.fixedFee) : null,
          allocations: {
            create: allocations
              .filter((a) => a.allocatedAmount > 0)
              .map((a) => ({
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
              projectId: true,
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
              netAmount: true,
              dueDate: true,
            },
            orderBy: { installmentNumber: 'asc' },
          },
        },
      })

      paymentLogger.debug({ paymentId: newPayment.id }, 'Payment created in transaction')

      // ====================================================================
      // PASO 1b: Distribuir neto entre installments (si hay comisión y cuotas)
      // ====================================================================
      if (commissionResult && newPayment.installments.length > 1) {
        const installmentAmounts = newPayment.installments.map((inst) => Number(inst.amount))
        const netAmounts = distributeNetToInstallments(
          installmentAmounts,
          commissionResult.netAmount
        )

        await Promise.all(
          newPayment.installments.map((inst, idx) =>
            tx.installment.update({
              where: { id: inst.id },
              data: { netAmount: new Decimal(netAmounts[idx]) },
            })
          )
        )

        paymentLogger.debug(
          { installmentCount: newPayment.installments.length },
          'Net amounts distributed to installments'
        )
      }

      // ====================================================================
      // PASO 2: Aplicar crédito del cliente (si corresponde)
      // Lectura + validación + aplicación DENTRO de la transacción para
      // evitar race conditions en creditBalance
      // ====================================================================
      const creditByProject = new Map<string, number>(
        allocations
          .filter((allocation) => allocation.creditApplied > 0)
          .map((allocation) => [allocation.projectId, allocation.creditApplied])
      )
      const appliedCreditTransactionByProject = new Map<string, string>()

      if (totalCreditToApply > 0) {
        const locked = await lockCustomerCreditBalance(customerId, tx)
        if (!locked) {
          throw new BusinessError('Cliente no encontrado durante validación de crédito', 404)
        }

        // Leer datos DENTRO de la transacción (snapshot consistente)
        const customerCreditBalance = await getCustomerCreditBalance(customerId, tx)

        if (totalCreditToApply > customerCreditBalance) {
          throw new BusinessError(
            `Crédito insuficiente. Disponible: $${customerCreditBalance.toLocaleString('es-CL')}`,
            400
          )
        }

        for (const allocation of allocations) {
          const creditAmount = allocation.creditApplied
          if (creditAmount <= 0) continue

          const projectFinancials = initialFinancials.get(allocation.projectId)
          if (!projectFinancials) {
            throw new BusinessError('Proyecto no encontrado durante validación de crédito', 404)
          }

          const balanceAfterCash = Math.max(
            0,
            projectFinancials.balance - allocation.allocatedAmount
          )
          const creditValidation = canApplyCredit(
            creditAmount,
            customerCreditBalance,
            balanceAfterCash
          )
          if (!creditValidation.valid) {
            throw new BusinessError(creditValidation.error!, 400)
          }
        }

        const appliedCreditRows = allocations
          .filter((allocation) => allocation.creditApplied > 0)
          .map((allocation) => {
            const creditTransactionId = randomUUID()
            appliedCreditTransactionByProject.set(allocation.projectId, creditTransactionId)

            return {
              id: creditTransactionId,
              customerId,
              amount: new Prisma.Decimal(-allocation.creditApplied), // Negativo = salida de crédito
              type: 'APPLIED' as const,
              description: `Crédito aplicado al pago ${newPayment.id.slice(0, 8)}`,
              paymentId: newPayment.id,
              projectId: allocation.projectId,
              metadata: {
                paymentAmount: amount,
                creditApplied: allocation.creditApplied,
                paymentDate: paymentDate.toISOString(),
              },
            }
          })

        if (appliedCreditRows.length > 0) {
          await (tx as ProjectApplicationWriter).creditTransaction.createMany({
            data: appliedCreditRows,
          })
        }

        paymentLogger.info(
          {
            paymentId: newPayment.id,
            creditApplied: totalCreditToApply,
            previousCredit: customerCreditBalance,
          },
          'Credit applied successfully in transaction'
        )
      }

      const projectApplicationRows: ProjectApplicationCreateManyRow[] = []

      const paymentAllocationByProject = new Map(
        newPayment.allocations.map((allocation) => [
          allocation.project.id,
          { id: allocation.id, amount: Number(allocation.allocatedAmount) },
        ])
      )
      for (const project of projects) {
        const startingFinancials = initialFinancials.get(project.id)
        if (!startingFinancials) {
          throw new BusinessError('Proyecto no encontrado durante aplicación de pago', 404)
        }

        const allocation = paymentAllocationByProject.get(project.id)
        const cashAmount = allocation?.amount ?? 0
        const creditAmount = creditByProject.get(project.id) ?? 0
        const cashApplicationAmount = cashAmount

        if (allocation && cashApplicationAmount > 0) {
          projectApplicationRows.push({
            projectId: project.id,
            customerId: project.customerId,
            paymentId: newPayment.id,
            paymentAllocationId: allocation.id,
            amount: new Prisma.Decimal(cashApplicationAmount),
            sourceType: 'CASH',
          })
        }

        if (creditAmount > 0) {
          const appliedCreditTransactionId = appliedCreditTransactionByProject.get(project.id)
          if (!appliedCreditTransactionId) {
            throw new BusinessError('No se pudo registrar la aplicación de crédito', 500)
          }

          projectApplicationRows.push({
            projectId: project.id,
            customerId: project.customerId,
            paymentId: newPayment.id,
            creditTransactionId: appliedCreditTransactionId,
            amount: new Prisma.Decimal(creditAmount),
            sourceType: 'CUSTOMER_CREDIT',
          })
        }
      }

      if (projectApplicationRows.length > 0) {
        await (tx as ProjectApplicationWriter).projectApplication.createMany({
          data: projectApplicationRows,
        })
      }

      // ====================================================================
      // PASO 3: Detectar sobrepagos y generar créditos automáticamente
      // ====================================================================
      // Si el pago causó que algún proyecto tenga balance negativo (sobrepago),
      // el excedente se convierte automáticamente en crédito del cliente

      paymentLogger.debug({ projectIds }, 'Checking for overpayments in transaction')

      const allocationByProject = new Map(
        allocations.map((allocation) => [allocation.projectId, allocation.allocatedAmount])
      )
      const overpaymentRows: CreditTransactionCreateManyRow[] = []

      for (const project of projects) {
        const startingFinancials = initialFinancials.get(project.id)
        if (!startingFinancials) {
          throw new BusinessError('Proyecto no encontrado durante validación de sobrepago', 404)
        }

        const allocatedAmount = allocationByProject.get(project.id) ?? 0
        const creditAppliedToProject = creditByProject.get(project.id) ?? 0
        const cashCapacityAfterCredit = Math.max(
          0,
          startingFinancials.balance - creditAppliedToProject
        )
        const overpaymentAmount = Math.max(0, allocatedAmount - cashCapacityAfterCredit)

        if (overpaymentAmount > 0) {
          const rawBalanceAfterPayment =
            startingFinancials.rawBalance - allocatedAmount - creditAppliedToProject

          paymentLogger.info(
            {
              projectId: project.id,
              projectNumber: project.projectNumber,
              previousBalance: startingFinancials.balance,
              rawBalanceAfterPayment,
              overpaymentAmount,
            },
            'Overpayment detected - converting to customer credit'
          )

          overpaymentRows.push({
            id: randomUUID(),
            customerId: project.customerId,
            amount: new Prisma.Decimal(overpaymentAmount), // Positivo = entrada de crédito
            type: 'OVERPAYMENT',
            description: `Sobrepago generado en proyecto P-${project.projectNumber}`,
            paymentId: newPayment.id,
            projectId: project.id,
            metadata: {
              paymentAmount: amount,
              creditApplied: creditAppliedToProject,
              projectBalance: rawBalanceAfterPayment,
              overpaymentAmount,
              paymentDate: paymentDate.toISOString(),
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

      if (overpaymentRows.length > 0) {
        await (tx as ProjectApplicationWriter).creditTransaction.createMany({
          data: overpaymentRows,
        })
      }

      return newPayment
    })
    const transactionDurationMs = Date.now() - transactionStartedAt

    paymentLogger.info(
      {
        paymentId: payment.id,
        allocationsCreated: payment.allocations.length,
        installmentsCreated: payment.installments.length,
        creditApplied: totalCreditToApply,
        transactionDurationMs,
      },
      'Payment created successfully (atomic transaction completed)'
    )

    return NextResponse.json(payment, { status: 201 })
  },
  { bodySchema: createPaymentApiSchema, fallbackError: 'Error al crear pago' }
)
