import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  paymentMethodSchema,
  type PaymentMethodFormValues,
} from '@/lib/validations/payment-method-validations'

/**
 * PUT /api/payment-methods/[id]
 * Actualiza un método de pago existente
 */
export const PUT = withApiHandler<PaymentMethodFormValues>(
  async (_request, _logger, { params, body }) => {
    const { id } = params
    const { name, icon, hasInstallments, maxInstallments } = body

    // Verificar que el método existe
    const existing = await prisma.paymentMethod.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new BusinessError('Método de pago no encontrado', 404)
    }

    // Validar que no exista otro método con el mismo nombre
    if (name !== existing.name) {
      const duplicate = await prisma.paymentMethod.findUnique({
        where: { name },
      })

      if (duplicate) {
        throw new BusinessError(`El método de pago "${name}" ya existe`, 409)
      }
    }

    // Actualizar método de pago
    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        name,
        icon: icon || null,
        hasInstallments,
        maxInstallments,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    })

    return NextResponse.json({ paymentMethod: updated })
  },
  {
    bodySchema: paymentMethodSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar el método de pago',
  }
)

/**
 * DELETE /api/payment-methods/[id]
 * Elimina un método de pago (solo si no tiene pagos asociados)
 */
export const DELETE = withApiHandler(
  async (_request, _logger, { params }) => {
    const { id } = params

    // Verificar que el método existe
    const method = await prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    })

    if (!method) {
      throw new BusinessError('Método de pago no encontrado', 404)
    }

    // Verificar que no tenga pagos asociados
    if (method._count.payments > 0) {
      throw new BusinessError(
        `No se puede eliminar el método "${method.name}" porque tiene ${method._count.payments} pago(s) asociado(s)`,
        409
      )
    }

    // Eliminar método de pago
    await prisma.paymentMethod.delete({
      where: { id },
    })

    return NextResponse.json({
      message: `El método de pago "${method.name}" se eliminó correctamente`,
    })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar el método de pago' }
)
