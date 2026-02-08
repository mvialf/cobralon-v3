import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectWhereInput } from '@/types/api'
import { derivePaymentProgress } from '@/lib/business-logic/project-balance'
import { getProjectStateWhere, type ProjectStateFilter } from '@/lib/business-logic/project-state'
import { anyFieldMatchesSearch } from '@/lib/utils/normalize'
import { withLogging } from '@/lib/logger-middleware'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'

/**
 * GET /api/projects-with-metadata
 *
 * API combinada que retorna proyectos Y metadata (statuses) en una sola llamada
 * Reduce latencia de red eliminando round-trips adicionales
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - search: buscar por nombre de proyecto, número o cliente
 *   - customerId: filtrar por cliente específico
 *   - projectState: "Activo" (default), "Finalizado", "all"
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePaginationParams(searchParams)
    const search = searchParams.get('search') || ''
    const customerId = searchParams.get('customerId') || ''
    const projectState = searchParams.get('projectState') || 'Activo'

    // Construir filtro de búsqueda base (solo filtros de DB)
    const where: ProjectWhereInput = {}

    if (customerId) {
      where.customerId = customerId
    }

    // NOTA: La búsqueda se aplica en memoria con normalización (ignora acentos/tildes)

    // Pre-filtro server-side por estado de proyecto (función centralizada)
    // Usa la definición canónica de "Activo" y "Finalizado" que considera tanto
    // isFinal como balance, evitando omitir proyectos con isFinal=true pero balance>0
    const stateWhere = getProjectStateWhere(projectState as ProjectStateFilter)
    if (stateWhere) {
      Object.assign(where, stateWhere)
    }

    // Ejecutar ambas queries en paralelo para máxima eficiencia
    const [allProjects, statuses] = await Promise.all([
      // Query de proyectos (sin paginación, se aplica después del filtro)
      prisma.project.findMany({
        relationLoadStrategy: 'join',
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          projectStatus: {
            select: {
              id: true,
              name: true,
              isFinal: true,
              color: {
                select: {
                  bgClass: true,
                },
              },
            },
          },
        },
      }),

      // Query de statuses
      prisma.projectStatus.findMany({
        where: { isActive: true },
        include: {
          color: {
            select: {
              id: true,
              bgClass: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      }),
    ])

    // Derivar campos de display desde balance persistido
    const projectsWithCalculations = allProjects.map((project) => {
      const { totalPaid, percentPaid } = derivePaymentProgress(
        Number(project.total),
        Number(project.balance)
      )

      return {
        ...project,
        totalPaid,
        balance: Number(project.balance),
        percentPaid,
      }
    })

    // Filtro fino: búsqueda normalizada + balance
    const filteredProjects = projectsWithCalculations.filter((project) => {
      const isFullyPaid = project.balance === 0
      const hasFinaleStatus = project.projectStatus?.isFinal ?? false

      // Filtro por projectState
      if (projectState === 'Activo') {
        if (hasFinaleStatus && isFullyPaid) return false
      } else if (projectState === 'Finalizado') {
        if (!hasFinaleStatus || !isFullyPaid) return false
      }

      // Filtro de búsqueda normalizada (ignora acentos/tildes)
      // "jose" encontrará "José", "nunoa" encontrará "Ñuñoa"
      if (search) {
        return anyFieldMatchesSearch(
          [
            project.projectNumber,
            project.projectName,
            project.customer?.name,
            project.projectStatus?.name,
          ],
          search
        )
      }

      return true
    })

    // Aplicar paginación manualmente DESPUÉS del filtro
    const total = filteredProjects.length
    const skip = (page - 1) * limit
    const paginatedProjects = filteredProjects.slice(skip, skip + limit)

    return NextResponse.json({
      projects: paginatedProjects,
      metadata: {
        projectStatuses: statuses,
      },
      pagination: buildPaginationResponse(page, limit, total),
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching projects with metadata')
    return NextResponse.json({ error: 'Error al obtener proyectos y metadata' }, { status: 500 })
  }
})
