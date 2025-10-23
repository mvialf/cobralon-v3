import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateProjectBalance } from '@/lib/validations/payment-validations'

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

    // Buscar proyectos
    const projects = await prisma.project.findMany({
      where: {
        totalAmount: { gt: 0 }, // Solo proyectos con monto definido
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
        paymentAllocations: {
          select: {
            allocatedAmount: true,
          },
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc', // Más recientes primero
      },
    })

    // Calcular balance de cada proyecto
    const projectsWithBalance = projects
      .map((project) => {
        const { balance } = calculateProjectBalance({
          totalAmount: Number(project.totalAmount),
          allocations: project.paymentAllocations.map((alloc) => ({
            allocatedAmount: Number(alloc.allocatedAmount),
          })),
        })

        return {
          id: project.id,
          projectNumber: project.projectNumber,
          projectName: project.projectName,
          totalAmount: Number(project.totalAmount),
          currency: project.currency,
          balance,
          createdAt: project.createdAt, // Para FIFO (si se necesita)
          customer: {
            id: project.customer.id,
            name: project.customer.name,
          },
        }
      })
      // Filtrar solo proyectos con balance > 0
      .filter((p) => p.balance > 0)

    return NextResponse.json(projectsWithBalance)
  } catch (error) {
    console.error('Error searching projects:', error)
    return NextResponse.json({ error: 'Error al buscar proyectos' }, { status: 500 })
  }
}
