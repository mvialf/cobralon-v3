import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { paymentMethodSchema } from '@/lib/validations/payment-method-validations'

/**
 * PUT /api/payment-methods/[id]
 * Actualiza un método de pago existente
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validar con Zod
    const validation = paymentMethodSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      )
    }

    const { name, icon, hasInstallments, maxInstallments } = validation.data

    // Verificar que el método existe
    const existing = await prisma.paymentMethod.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Método de pago no encontrado' }, { status: 404 })
    }

    // Validar que no exista otro método con el mismo nombre
    if (name !== existing.name) {
      const duplicate = await prisma.paymentMethod.findUnique({
        where: { name },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: `El método de pago "${name}" ya existe` },
          { status: 409 }
        )
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
  } catch (error) {
    console.error('Error updating payment method:', error)
    return NextResponse.json({ error: 'Error al actualizar el método de pago' }, { status: 500 })
  }
}

/**
 * DELETE /api/payment-methods/[id]
 * Elimina un método de pago (solo si no tiene pagos asociados)
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

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
      return NextResponse.json({ error: 'Método de pago no encontrado' }, { status: 404 })
    }

    // Verificar que no tenga pagos asociados
    if (method._count.payments > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el método "${method.name}" porque tiene ${method._count.payments} pago(s) asociado(s)`,
        },
        { status: 409 }
      )
    }

    // Eliminar método de pago
    await prisma.paymentMethod.delete({
      where: { id },
    })

    return NextResponse.json({
      message: `El método de pago "${method.name}" se eliminó correctamente`,
    })
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return NextResponse.json({ error: 'Error al eliminar el método de pago' }, { status: 500 })
  }
}
