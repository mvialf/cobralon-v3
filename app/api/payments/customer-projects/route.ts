import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import { FINANCIAL } from '@/lib/constants/financial-constants'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface CustomerProjectRow {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: unknown
  currency: string
  balance: unknown
  createdAt: Date
  customerId: string
  customerName: string
}

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

    const projects = await prisma.$queryRaw<CustomerProjectRow[]>`
      SELECT
        p.id,
        p."projectNumber",
        p."projectName",
        p."totalAmount",
        p.currency,
        p."createdAt",
        pf.balance,
        c.id as "customerId",
        c.name as "customerName"
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      JOIN "Customer" c ON c.id = p."customerId"
      WHERE p."customerId" = ${customerId}
        AND p."totalAmount" > 0
        AND pf.balance > ${FINANCIAL.BALANCE_TOLERANCE}
      ORDER BY p."createdAt" ASC
    `

    const projectsWithBalance = projects.map((project) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      totalAmount: Number(project.totalAmount),
      currency: project.currency,
      balance: Number(project.balance),
      createdAt: project.createdAt,
      customer: {
        id: project.customerId,
        name: project.customerName,
      },
    }))

    return NextResponse.json(projectsWithBalance)
  },
  { fallbackError: 'Error al obtener proyectos del cliente' }
)
