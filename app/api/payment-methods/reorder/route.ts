import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  reorderPaymentMethodsSchema,
  type ReorderPaymentMethodsBody,
} from '@/lib/validations/payment-method-validations'

/**
 * PATCH /api/payment-methods/reorder
 *
 * Actualiza el orden de los métodos de pago basado en un array de IDs ordenados.
 * El índice en el array determina el nuevo valor de `order`.
 */
export const PATCH = withApiHandler<ReorderPaymentMethodsBody>(
  async (_request, _logger, { body }) => {
    const { orderedIds } = body

    // Validar que todos los IDs existan
    const existingMethods = await prisma.paymentMethod.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true },
    })

    if (existingMethods.length !== orderedIds.length) {
      throw new BusinessError('Uno o más métodos de pago no fueron encontrados')
    }

    // Validar que el count total coincida (prevenir updates parciales)
    const totalCount = await prisma.paymentMethod.count()
    if (totalCount !== orderedIds.length) {
      throw new BusinessError(
        `Se esperaban ${totalCount} métodos pero se recibieron ${orderedIds.length}`
      )
    }

    // Actualizar el orden de todos los métodos en una transacción atómica
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.paymentMethod.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    return NextResponse.json({
      message: 'Orden actualizado correctamente',
    })
  },
  {
    bodySchema: reorderPaymentMethodsSchema,
    fallbackError: 'Error al actualizar el orden de los métodos de pago',
  }
)
