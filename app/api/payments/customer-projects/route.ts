import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/payments/customer-projects
 *
 * Obtiene todos los proyectos de un cliente que tienen balance pendiente.
 * Utilizado para el formulario "Pago a Cliente (1:N)".
 */
export const GET = withApiHandler(
  async (request) => {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      throw new BusinessError('El parámetro customerId es requerido', 400)
    }

    if (!UUID_REGEX.test(customerId)) {
      throw new BusinessError('customerId debe ser un UUID válido', 400)
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true },
    })

    if (!customer) {
      throw new BusinessError('Cliente no encontrado', 404)
    }

    const projects = await prisma.project.findMany({
      where: {
        customerId,
        totalAmount: { gt: 0 },
        balance: { gt: 0 },
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const projectsWithBalance = projects.map((project) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      totalAmount: Number(project.totalAmount),
      currency: project.currency,
      balance: Number(project.balance),
      createdAt: project.createdAt,
      customer: {
        id: project.customer.id,
        name: project.customer.name,
      },
    }))

    return NextResponse.json(projectsWithBalance)
  },
  { fallbackError: 'Error al obtener proyectos del cliente' }
)
