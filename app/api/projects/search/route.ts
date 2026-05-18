import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/projects/search
 *
 * Busca proyectos por estado para calendario (active) o postventa (finished).
 *
 * Query params:
 * - q: término de búsqueda (min 2 caracteres)
 * - status: 'active' (isFinal=false) | 'finished' (isFinal=true)
 * - limit: máximo de resultados (default: 20, max: 50)
 *
 * Búsqueda en: projectNumber, projectName, customer.name
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const status = searchParams.get('status')
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)

    if (q.length < 2) {
      return NextResponse.json(
        { error: 'El término de búsqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    if (status !== 'active' && status !== 'finished') {
      return NextResponse.json(
        { error: "El parámetro 'status' debe ser 'active' o 'finished'" },
        { status: 400 }
      )
    }

    const isFinal = status === 'finished'

    // Búsqueda normalizada (sin acentos, case-insensitive) via normalize_text() de PostgreSQL
    const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM "Project" p
      JOIN "Customer" c ON c.id = p."customerId"
      JOIN "ProjectStatus" ps ON ps.id = p."projectStatusId"
      WHERE ps."isFinal" = ${isFinal}
        AND ps."isActive" = true
        AND (
          normalize_text(p."projectNumber") LIKE normalize_text(${`%${q}%`})
          OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${q}%`})
          OR normalize_text(c.name) LIKE normalize_text(${`%${q}%`})
        )
      LIMIT ${limit}
    `

    const projects =
      matchingIds.length > 0
        ? await prisma.project.findMany({
            where: { id: { in: matchingIds.map((r) => r.id) } },
            include: {
              customer: {
                select: { id: true, name: true },
              },
              projectStatus: {
                select: {
                  id: true,
                  name: true,
                  color: { select: { bgClass: true, textClass: true } },
                },
              },
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
          })
        : []

    const projectsSimplified = projects.map((project) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      customer: {
        id: project.customer.id,
        name: project.customer.name,
      },
      projectStatus: project.projectStatus
        ? {
            id: project.projectStatus.id,
            name: project.projectStatus.name,
            color: project.projectStatus.color,
          }
        : null,
    }))

    return NextResponse.json(projectsSimplified)
  } catch (error) {
    logger.error({ err: error }, 'Error searching projects')
    return NextResponse.json({ error: 'Error al buscar proyectos' }, { status: 500 })
  }
})
