import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectWhereInput } from '@/types/api'
import { calculateProjectBalance } from '@/lib/business-logic/project-balance'

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
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const search = searchParams.get('search') || ''
    const customerId = searchParams.get('customerId') || ''
    const projectState = searchParams.get('projectState') || 'Activo'

    const skip = (page - 1) * limit

    // Construir filtro de búsqueda
    const where: ProjectWhereInput = {}

    if (customerId) {
      where.customerId = customerId
    }

    if (search) {
      where.OR = [
        { projectNumber: { contains: search, mode: 'insensitive' as const } },
        { projectName: { contains: search, mode: 'insensitive' as const } },
        { projectStatus: { name: { contains: search, mode: 'insensitive' as const } } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
      ]
    }

    // Pre-filtro server-side por projectStatus.isFinal
    if (projectState === 'Activo') {
      where.projectStatus = { isFinal: false }
    } else if (projectState === 'Finalizado') {
      where.projectStatus = { isFinal: true }
    }

    // Ejecutar ambas queries en paralelo para máxima eficiencia
    const [projects, statuses] = await Promise.all([
      // Query de proyectos
      prisma.project.findMany({
        relationLoadStrategy: 'join',
        where,
        skip,
        take: limit,
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
          paymentAllocations: {
            select: {
              allocatedAmount: true,
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

    // Calcular balance para cada proyecto
    const projectsWithCalculations = projects.map((project) => {
      const { totalPaid, balance } = calculateProjectBalance({
        totalAmount: Number(project.total),
        allocations: project.paymentAllocations.map((alloc) => ({
          allocatedAmount: Number(alloc.allocatedAmount),
        })),
      })

      const percentPaid = Number(project.total) > 0 ? (totalPaid / Number(project.total)) * 100 : 0

      return {
        ...project,
        totalPaid,
        balance,
        percentPaid,
      }
    })

    // Filtro fino client-side por balance
    const filteredProjects = projectsWithCalculations.filter((project) => {
      const isFullyPaid = project.balance === 0
      const hasFinaleStatus = project.projectStatus?.isFinal ?? false

      if (projectState === 'Activo') {
        return !hasFinaleStatus || !isFullyPaid
      } else if (projectState === 'Finalizado') {
        return hasFinaleStatus && isFullyPaid
      }
      return true
    })

    return NextResponse.json({
      projects: filteredProjects,
      metadata: {
        projectStatuses: statuses,
      },
      pagination: {
        page,
        limit,
        total: filteredProjects.length,
        totalPages: Math.ceil(filteredProjects.length / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching projects with metadata:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos y metadata' }, { status: 500 })
  }
}
