import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger, generateRunId } from '@/lib/logger'

/**
 * POST /api/cron/mark-installments-paid
 *
 * Cron job ejecutado automáticamente por Vercel
 * Marca como pagadas todas las cuotas cuya fecha de vencimiento haya llegado
 *
 * IMPORTANTE:
 * - Solo marca como 'paid' las cuotas con status='pending' y dueDate <= hoy
 * - Establece paidDate = fecha actual del servidor
 * - Este endpoint debe ser llamado SOLO por Vercel Cron Jobs
 * - Requiere autenticación vía CRON_SECRET (configurado en vercel.json)
 *
 * Seguridad:
 * - Vercel agrega automáticamente el header 'Authorization: Bearer <CRON_SECRET>'
 * - El CRON_SECRET se configura como variable de entorno en Vercel
 * - Ver: https://vercel.com/docs/cron-jobs/manage-cron-jobs
 */
export async function POST(request: Request) {
  const runId = generateRunId()
  const startTime = performance.now()

  // Child logger con contexto del cron job
  const cronLogger = logger.child({
    job: 'mark-installments-paid',
    runId,
  })

  cronLogger.info('Cron job started')

  try {
    // Verificar autenticación del cron job
    cronLogger.debug('Validating authentication')
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      cronLogger.error('CRON_SECRET is not configured')
      return NextResponse.json(
        { error: 'CRON_SECRET no está configurado en el servidor' },
        { status: 500 }
      )
    }

    // Verificar que el header de autorización coincide con el secret
    if (authHeader !== `Bearer ${cronSecret}`) {
      cronLogger.warn(
        { authHeader: authHeader ? 'present' : 'missing' },
        'Unauthorized access attempt'
      )
      return NextResponse.json(
        { error: 'No autorizado. Este endpoint es solo para Vercel Cron Jobs.' },
        { status: 401 }
      )
    }

    cronLogger.debug('Authentication validated')

    // Obtener fecha actual del servidor (sin hora para comparación)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    cronLogger.debug({ today: today.toISOString() }, 'Fetching pending installments')

    // Buscar todas las cuotas pendientes cuya fecha de vencimiento ya pasó o es hoy
    const installmentsToPay = await prisma.installment.findMany({
      relationLoadStrategy: 'join', // Fix N+1: Force database-level JOINs
      where: {
        status: 'pending',
        dueDate: {
          lte: new Date(), // Menor o igual a hoy (incluye hoy)
        },
      },
      select: {
        id: true,
        installmentNumber: true,
        dueDate: true,
        amount: true,
        payment: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    cronLogger.info({ found: installmentsToPay.length }, 'Pending installments found')

    // Si no hay cuotas para marcar como pagadas
    if (installmentsToPay.length === 0) {
      const duration = Math.round(performance.now() - startTime)
      cronLogger.info({ duration }, 'No installments to mark as paid')

      return NextResponse.json({
        success: true,
        message: 'No hay cuotas pendientes para marcar como pagadas',
        installmentsUpdated: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Log detallado por cliente (para auditoría)
    const byCustomer = installmentsToPay.reduce(
      (acc, i) => {
        const customerId = i.payment.customer.id
        if (!acc[customerId]) {
          acc[customerId] = {
            name: i.payment.customer.name,
            count: 0,
            total: 0,
          }
        }
        acc[customerId].count++
        acc[customerId].total += Number(i.amount)
        return acc
      },
      {} as Record<string, { name: string; count: number; total: number }>
    )

    cronLogger.debug(
      {
        customers: Object.values(byCustomer).map((c) => ({
          name: c.name,
          installments: c.count,
          totalAmount: c.total,
        })),
      },
      'Installments grouped by customer'
    )

    // Marcar todas las cuotas como pagadas (batch update)
    cronLogger.info({ count: installmentsToPay.length }, 'Updating installments to paid status')
    const installmentIds = installmentsToPay.map((i) => i.id)
    const result = await prisma.installment.updateMany({
      where: {
        id: {
          in: installmentIds,
        },
      },
      data: {
        status: 'paid',
        paidDate: new Date(),
      },
    })

    const duration = Math.round(performance.now() - startTime)

    // Log detallado de cada cuota (solo en debug)
    if (logger.level === 'debug') {
      installmentsToPay.forEach((installment) => {
        cronLogger.debug(
          {
            installmentId: installment.id,
            installmentNumber: installment.installmentNumber,
            customerId: installment.payment.customer.id,
            customerName: installment.payment.customer.name,
            dueDate: installment.dueDate.toISOString(),
            amount: Number(installment.amount),
          },
          'Installment marked as paid'
        )
      })
    }

    cronLogger.info(
      {
        updated: result.count,
        customerCount: Object.keys(byCustomer).length,
        totalAmount: Object.values(byCustomer).reduce((sum, c) => sum + c.total, 0),
        duration,
      },
      'Cron job completed successfully'
    )

    return NextResponse.json({
      success: true,
      message: `${result.count} cuota${result.count !== 1 ? 's' : ''} marcada${result.count !== 1 ? 's' : ''} como pagada${result.count !== 1 ? 's' : ''}`,
      installmentsUpdated: result.count,
      installments: installmentsToPay.map((i) => ({
        id: i.id,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        customer: i.payment.customer.name,
      })),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)

    cronLogger.error(
      {
        err: error,
        duration,
      },
      'Cron job failed'
    )

    return NextResponse.json(
      {
        error: 'Error al marcar cuotas como pagadas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
