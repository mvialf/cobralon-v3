import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { type ParsedPaymentRow } from '@/lib/excel/payment-parser'
import { Decimal } from '@prisma/client/runtime/library'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'

/**
 * POST /api/payments/import
 *
 * Importa múltiples pagos desde Excel (solo 1:1)
 *
 * Body:
 *   - payments: ParsedPaymentRow[] (array de pagos validados)
 */
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
  const { payments } = body

  logger.info({ count: payments?.length || 0 }, 'Payment import requested')

  try {
    // Validación de entrada
    if (!Array.isArray(payments) || payments.length === 0) {
      logger.warn('Invalid or empty payments array')
      return NextResponse.json({ error: 'Debe proporcionar un array de pagos' }, { status: 400 })
    }

    logger.debug({ count: payments.length }, 'Processing payments')

    // Pre-cargar todos los proyectos y métodos de pago para optimizar
    const allProjects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        customerId: true,
        currency: true,
      },
    })

    const allPaymentMethods = await prisma.paymentMethod.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        hasInstallments: true,
        maxInstallments: true,
      },
    })

    logger.debug(
      { projects: allProjects.length, methods: allPaymentMethods.length },
      'Loaded projects and payment methods'
    )

    // Crear mapas para búsqueda rápida
    const projectMap = new Map<string, (typeof allProjects)[0]>()
    allProjects.forEach((project) => {
      const normalized = project.projectNumber.toLowerCase().trim()
      projectMap.set(normalized, project)
    })

    const paymentMethodMap = new Map<string, (typeof allPaymentMethods)[0]>()
    allPaymentMethods.forEach((method) => {
      const normalized = method.name.toLowerCase().trim()
      paymentMethodMap.set(normalized, method)
    })

    // Procesar cada pago
    const results: Array<{ success: boolean; error?: string; projectNumber: string }> = []
    const createdPayments: string[] = []

    for (const paymentData of payments as ParsedPaymentRow[]) {
      try {
        logger.debug({ projectNumber: paymentData.projectNumber }, 'Processing payment')

        // 1. Buscar proyecto por número
        const normalizedProjectNumber = paymentData.projectNumber.toLowerCase().trim()
        const project = projectMap.get(normalizedProjectNumber)

        if (!project) {
          const error = `Proyecto "${paymentData.projectNumber}" no encontrado`
          logger.warn({ projectNumber: paymentData.projectNumber, error }, 'Project not found')

          results.push({
            success: false,
            error,
            projectNumber: paymentData.projectNumber,
          })
          continue
        }

        logger.debug({ projectId: project.id }, 'Project found')

        // 2. Buscar método de pago por nombre
        const normalizedMethodName = paymentData.paymentMethodName.toLowerCase().trim()
        const paymentMethod = paymentMethodMap.get(normalizedMethodName)

        if (!paymentMethod) {
          const error = `Método de pago "${paymentData.paymentMethodName}" no encontrado`
          logger.warn(
            { methodName: paymentData.paymentMethodName, error },
            'Payment method not found'
          )

          results.push({
            success: false,
            error,
            projectNumber: paymentData.projectNumber,
          })
          continue
        }

        logger.debug({ paymentMethodId: paymentMethod.id }, 'Payment method found')

        // 3. Validar cuotas si existe
        let selectedInstallments: number | null = null
        if (paymentData.selectedInstallments !== undefined) {
          if (!paymentMethod.hasInstallments) {
            const error = `Método de pago "${paymentMethod.name}" no permite cuotas`
            logger.warn({ methodName: paymentMethod.name, error }, 'Installments not allowed')

            results.push({
              success: false,
              error,
              projectNumber: paymentData.projectNumber,
            })
            continue
          }

          if (
            paymentMethod.maxInstallments &&
            paymentData.selectedInstallments > paymentMethod.maxInstallments
          ) {
            const error = `Método de pago "${paymentMethod.name}" permite máximo ${paymentMethod.maxInstallments} cuotas`
            logger.warn({ methodName: paymentMethod.name, error }, 'Too many installments')

            results.push({
              success: false,
              error,
              projectNumber: paymentData.projectNumber,
            })
            continue
          }

          selectedInstallments = paymentData.selectedInstallments
        }

        // 4. Crear pago con transacción (Payment + PaymentAllocation + ProjectApplication)
        const amount = new Decimal(paymentData.amount)

        const payment = await prisma.$transaction(async (tx) => {
          const financials = await getProjectFinancials(project.id, tx)
          if (!financials) {
            throw new Error(`No se pudo calcular balance del proyecto "${paymentData.projectNumber}"`)
          }

          // Crear Payment
          const newPayment = await tx.payment.create({
            data: {
              type: 'Project', // 1:1
              amount,
              currency: project.currency,
              date: paymentData.date,
              paymentMethodId: paymentMethod.id,
              customerId: project.customerId,
              reference: paymentData.reference || null,
              notes: paymentData.notes || null,
              selectedInstallments,
            },
          })

          // Crear PaymentAllocation (100% del monto al proyecto)
          const allocation = await tx.paymentAllocation.create({
            data: {
              paymentId: newPayment.id,
              projectId: project.id,
              allocatedAmount: amount,
            },
          })

          if (paymentData.amount > 0) {
            await tx.projectApplication.create({
              data: {
                projectId: project.id,
                customerId: project.customerId,
                paymentId: newPayment.id,
                paymentAllocationId: allocation.id,
                amount,
                sourceType: 'CASH',
                createdAt: allocation.createdAt,
              },
            })
          }

          const overpaymentAmount = Math.max(0, paymentData.amount - financials.balance)
          if (overpaymentAmount > 0) {
            await tx.creditTransaction.create({
              data: {
                customerId: project.customerId,
                amount: new Decimal(overpaymentAmount),
                type: 'OVERPAYMENT',
                description: `Sobrepago generado en importación - Proyecto P-${project.projectNumber}`,
                paymentId: newPayment.id,
                projectId: project.id,
                metadata: {
                  paymentAmount: paymentData.amount,
                  projectBalance: financials.balance - paymentData.amount,
                  overpaymentAmount,
                  imported: true,
                  paymentDate: paymentData.date.toISOString(),
                },
              },
            })
          }

          return newPayment
        })

        logger.info(
          {
            paymentId: payment.id,
            projectId: project.id,
            amount: amount.toFixed(2),
          },
          'Payment created successfully'
        )

        results.push({
          success: true,
          projectNumber: paymentData.projectNumber,
        })

        createdPayments.push(payment.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        logger.error(
          {
            projectNumber: paymentData.projectNumber,
            err: error,
          },
          'Error creating payment'
        )

        results.push({
          success: false,
          error: errorMessage,
          projectNumber: paymentData.projectNumber,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    logger.info(
      {
        imported: successCount,
        failed: failureCount,
        paymentIds: createdPayments,
      },
      'Import process completed'
    )

    if (failureCount > 0) {
      const failures = results.filter((r) => !r.success)

      return NextResponse.json(
        {
          success: false,
          imported: successCount,
          failed: failureCount,
          errors: failures,
          message: `Se importaron ${successCount} pagos, pero ${failureCount} fallaron.`,
        },
        { status: 207 } // Multi-status
      )
    }

    return NextResponse.json(
      {
        success: true,
        imported: successCount,
        paymentIds: createdPayments,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Error importing payments')
    return NextResponse.json({ error: 'Error al importar pagos' }, { status: 500 })
  }
})
