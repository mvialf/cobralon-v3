/**
 * Job de reconciliación de balances
 *
 * PROPÓSITO:
 * Safety net que detecta y corrige inconsistencias en los balances de proyectos
 *
 * CUÁNDO SE EJECUTA:
 * - Automáticamente: 2am todos los días (configurar en Vercel Cron o similar)
 * - Manual: GET /api/cron/reconcile-balances
 *
 * CONFIGURACIÓN VERCEL CRON (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/reconcile-balances",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * SEGURIDAD:
 * - En producción, agregar auth con CRON_SECRET
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateProjectBalance } from '@/lib/business-logic/project-balance'
import { Decimal } from '@prisma/client/runtime/library'
import { withLogging } from '@/lib/logger-middleware'
import { FINANCIAL } from '@/lib/constants/financial-constants'

interface ReconciliationResult {
  totalProjects: number
  checkedProjects: number
  inconsistentProjects: number
  fixedProjects: number
  totalCustomers: number
  checkedCustomers: number
  inconsistentCustomers: number
  fixedCustomers: number
  errors: number
  duration: number
  timestamp: string
  details: Array<{
    projectId: string
    projectNumber: string
    dbBalance: number
    calculatedBalance: number
    difference: number
  }>
  customerDetails: Array<{
    customerId: string
    customerName: string
    dbCreditBalance: number
    calculatedCreditBalance: number
    difference: number
  }>
}

export const GET = withLogging(async (request, logger) => {
  const startTime = Date.now()

  logger.info('Starting balance reconciliation job')

  try {
    // OPCIONAL: Verificar auth en producción
    // const authHeader = request.headers.get('authorization')
    // if (process.env.NODE_ENV === 'production') {
    //   if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     logger.warn('Unauthorized reconciliation attempt')
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    //   }
    // }

    const result: ReconciliationResult = {
      totalProjects: 0,
      checkedProjects: 0,
      inconsistentProjects: 0,
      fixedProjects: 0,
      totalCustomers: 0,
      checkedCustomers: 0,
      inconsistentCustomers: 0,
      fixedCustomers: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
      details: [],
      customerDetails: [],
    }

    // Fetch todos los proyectos
    logger.debug('Fetching all projects with allocations')
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        projectNumber: true,
        totalAmount: true,
        balance: true,
        paymentAllocations: {
          select: {
            allocatedAmount: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // Priorizar proyectos actualizados recientemente
      },
    })

    result.totalProjects = projects.length
    logger.info({ totalProjects: projects.length }, 'Projects loaded')

    // Fase 1: Detectar inconsistencias en memoria
    const toFix: Array<{ id: string; balance: number }> = []

    for (const project of projects) {
      result.checkedProjects++

      try {
        const { balance: calculatedBalance } = calculateProjectBalance({
          totalAmount: Number(project.totalAmount),
          allocations: project.paymentAllocations.map((alloc) => ({
            allocatedAmount: Number(alloc.allocatedAmount),
          })),
        })

        const dbBalance = Number(project.balance)
        const difference = Math.abs(dbBalance - calculatedBalance)

        if (difference >= FINANCIAL.TOLERANCE) {
          result.inconsistentProjects++

          logger.warn(
            {
              projectId: project.id,
              projectNumber: project.projectNumber,
              dbBalance,
              calculatedBalance,
              difference,
            },
            'Inconsistent balance detected'
          )

          result.details.push({
            projectId: project.id,
            projectNumber: project.projectNumber,
            dbBalance,
            calculatedBalance,
            difference,
          })

          toFix.push({ id: project.id, balance: calculatedBalance })
        }
      } catch (error) {
        result.errors++
        logger.error(
          {
            err: error,
            projectId: project.id,
            projectNumber: project.projectNumber,
          },
          'Error processing project'
        )
      }
    }

    // Fase 2: Corregir en batch dentro de una transacción
    if (toFix.length > 0) {
      try {
        await prisma.$transaction(
          toFix.map(({ id, balance }) =>
            prisma.project.update({
              where: { id },
              data: { balance: new Decimal(balance) },
            })
          )
        )
        result.fixedProjects = toFix.length

        logger.info({ fixedCount: toFix.length }, 'Batch balance correction completed')
      } catch (error) {
        result.errors += toFix.length
        logger.error({ err: error }, 'Error in batch balance correction')
      }
    }

    // ================================================================
    // Fase 3: Detectar inconsistencias de creditBalance en clientes
    // ================================================================
    logger.debug('Fetching customers with credit data')
    const customers = await prisma.customer.findMany({
      where: {
        OR: [{ creditBalance: { gt: 0 } }, { creditTransactions: { some: {} } }],
      },
      select: {
        id: true,
        name: true,
        creditBalance: true,
        creditTransactions: {
          select: { amount: true },
        },
      },
    })

    result.totalCustomers = customers.length
    logger.info({ totalCustomers: customers.length }, 'Customers loaded for credit check')

    const customersToFix: Array<{ id: string; creditBalance: number }> = []

    for (const customer of customers) {
      result.checkedCustomers++

      try {
        const calculatedBalance = Math.max(
          0,
          customer.creditTransactions.reduce((sum, ct) => sum + Number(ct.amount), 0)
        )

        const dbBalance = Number(customer.creditBalance)
        const difference = Math.abs(dbBalance - calculatedBalance)

        if (difference >= FINANCIAL.TOLERANCE) {
          result.inconsistentCustomers++

          logger.warn(
            {
              customerId: customer.id,
              customerName: customer.name,
              dbCreditBalance: dbBalance,
              calculatedCreditBalance: calculatedBalance,
              difference,
            },
            'Inconsistent credit balance detected'
          )

          result.customerDetails.push({
            customerId: customer.id,
            customerName: customer.name,
            dbCreditBalance: dbBalance,
            calculatedCreditBalance: calculatedBalance,
            difference,
          })

          customersToFix.push({ id: customer.id, creditBalance: calculatedBalance })
        }
      } catch (error) {
        result.errors++
        logger.error(
          { err: error, customerId: customer.id, customerName: customer.name },
          'Error processing customer credit'
        )
      }
    }

    // ================================================================
    // Fase 4: Corregir creditBalances inconsistentes en batch
    // ================================================================
    if (customersToFix.length > 0) {
      try {
        await prisma.$transaction(
          customersToFix.map(({ id, creditBalance }) =>
            prisma.customer.update({
              where: { id },
              data: { creditBalance: new Decimal(creditBalance) },
            })
          )
        )
        result.fixedCustomers = customersToFix.length

        logger.info(
          { fixedCount: customersToFix.length },
          'Batch credit balance correction completed'
        )
      } catch (error) {
        result.errors += customersToFix.length
        logger.error({ err: error }, 'Error in batch credit balance correction')
      }
    }

    result.duration = Date.now() - startTime

    logger.info(
      {
        totalProjects: result.totalProjects,
        checkedProjects: result.checkedProjects,
        inconsistentProjects: result.inconsistentProjects,
        fixedProjects: result.fixedProjects,
        totalCustomers: result.totalCustomers,
        checkedCustomers: result.checkedCustomers,
        inconsistentCustomers: result.inconsistentCustomers,
        fixedCustomers: result.fixedCustomers,
        errors: result.errors,
        duration: result.duration,
      },
      'Balance reconciliation completed'
    )

    // Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        message: `Reconciliación completada: ${result.fixedProjects} proyectos y ${result.fixedCustomers} clientes corregidos`,
        result,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Fatal error in reconciliation job')

    return NextResponse.json(
      {
        success: false,
        error: 'Error en reconciliación de balances',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
})
