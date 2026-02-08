import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { derivePaymentProgress } from '@/lib/business-logic/project-balance'
import { withLogging } from '@/lib/logger-middleware'

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

    // Obtener cliente con sus proyectos
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        projects: {
          where: {
            totalAmount: { gt: 0 }, // Solo proyectos con monto definido
          },
          orderBy: {
            createdAt: 'asc', // Más antiguos primero
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Derivar campos de display desde balance persistido
    const projectsWithBalance = customer.projects.map((project) => {
      const { totalPaid } = derivePaymentProgress(
        Number(project.totalAmount),
        Number(project.balance)
      )

      return {
        id: project.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        totalAmount: Number(project.totalAmount),
        totalPaid,
        balance: Number(project.balance),
        currency: project.currency,
      }
    })

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
