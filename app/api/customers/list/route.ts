import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/customers/list
 * Obtiene lista simple de customers para Combobox
 *
 * @returns Array de customers con { id, name, phone }
 */
export const GET = withLogging(async (_request, logger) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    logger.error({ err: error }, 'Error al obtener lista de clientes')
    return NextResponse.json({ error: 'Error al obtener lista de clientes' }, { status: 500 })
  }
})
