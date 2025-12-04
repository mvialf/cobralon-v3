import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

// Schema de validación para reorder
const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})

/**
 * PATCH /api/payment-methods/reorder
 *
 * Actualiza el orden de los métodos de pago basado en un array de IDs ordenados.
 * El índice en el array determina el nuevo valor de `order`.
 *
 * @param orderedIds - Array de IDs de PaymentMethod en el orden deseado
 * @returns Success message
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderedIds } = reorderSchema.parse(body)

    // Validar que todos los IDs existan
    const existingMethods = await prisma.paymentMethod.findMany({
      where: {
        id: {
          in: orderedIds,
        },
      },
      select: { id: true },
    })

    if (existingMethods.length !== orderedIds.length) {
      return NextResponse.json(
        {
          error: 'Algunos IDs no existen',
          message: 'Uno o más métodos de pago no fueron encontrados',
        },
        { status: 400 }
      )
    }

    // Validar que el count total coincida (prevenir updates parciales)
    const totalCount = await prisma.paymentMethod.count()
    if (totalCount !== orderedIds.length) {
      return NextResponse.json(
        {
          error: 'Count mismatch',
          message: `Se esperaban ${totalCount} métodos pero se recibieron ${orderedIds.length}`,
        },
        { status: 400 }
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
  } catch (error) {
    console.error('Error reordering payment methods:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Los datos proporcionados son inválidos',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Error al actualizar el orden de los métodos de pago',
      },
      { status: 500 }
    )
  }
}
