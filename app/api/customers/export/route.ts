import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateCustomersExcelBuffer } from '@/lib/excel/customer-exporter'
import { logger } from '@/lib/logger'

/**
 * GET /api/customers/export
 *
 * Exporta todos los clientes a un archivo Excel
 *
 * Query params (opcionales):
 *   - search: filtrar por nombre, email o teléfono
 *
 * Returns: archivo Excel (.xlsx)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  logger.info({ search: search || undefined }, 'Customer export requested')

  try {
    // Construir filtro de búsqueda (mismo que en GET /api/customers)
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Obtener TODOS los clientes (sin paginación) con conteo de proyectos
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    logger.info({ count: customers.length }, 'Customers fetched for export')

    // Si no hay clientes, retornar error amigable
    if (customers.length === 0) {
      return NextResponse.json({ error: 'No hay clientes para exportar' }, { status: 404 })
    }

    // Generar Excel buffer
    const excelBuffer = generateCustomersExcelBuffer(customers)

    // Nombre del archivo con fecha
    const filename = `clientes-${new Date().toISOString().split('T')[0]}.xlsx`

    logger.info({ filename, records: customers.length }, 'Excel file generated successfully')

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
    logger.error({ err: error }, 'Error exporting customers')
    return NextResponse.json({ error: 'Error al exportar clientes' }, { status: 500 })
  }
}
