import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

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

    // Búsqueda normalizada (sin acentos, case-insensitive) via normalize_text() de PostgreSQL
    const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM "Project" p
      JOIN "Customer" c ON c.id = p."customerId"
      WHERE p."totalAmount" > 0
        AND p.balance > 1
        AND (
          normalize_text(p."projectNumber") LIKE normalize_text(${`%${q}%`})
          OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${q}%`})
          OR normalize_text(c.name) LIKE normalize_text(${`%${q}%`})
        )
      LIMIT ${limit}
    `

    const projects = matchingIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: matchingIds.map((r) => r.id) } },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
      : []

    // Mapear respuesta (balance ya filtrado en DB)
    const projectsWithBalance = projects.map((project) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      totalAmount: Number(project.totalAmount),
      currency: project.currency,
      balance: Number(project.balance),
      createdAt: project.createdAt, // Para FIFO (si se necesita)
      customer: {
        id: project.customer.id,
        name: project.customer.name,
      },
    }))

    return NextResponse.json(projectsWithBalance)
  } catch (error) {
    logger.error({ err: error }, 'Error searching projects')
    return NextResponse.json({ error: 'Error al buscar proyectos' }, { status: 500 })
  }
})
