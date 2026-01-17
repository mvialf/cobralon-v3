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
        total: true,
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

    // Verificar y corregir cada proyecto
    for (const project of projects) {
      result.checkedProjects++

      try {
        // Calcular balance esperado
        const { balance: calculatedBalance } = calculateProjectBalance({
          totalAmount: Number(project.total),
          allocations: project.paymentAllocations.map((alloc) => ({
            allocatedAmount: Number(alloc.allocatedAmount),
          })),
        })

        const dbBalance = Number(project.balance)
        const difference = Math.abs(dbBalance - calculatedBalance)

        // Tolerancia por redondeos decimales
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

          // Guardar detalle
          result.details.push({
            projectId: project.id,
            projectNumber: project.projectNumber,
            dbBalance,
            calculatedBalance,
            difference,
          })

          // Corregir balance
          await prisma.project.update({
            where: { id: project.id },
            data: {
              balance: new Decimal(calculatedBalance),
            },
          })

          result.fixedProjects++

          logger.info(
            {
              projectId: project.id,
              projectNumber: project.projectNumber,
              oldBalance: dbBalance,
              newBalance: calculatedBalance,
            },
            'Balance corrected'
          )
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

    // Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        message: `Reconciliación completada: ${result.fixedProjects} proyectos corregidos de ${result.totalProjects} revisados`,
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
