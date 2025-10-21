import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateProjectBalance } from '@/lib/validations/payment-validations'

/**
 * GET /api/payments/customer-projects
 *
 * Obtiene todos los proyectos de un cliente que tienen balance pendiente.
 * Utilizado para el formulario "Pago a Cliente (1:N)".
 *
 * Query params:
 * - customerId: UUID del cliente (requerido)
 *
 * Retorna:
 * - Array de proyectos con balance > 0
 * - Ordenados por createdAt ASC (más antiguos primero, para FIFO)
 * - Incluye: id, projectNumber, projectName, totalAmount, currency, balance, createdAt, customer
 *
 * Validaciones:
 * - customerId es requerido y debe ser UUID válido
 * - Solo retorna proyectos con totalAmount > 0 y balance > 0
 * - Solo cuenta pagos activos (status = 'ACTIVE')
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')

    // Validar customerId
    if (!customerId) {
      return NextResponse.json({ error: 'El parámetro customerId es requerido' }, { status: 400 })
    }

    // Validar formato UUID (simple regex)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(customerId)) {
      return NextResponse.json({ error: 'customerId debe ser un UUID válido' }, { status: 400 })
    }

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Buscar proyectos del cliente
    const projects = await prisma.project.findMany({
      where: {
        customerId,
        totalAmount: { gt: 0 }, // Solo proyectos con monto definido
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        paymentAllocations: {
          where: {
            payment: {
              status: 'ACTIVE', // Solo pagos activos (no cancelados)
            },
          },
          select: {
            allocatedAmount: true,
            payment: {
              select: {
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // ← Más antiguos primero (para FIFO)
      },
    })

    // Calcular balance de cada proyecto
    const projectsWithBalance = projects
      .map((project) => {
        const { balance } = calculateProjectBalance({
          totalAmount: Number(project.totalAmount),
          allocations: project.paymentAllocations.map((alloc) => ({
            allocatedAmount: Number(alloc.allocatedAmount),
            payment: { status: alloc.payment.status },
          })),
        })

        return {
          id: project.id,
          projectNumber: project.projectNumber,
          projectName: project.projectName,
          totalAmount: Number(project.totalAmount),
          currency: project.currency,
          balance,
          createdAt: project.createdAt, // ← Para FIFO
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
    console.error('Error fetching customer projects:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos del cliente' }, { status: 500 })
  }
}
