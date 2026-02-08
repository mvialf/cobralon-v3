import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createStatusApiSchema,
  type CreateStatusApiBody,
} from '@/lib/validations/base-status-validations'

/**
 * GET /api/aftersale-status
 *
 * Obtiene todos los estados de postventa, ordenados por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir estados inactivos (default: false)
 * - includeColor: "true" para incluir datos del color (default: true)
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const includeColor = searchParams.get('includeColor') !== 'false' // default true

    const aftersaleStatuses = await prisma.aftersaleStatus.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        order: true,
        colorId: true,
        isInitial: true,
        isFinal: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        ...(includeColor && {
          color: {
            select: {
              id: true,
              name: true,
              key: true,
              bgClass: true,
              textClass: true,
            },
          },
        }),
        _count: {
          select: { aftersales: true },
        },
      },
    })

    return NextResponse.json({ aftersaleStatuses })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching aftersale statuses')
    return NextResponse.json(
      { error: 'Error al obtener los estados de postventa' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/aftersale-status
 *
 * Crea un nuevo estado de postventa
 *
 * Validaciones:
 * - Solo puede haber un estado con isInitial=true
 * - Solo puede haber un estado con isFinal=true
 * - El nombre debe ser único
 * - El colorId debe existir en BadgeColor
 */
export const POST = withApiHandler<CreateStatusApiBody>(
  async (_request, logger, { body }) => {
    // Validación: nombre único
    const existingByName = await prisma.aftersaleStatus.findUnique({
      where: { name: body.name },
    })

    if (existingByName) {
      throw new BusinessError(`Ya existe un estado con el nombre "${body.name}"`)
    }

    // Validación: solo un estado inicial
    if (body.isInitial) {
      const currentInitial = await prisma.aftersaleStatus.findFirst({
        where: { isInitial: true, isActive: true },
      })

      if (currentInitial) {
        throw new BusinessError(
          `Ya existe un estado inicial: "${currentInitial.name}". Solo puede haber uno.`
        )
      }
    }

    // Validación: solo un estado final
    if (body.isFinal) {
      const currentFinal = await prisma.aftersaleStatus.findFirst({
        where: { isFinal: true, isActive: true },
      })

      if (currentFinal) {
        throw new BusinessError(
          `Ya existe un estado final: "${currentFinal.name}". Solo puede haber uno.`
        )
      }
    }

    // Validación: colorId existe
    const colorExists = await prisma.badgeColor.findUnique({
      where: { id: body.colorId },
    })

    if (!colorExists) {
      throw new BusinessError('El color seleccionado no existe')
    }

    // Calcular order automáticamente según tipo de estado
    let order: number

    if (body.isInitial) {
      order = 0
    } else if (body.isFinal) {
      order = 999
    } else {
      const maxNormalOrder = await prisma.aftersaleStatus.findFirst({
        where: {
          isInitial: false,
          isFinal: false,
          order: { lt: 999 },
        },
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      order = maxNormalOrder ? maxNormalOrder.order + 10 : 10
    }

    const newStatus = await prisma.aftersaleStatus.create({
      data: {
        name: body.name,
        colorId: body.colorId,
        order,
        isInitial: body.isInitial ?? false,
        isFinal: body.isFinal ?? false,
        isActive: body.isActive ?? true,
      },
      include: {
        color: true,
      },
    })

    logger.info({ statusId: newStatus.id }, 'Aftersale status created')
    return NextResponse.json({ aftersaleStatus: newStatus }, { status: 201 })
  },
  { bodySchema: createStatusApiSchema, fallbackError: 'Error al crear el estado de postventa' }
)
