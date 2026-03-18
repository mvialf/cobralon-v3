/**
 * Job de reconciliación de balances de proyectos
 *
 * PROPÓSITO:
 * Safety net que detecta y corrige inconsistencias en los balances de proyectos
 *
 * CUÁNDO SE EJECUTA:
 * - Automáticamente: 2am todos los días (configurar en Vercel Cron o similar)
 * - Manual: GET /api/cron/reconcile-balances
 *
 * NOTA: creditBalance de Customer ya no se reconcilia — se calcula en tiempo real
 * desde CreditTransaction (ver getCustomerCreditBalance en credit-management.ts)
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
}

export const GET = withLogging(async (request, logger) => {
  const startTime = Date.now()

  logger.info('Starting balance reconciliation job')

  try {
    const result: ReconciliationResult = {
      totalProjects: 0,
      checkedProjects: 0,
      inconsistentProjects: 0,
      fixedProjects: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
      details: [],
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
        updatedAt: 'desc',
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

    result.duration = Date.now() - startTime

    logger.info(
      {
        totalProjects: result.totalProjects,
        checkedProjects: result.checkedProjects,
        inconsistentProjects: result.inconsistentProjects,
        fixedProjects: result.fixedProjects,
        errors: result.errors,
        duration: result.duration,
      },
      'Balance reconciliation completed'
    )

    return NextResponse.json(
      {
        success: true,
        message: `Reconciliación completada: ${result.fixedProjects} proyectos corregidos`,
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
