import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/customers/[id]
 *
 * Obtiene un cliente por su ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 })
  }
}

/**
 * PUT /api/customers/[id]
 *
 * Actualiza un cliente existente
 *
 * Body:
 *   - name: string (opcional)
 *   - email: string (opcional)
 *   - phone: string (opcional)
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, phone } = body

    // Verificar que el cliente existe
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Validar teléfono si se proporciona (debe ser no vacío si se actualiza)
    if (phone !== undefined && (!phone || phone.trim().length === 0)) {
      return NextResponse.json({ error: 'El teléfono no puede estar vacío' }, { status: 400 })
    }

    // Validar email si se proporciona (opcional)
    if (email && typeof email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })
      }

      // Verificar si el email ya existe en otro cliente
      const duplicateEmail = await prisma.customer.findFirst({
        where: {
          email,
          NOT: { id },
        },
      })
      if (duplicateEmail) {
        return NextResponse.json({ error: 'Ya existe otro cliente con ese email' }, { status: 409 })
      }
    }

    // Actualizar cliente
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }), // Obligatorio, no puede ser null
        ...(email !== undefined && { email: email?.trim() || null }), // Opcional
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
  }
}

/**
 * DELETE /api/customers/[id]
 *
 * Elimina un cliente
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Verificar que el cliente existe
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existingCustomer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Eliminar cliente
    await prisma.customer.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Cliente eliminado' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
  }
}
