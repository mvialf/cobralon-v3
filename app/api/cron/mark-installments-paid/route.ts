import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
  try {
    // Verificar autenticación del cron job
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET no está configurado')
      return NextResponse.json(
        { error: 'CRON_SECRET no está configurado en el servidor' },
        { status: 500 }
      )
    }

    // Verificar que el header de autorización coincide con el secret
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Intento de acceso no autorizado al cron job')
      return NextResponse.json(
        { error: 'No autorizado. Este endpoint es solo para Vercel Cron Jobs.' },
        { status: 401 }
      )
    }

    // Obtener fecha actual del servidor (sin hora para comparación)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Buscar todas las cuotas pendientes cuya fecha de vencimiento ya pasó o es hoy
    const installmentsToPay = await prisma.installment.findMany({
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
                name: true,
              },
            },
          },
        },
      },
    })

    // Si no hay cuotas para marcar como pagadas
    if (installmentsToPay.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay cuotas pendientes para marcar como pagadas',
        installmentsUpdated: 0,
        timestamp: new Date().toISOString(),
      })
    }

    // Marcar todas las cuotas como pagadas (batch update)
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

    // Log detallado para debugging
    console.log(`[CRON] Cuotas marcadas como pagadas: ${result.count}`)
    installmentsToPay.forEach((installment) => {
      console.log(
        `  - Cuota #${installment.installmentNumber} de ${installment.payment.customer.name} - Vencimiento: ${new Date(installment.dueDate).toLocaleDateString('es-CL')}`
      )
    })

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
    console.error('[CRON] Error al marcar cuotas como pagadas:', error)
    return NextResponse.json(
      {
        error: 'Error al marcar cuotas como pagadas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
