import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { FINANCIAL } from '@/lib/constants/financial-constants'

interface ProjectSearchRow {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: unknown
  currency: string
  balance: unknown
  createdAt: Date
  customerId: string
  customerName: string
}

/**
 * GET /api/payments/search-projects
 *
 * Busca proyectos para registro de pagos.
 * Solo retorna proyectos con totalAmount > 0 y balance > 0.
 *
 * Query params:
 * - q: término de búsqueda (min 2 caracteres)
 * - limit: máximo de resultados (default: 20, max: 50)
 *
 * Búsqueda en:
 * - projectNumber (ej: "2024-089")
 * - projectName (ej: "Ampliación bodega")
 * - customer.name (ej: "Juan Pérez")
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)

    // Validar término de búsqueda
    if (q.length < 2) {
      return NextResponse.json(
        { error: 'El término de búsqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    const projects = await prisma.$queryRaw<ProjectSearchRow[]>`
      SELECT
        p.id,
        p."projectNumber",
        p."projectName",
        p."totalAmount",
        p.currency,
        p."createdAt",
        pf.balance,
        c.id as "customerId",
        c.name as "customerName"
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      JOIN "Customer" c ON c.id = p."customerId"
      WHERE p."totalAmount" > 0
        AND pf.balance > ${FINANCIAL.BALANCE_TOLERANCE}
        AND (
          normalize_text(p."projectNumber") LIKE normalize_text(${`%${q}%`})
          OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${q}%`})
          OR normalize_text(c.name) LIKE normalize_text(${`%${q}%`})
        )
      ORDER BY p."createdAt" DESC
      LIMIT ${limit}
    `

    const projectsWithBalance = projects.map((project) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      totalAmount: Number(project.totalAmount),
      currency: project.currency,
      balance: Number(project.balance),
      createdAt: project.createdAt,
      customer: {
        id: project.customerId,
        name: project.customerName,
      },
    }))

    return NextResponse.json(projectsWithBalance)
  } catch (error) {
    logger.error({ err: error }, 'Error searching projects')
    return NextResponse.json({ error: 'Error al buscar proyectos' }, { status: 500 })
  }
})
