import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateCustomerApiSchema,
  type UpdateCustomerApiBody,
} from '@/lib/validations/customer-validations'

/**
 * GET /api/customers/[id]
 *
 * Obtiene un cliente por su ID
 */
export const GET = withApiHandler(
  async (_request, _logger, { params }) => {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    })

    if (!customer) {
      throw new BusinessError('Cliente no encontrado', 404)
    }

    return NextResponse.json(customer)
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al obtener cliente' }
)

/**
 * PUT /api/customers/[id]
 *
 * Actualiza un cliente existente
 */
export const PUT = withApiHandler<UpdateCustomerApiBody>(
  async (_request, _logger, { params, body }) => {
    const { id } = params
    const { name, email, phone } = body

    // Verificar que el cliente existe
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existingCustomer) {
      throw new BusinessError('Cliente no encontrado', 404)
    }

    // Verificar email duplicado si se proporciona
    if (email && typeof email === 'string') {
      const duplicateEmail = await prisma.customer.findFirst({
        where: {
          email,
          NOT: { id },
        },
      })
      if (duplicateEmail) {
        throw new BusinessError('Ya existe otro cliente con ese email', 409)
      }
    }

    // Actualizar cliente
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone && { phone }),
        ...(email !== undefined && { email: email?.trim() || null }),
      },
    })

    return NextResponse.json(customer)
  },
  {
    bodySchema: updateCustomerApiSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar cliente',
  }
)

/**
 * DELETE /api/customers/[id]
 *
 * Elimina un cliente
 */
export const DELETE = withApiHandler(
  async (_request, _logger, { params }) => {
    const { id } = params

    // Verificar que el cliente existe
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existingCustomer) {
      throw new BusinessError('Cliente no encontrado', 404)
    }

    // Eliminar cliente
    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Cliente eliminado' })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar cliente' }
)
