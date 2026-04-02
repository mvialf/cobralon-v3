import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  paymentMethodSchema,
  type PaymentMethodFormValues,
} from '@/lib/validations/payment-method-validations'

/**
 * GET /api/payment-methods
 * Lista todos los métodos de pago ordenados por orden
 */
export const GET = withApiHandler(
  async () => {
    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: [{ active: 'desc' }, { order: 'asc' }, { name: 'asc' }],
      include: {
        commissionTiers: {
          orderBy: [{ minInstallments: 'asc' }],
        },
        _count: {
          select: { payments: true },
        },
      },
    })

    return NextResponse.json({ paymentMethods })
  },
  { fallbackError: 'Error al obtener los métodos de pago' }
)

/**
 * POST /api/payment-methods
 * Crea un nuevo método de pago
 */
export const POST = withApiHandler<PaymentMethodFormValues>(
  async (_request, _logger, { body }) => {
    const { name, icon, hasInstallments, maxInstallments, commissionTiers } = body

    // Validar que no exista un método con el mismo nombre
    const existing = await prisma.paymentMethod.findUnique({
      where: { name },
    })

    if (existing) {
      throw new BusinessError(`El método de pago "${name}" ya existe`, 409)
    }

    // Obtener el máximo order actual y agregar 1
    const maxOrder = await prisma.paymentMethod.aggregate({
      _max: { order: true },
    })

    const newOrder = (maxOrder._max.order || 0) + 1

    // Crear método de pago con tiers de comisión
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        name,
        icon: icon || null,
        order: newOrder,
        active: true,
        hasInstallments: hasInstallments || false,
        maxInstallments: maxInstallments || null,
        commissionTiers:
          commissionTiers && commissionTiers.length > 0
            ? {
                create: commissionTiers.map((tier) => ({
                  minInstallments: tier.minInstallments,
                  maxInstallments: tier.maxInstallments,
                  percentageFee: tier.percentageFee,
                  fixedFee: tier.fixedFee,
                })),
              }
            : undefined,
      },
      include: {
        commissionTiers: {
          orderBy: [{ minInstallments: 'asc' }],
        },
        _count: {
          select: { payments: true },
        },
      },
    })

    return NextResponse.json({ paymentMethod }, { status: 201 })
  },
  { bodySchema: paymentMethodSchema, fallbackError: 'Error al crear el método de pago' }
)
