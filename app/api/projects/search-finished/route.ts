import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/projects/search-finished
 *
 * Busca proyectos finalizados (isFinal = true) para casos de postventa.
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
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)

    // Validar término de búsqueda
    if (q.length < 2) {
      return NextResponse.json(
        { error: 'El término de búsqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      )
    }

    // Buscar proyectos finalizados
    const projects = await prisma.project.findMany({
      where: {
        projectStatus: {
          isFinal: true, // ← Filtro principal: solo proyectos finalizados
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
          }
        : null,
    }))

    return NextResponse.json(projectsSimplified)
  } catch (error) {
    console.error('Error searching finished projects:', error)
    return NextResponse.json({ error: 'Error al buscar proyectos finalizados' }, { status: 500 })
  }
}
