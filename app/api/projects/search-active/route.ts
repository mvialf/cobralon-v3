import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/projects/search-active
 *
 * Busca proyectos activos (NO finalizados) para eventos de calendario.
 * Retorna proyectos con isFinal = false (sin importar balance).
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

    // Buscar proyectos activos (NO finalizados)
    const projects = await prisma.project.findMany({
      where: {
        projectStatus: {
          isFinal: false, // ← Filtro principal: excluir proyectos finalizados
          isActive: true,
        },
        OR: [
          {
            projectNumber: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            projectName: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            customer: {
              name: {
                contains: q,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        projectStatus: {
          select: {
            id: true,
            name: true,
            color: {
              select: {
                bgClass: true,
                textClass: true,
              },
            },
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc', // Más recientes primero
      },
    })

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
    logger.error({ err: error }, 'Error searching active projects')
    return NextResponse.json({ error: 'Error al buscar proyectos activos' }, { status: 500 })
  }
})
