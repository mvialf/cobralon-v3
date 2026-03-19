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
import { Decimal } from '@prisma/client/runtime/library'
import { withLogging } from '@/lib/logger-middleware'
import { FINANCIAL } from '@/lib/constants/financial-constants'

interface InconsistentProject {
  id: string
  projectNumber: string
  dbBalance: Decimal
  calculatedBalance: Decimal
}

interface ReconciliationResult {
  totalProjects: number
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
      inconsistentProjects: 0,
      fixedProjects: 0,
      errors: 0,
      duration: 0,
      timestamp: new Date().toISOString(),
      details: [],
    }

    // Contar proyectos totales
    result.totalProjects = await prisma.project.count()
    logger.info({ totalProjects: result.totalProjects }, 'Projects counted')

    // Fase 1: Detectar inconsistencias directamente en SQL
    // Compara balance almacenado vs calculado (totalAmount - SUM(allocations))
    const inconsistent = await prisma.$queryRaw<InconsistentProject[]>`
      SELECT
        p.id,
        p."projectNumber",
        p.balance as "dbBalance",
        (COALESCE(p."totalAmount", 0) - COALESCE(
          (SELECT SUM(pa."allocatedAmount") FROM "PaymentAllocation" pa WHERE pa."projectId" = p.id), 0
        )) as "calculatedBalance"
      FROM "Project" p
      WHERE ABS(
        p.balance - (COALESCE(p."totalAmount", 0) - COALESCE(
          (SELECT SUM(pa."allocatedAmount") FROM "PaymentAllocation" pa WHERE pa."projectId" = p.id), 0
        ))
      ) >= ${FINANCIAL.TOLERANCE}
    `

    result.inconsistentProjects = inconsistent.length

    for (const row of inconsistent) {
      const dbBalance = Number(row.dbBalance)
      const calculatedBalance = Number(row.calculatedBalance)
      const difference = Math.abs(dbBalance - calculatedBalance)

      logger.warn(
        {
          projectId: row.id,
          projectNumber: row.projectNumber,
          dbBalance,
          calculatedBalance,
          difference,
        },
        'Inconsistent balance detected'
      )

      result.details.push({
        projectId: row.id,
        projectNumber: row.projectNumber,
        dbBalance,
        calculatedBalance,
        difference,
      })
    }

    // Fase 2: Corregir en batch dentro de una transacción
    if (inconsistent.length > 0) {
      try {
        await prisma.$transaction(
          inconsistent.map(({ id, calculatedBalance }) =>
            prisma.project.update({
              where: { id },
              data: { balance: new Decimal(Number(calculatedBalance)) },
            })
          )
        )
        result.fixedProjects = inconsistent.length

        logger.info({ fixedCount: inconsistent.length }, 'Batch balance correction completed')
      } catch (error) {
        result.errors += inconsistent.length
        logger.error({ err: error }, 'Error in batch balance correction')
      }
    }

    result.duration = Date.now() - startTime

    logger.info(
      {
        totalProjects: result.totalProjects,
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
