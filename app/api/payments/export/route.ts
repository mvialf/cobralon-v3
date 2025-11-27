import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PaymentWhereInput } from '@/types/api'
import { generatePaymentsExcelBuffer } from '@/lib/excel/payment-exporter'
import { logger } from '@/lib/logger'
import { z } from 'zod'

/**
 * Zod schema for type validation
 */
const paymentTypeSchema = z.enum(['Project', 'Customer', 'all']).default('all')

/**
 * GET /api/payments/export
 *
 * Exporta pagos a un archivo Excel
 *
 * Query params (opcionales):
 *   - customerId: filtrar por cliente específico
 *   - projectId: filtrar por proyecto específico
 *   - type: "Project", "Customer", "all" (default: "all")
 *   - startDate: filtrar pagos desde esta fecha (ISO string)
 *   - endDate: filtrar pagos hasta esta fecha (ISO string)
 *
 * Returns: archivo Excel (.xlsx)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId') || ''
  const projectId = searchParams.get('projectId') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''

  // Validar y parsear type con Zod (null se trata como undefined para aplicar default)
  const typeResult = paymentTypeSchema.safeParse(searchParams.get('type') ?? undefined)
  if (!typeResult.success) {
    return NextResponse.json(
      { error: 'type debe ser "Project", "Customer" o "all"' },
      { status: 400 }
    )
  }
  const type = typeResult.data

  logger.info(
    {
      customerId: customerId || undefined,
      projectId: projectId || undefined,
      type,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    },
    'Payment export requested'
  )

  try {
    // Construir filtro de búsqueda base (misma lógica que GET /api/payments)
    const where: PaymentWhereInput = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (type !== 'all') {
      where.type = type
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

    // Filtro por proyecto (via allocations)
    if (projectId) {
      where.allocations = {
        some: {
          projectId,
        },
      }
    }

    // Obtener TODOS los pagos (sin paginación)
    const allPayments = await prisma.payment.findMany({
      relationLoadStrategy: 'join',
      where,
      orderBy: { date: 'desc' },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        paymentMethod: {
          select: {
            name: true,
          },
        },
        allocations: {
          select: {
            allocatedAmount: true,
            project: {
              select: {
                projectNumber: true,
                projectName: true,
              },
            },
          },
        },
      },
    })

    logger.info({ totalFetched: allPayments.length }, 'Payments fetched for export')

    // Si no hay pagos, retornar error amigable
    if (allPayments.length === 0) {
      return NextResponse.json({ error: 'No hay pagos para exportar' }, { status: 404 })
    }

    // Generar Excel buffer
    const excelBuffer = generatePaymentsExcelBuffer(allPayments)

    // Nombre del archivo con fecha
    const filename = `pagos-${new Date().toISOString().split('T')[0]}.xlsx`

    logger.info({ filename, records: allPayments.length }, 'Excel file generated successfully')

    // Retornar como archivo descargable (convertir a Blob para compatibilidad)
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error exporting payments')
    return NextResponse.json({ error: 'Error al exportar pagos' }, { status: 500 })
  }
}
