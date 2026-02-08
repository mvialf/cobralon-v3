import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  createStatusApiSchema,
  type CreateStatusApiBody,
} from '@/lib/validations/base-status-validations'

/**
 * GET /api/visit-status
 *
 * Obtiene todos los estados de visita, ordenados por orden ascendente
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

    const visitStatuses = await prisma.visitStatus.findMany({
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
          select: { visits: true },
        },
      },
    })

    return NextResponse.json({ visitStatuses })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching visit statuses')
    return NextResponse.json({ error: 'Error al obtener los estados de visita' }, { status: 500 })
  }
})

/**
 * POST /api/visit-status
 *
 * Crea un nuevo estado de visita
 *
 * Validaciones:
 * - Solo puede haber un estado con isInitial=true
 * - Solo puede haber un estado con isFinal=true
 * - El nombre debe ser único
 * - El colorId debe existir en BadgeColor
 */
export const POST = withApiHandler<CreateStatusApiBody>(
  async (_request, logger, { body }) => {
    // Validaciones en paralelo
    const [existingByName, colorExists, currentInitial, currentFinal] = await Promise.all([
      prisma.visitStatus.findUnique({
        where: { name: body.name },
      }),
      prisma.badgeColor.findUnique({
        where: { id: body.colorId },
      }),
      body.isInitial
        ? prisma.visitStatus.findFirst({
            where: { isInitial: true, isActive: true },
          })
        : Promise.resolve(null),
      body.isFinal
        ? prisma.visitStatus.findFirst({
            where: { isFinal: true, isActive: true },
          })
        : Promise.resolve(null),
    ])

    if (existingByName) {
      throw new BusinessError(`Ya existe un estado con el nombre "${body.name}"`)
    }

    if (body.isInitial && currentInitial) {
      throw new BusinessError(
        `Ya existe un estado inicial: "${currentInitial.name}". Solo puede haber uno.`
      )
    }

    if (body.isFinal && currentFinal) {
      throw new BusinessError(
        `Ya existe un estado final: "${currentFinal.name}". Solo puede haber uno.`
      )
    }

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
      const maxNormalOrder = await prisma.visitStatus.findFirst({
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

    const newStatus = await prisma.visitStatus.create({
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

    logger.info({ statusId: newStatus.id }, 'Visit status created')
    return NextResponse.json({ visitStatus: newStatus }, { status: 201 })
  },
  { bodySchema: createStatusApiSchema, fallbackError: 'Error al crear el estado de visita' }
)
