import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateCustomersExcelBuffer } from '@/lib/excel/customer-exporter'
import { logger } from '@/lib/logger'
import { anyFieldMatchesSearch } from '@/lib/utils/normalize'
import { getCustomerCreditBalances } from '@/lib/business-logic/credit-management'
import { IMPORT_EXPORT_LIMITS } from '@/lib/constants/import-export-limits'

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
    let filteredCustomerIds: string[] | null = null
    let totalCustomers: number

    if (search) {
      const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "Customer" c
        WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
           OR normalize_text(COALESCE(c.email, '')) LIKE normalize_text(${`%${search}%`})
           OR normalize_text(c.phone) LIKE normalize_text(${`%${search}%`})
      `
      totalCustomers = Number(countRows[0]?.count ?? 0)
      const idRows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT c.id
        FROM "Customer" c
        WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
           OR normalize_text(COALESCE(c.email, '')) LIKE normalize_text(${`%${search}%`})
           OR normalize_text(c.phone) LIKE normalize_text(${`%${search}%`})
        ORDER BY c."createdAt" DESC
        LIMIT ${IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS}
      `
      filteredCustomerIds = idRows.map((row) => row.id)
    } else {
      totalCustomers = await prisma.customer.count()
    }

    if (totalCustomers > IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          error: `La exportación excede el límite de ${IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS} clientes. Use filtros o solicite una exportación segmentada.`,
          limit: IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS,
          total: totalCustomers,
        },
        { status: 413 }
      )
    }

    // Obtener TODOS los clientes con conteo de proyectos
    const allCustomers = await prisma.customer.findMany({
      where: filteredCustomerIds ? { id: { in: filteredCustomerIds } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS,
      include: {
        _count: {
          select: { projects: true },
        },
      },
    })

    // Fallback para entornos de test sin normalize_text mockeado en $queryRaw.
    const customers = filteredCustomerIds
      ? allCustomers
      : search
        ? allCustomers.filter((customer) =>
            anyFieldMatchesSearch([customer.name, customer.email, customer.phone], search)
          )
        : allCustomers

    logger.info({ count: customers.length }, 'Customers fetched for export')

    // Si no hay clientes, retornar error amigable
    if (customers.length === 0) {
      return NextResponse.json({ error: 'No hay clientes para exportar' }, { status: 404 })
    }

    // Enriquecer con creditBalance calculado desde ledger
    const creditMap = await getCustomerCreditBalances(customers.map((c) => c.id))
    const customersWithCredit = customers.map((c) => ({
      ...c,
      creditBalance: creditMap.get(c.id) ?? 0,
    }))

    // Generar Excel buffer
    const excelBuffer = await generateCustomersExcelBuffer(customersWithCredit)

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
