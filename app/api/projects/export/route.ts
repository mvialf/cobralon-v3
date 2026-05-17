import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { generateProjectsExcelBuffer } from '@/lib/excel/project-exporter'
import { logger } from '@/lib/logger'
import { projectStateValues } from '@/lib/validations/project-validations'
import { FINANCIAL } from '@/lib/constants/financial-constants'
import { IMPORT_EXPORT_LIMITS } from '@/lib/constants/import-export-limits'

const projectStateSchema = projectStateValues.default('all')

/**
 * GET /api/projects/export
 *
 * Exporta proyectos a un archivo Excel
 *
 * Query params (opcionales):
 *   - search: buscar por nombre de proyecto, número o cliente
 *   - customerId: filtrar por cliente específico
 *   - projectState: "Activo", "Finalizado", "all" (default: "all")
 *
 * Returns: archivo Excel (.xlsx)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const customerId = searchParams.get('customerId') || ''

  // Validar y parsear projectState con Zod (null se trata como undefined para aplicar default)
  const projectStateResult = projectStateSchema.safeParse(
    searchParams.get('projectState') ?? undefined
  )
  if (!projectStateResult.success) {
    return NextResponse.json(
      { error: 'projectState debe ser "Activo", "Finalizado" o "all"' },
      { status: 400 }
    )
  }
  const projectState = projectStateResult.data

  logger.info(
    {
      search: search || undefined,
      customerId: customerId || undefined,
      projectState,
    },
    'Project export requested'
  )

  try {
    const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      JOIN "Customer" c ON c.id = p."customerId"
      LEFT JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
      WHERE 1=1
        ${customerId ? Prisma.sql`AND p."customerId" = ${customerId}` : Prisma.empty}
        ${projectState === 'Finalizado' ? Prisma.sql`AND (pf.balance <= ${FINANCIAL.BALANCE_TOLERANCE} AND ps."isFinal" = true)` : Prisma.empty}
        ${projectState === 'Activo' ? Prisma.sql`AND (pf.balance > ${FINANCIAL.BALANCE_TOLERANCE} OR ps."isFinal" IS NOT TRUE)` : Prisma.empty}
        ${
          search
            ? Prisma.sql`AND (
                normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`})
                OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`})
                OR normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
                OR normalize_text(COALESCE(ps.name, '')) LIKE normalize_text(${`%${search}%`})
              )`
            : Prisma.empty
        }
    `
    const totalProjects = Number(countRows[0]?.count ?? 0)
    if (totalProjects > IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          error: `La exportación excede el límite de ${IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS} proyectos. Use filtros para acotar el resultado.`,
          limit: IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS,
          total: totalProjects,
        },
        { status: 413 }
      )
    }

    const projects = await prisma.$queryRaw<
      Array<{
        id: string
        projectNumber: string
        projectName: string | null
        phone: string
        street: string | null
        apartment: string | null
        comuna: string
        region: string
        date: Date
        subtotal: unknown
        taxRate: unknown
        totalAmount: unknown
        balance: unknown
        windowsCount: number
        squareMeters: unknown
        description: string | null
        customerName: string
        statusName: string | null
      }>
    >`
      SELECT
        p.id,
        p."projectNumber",
        p."projectName",
        p.phone,
        p.street,
        p.apartment,
        p.comuna,
        p.region,
        p.date,
        p.subtotal,
        p."taxRate",
        p."totalAmount",
        pf.balance,
        p."windowsCount",
        p."squareMeters",
        p.description,
        c.name AS "customerName",
        ps.name AS "statusName"
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      JOIN "Customer" c ON c.id = p."customerId"
      LEFT JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
      WHERE 1=1
        ${customerId ? Prisma.sql`AND p."customerId" = ${customerId}` : Prisma.empty}
        ${projectState === 'Finalizado' ? Prisma.sql`AND (pf.balance <= ${FINANCIAL.BALANCE_TOLERANCE} AND ps."isFinal" = true)` : Prisma.empty}
        ${projectState === 'Activo' ? Prisma.sql`AND (pf.balance > ${FINANCIAL.BALANCE_TOLERANCE} OR ps."isFinal" IS NOT TRUE)` : Prisma.empty}
        ${
          search
            ? Prisma.sql`AND (
                normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`})
                OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`})
                OR normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
                OR normalize_text(COALESCE(ps.name, '')) LIKE normalize_text(${`%${search}%`})
              )`
            : Prisma.empty
        }
      ORDER BY p."createdAt" DESC
      LIMIT ${IMPORT_EXPORT_LIMITS.MAX_EXPORT_ROWS}
    `

    const filteredProjects = projects.map((project) => ({
      ...project,
      subtotal: Number(project.subtotal),
      taxRate: Number(project.taxRate),
      totalAmount: Number(project.totalAmount),
      balance: Number(project.balance),
      squareMeters: Number(project.squareMeters),
      customer: { name: project.customerName },
      projectStatus: project.statusName ? { name: project.statusName } : null,
    }))

    logger.info(
      { totalFetched: filteredProjects.length, totalFiltered: filteredProjects.length },
      'Projects fetched for export'
    )

    // Si no hay proyectos, retornar error amigable
    if (filteredProjects.length === 0) {
      return NextResponse.json({ error: 'No hay proyectos para exportar' }, { status: 404 })
    }

    // Generar Excel buffer
    const excelBuffer = await generateProjectsExcelBuffer(filteredProjects)

    // Nombre del archivo con fecha
    const filename = `proyectos-${new Date().toISOString().split('T')[0]}.xlsx`

    logger.info({ filename, records: filteredProjects.length }, 'Excel file generated successfully')

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
    logger.error({ err: error }, 'Error exporting projects')
    return NextResponse.json({ error: 'Error al exportar proyectos' }, { status: 500 })
  }
}
