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

    // Buscar proyectos
    const projects = await prisma.project.findMany({
      where: {
        totalAmount: { gt: 0 }, // Solo proyectos con monto definido
        balance: { gt: 0 }, // Solo proyectos con balance pendiente (usa índice)
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
      },
      take: limit,
      orderBy: {
        createdAt: 'desc', // Más recientes primero
      },
    })

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
