import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { paymentMethodSchema } from '@/lib/validations/payment-method-validations'

/**
 * GET /api/payment-methods
 * Lista todos los métodos de pago ordenados por orden
 */
export async function GET() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { payments: true },
        },
      },
    })

    return NextResponse.json({ paymentMethods })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json({ error: 'Error al obtener los métodos de pago' }, { status: 500 })
  }
}

/**
 * POST /api/payment-methods
 * Crea un nuevo método de pago
 */
export async function POST(request: Request) {
  try {
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

    const { name, requiresReference, icon } = validation.data

    // Validar que no exista un método con el mismo nombre
    const existing = await prisma.paymentMethod.findUnique({
      where: { name },
    })

    if (existing) {
      return NextResponse.json({ error: `El método de pago "${name}" ya existe` }, { status: 409 })
    }

    // Obtener el máximo order actual y agregar 1
    const maxOrder = await prisma.paymentMethod.aggregate({
      _max: { order: true },
    })

    const newOrder = (maxOrder._max.order || 0) + 1

    // Crear método de pago
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        name,
        requiresReference,
        icon: icon || null,
        order: newOrder,
        active: true,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    })

    return NextResponse.json({ paymentMethod }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment method:', error)
    return NextResponse.json({ error: 'Error al crear el método de pago' }, { status: 500 })
  }
}
