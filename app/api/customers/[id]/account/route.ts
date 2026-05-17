import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

interface CustomerAccountProjectRow {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: unknown
  currency: string
  allocatedTotal: unknown
  balance: unknown
}

/**
 * GET /api/customers/[id]/account
 *
 * Obtiene todos los datos necesarios para el estado de cuenta de un cliente:
 * - Datos del cliente (nombre)
 * - TODOS sus proyectos (incluyendo los pagados al 100%) con balance calculado
 *
 * Diferencia con /api/payments/customer-projects:
 * - Ese endpoint filtra solo proyectos con balance > 0 (para FIFO)
 * - Este endpoint devuelve TODOS los proyectos (para estado de cuenta)
 *
 * @returns {
 *   customer: { id, name },
 *   projects: Array<{
 *     id, projectNumber, projectName, totalAmount, balance, currency
 *   }>
 * }
 */
export const GET = withLogging(async (_request, logger, context) => {
  try {
    const { id } = await context.params

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const projects = await prisma.$queryRaw<CustomerAccountProjectRow[]>`
      SELECT
        p.id,
        p."projectNumber",
        p."projectName",
        p."totalAmount",
        p.currency,
        pf."allocatedTotal",
        pf.balance
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      WHERE p."customerId" = ${id}
        AND p."totalAmount" > 0
      ORDER BY p."createdAt" ASC
    `

    const projectsWithBalance = projects.map((project) => ({
      id: project.id,
      projectNumber: project.projectNumber,
      projectName: project.projectName,
      totalAmount: Number(project.totalAmount),
      totalPaid: Number(project.allocatedTotal),
      balance: Number(project.balance),
      currency: project.currency,
    }))

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
      },
      projects: projectsWithBalance,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching customer account')
    return NextResponse.json({ error: 'Error al obtener estado de cuenta' }, { status: 500 })
  }
})
