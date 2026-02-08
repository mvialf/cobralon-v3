import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  uninstallTagWithOptionalAbbreviationSchema,
  normalizeUninstallTagPayload,
} from '@/lib/validations/uninstall-tag-validations'
import type { z } from 'zod'
import { Prisma } from '@prisma/client'

type CreateUninstallTagBody = z.infer<typeof uninstallTagWithOptionalAbbreviationSchema>

/**
 * GET /api/uninstall-tags
 *
 * Obtiene todas las tags de desinstalación, ordenadas por orden ascendente
 *
 * Query params:
 * - includeInactive: "true" para incluir tags inactivas (default: false)
 * - includeColor: "true" para incluir datos del color (default: true)
 */
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const includeColor = searchParams.get('includeColor') !== 'false' // default true

    // Build query options
    const queryOptions: Prisma.UninstallTagFindManyArgs = {
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
    }

    // Add include conditionally
    if (includeColor) {
      queryOptions.include = {
        color: {
          select: {
            id: true,
            name: true,
            key: true,
            bgClass: true,
            textClass: true,
          },
        },
      }
    }

    const uninstallTags = await prisma.uninstallTag.findMany(queryOptions)

    return NextResponse.json({ uninstallTags })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching uninstall tags')
    return NextResponse.json({ error: 'Error al obtener las uninstall tags' }, { status: 500 })
  }
})

/**
 * POST /api/uninstall-tags
 *
 * Crea una nueva uninstall tag
 *
 * Validaciones:
 * - El nombre debe ser único
 * - La abreviatura debe tener exactamente 2 letras mayúsculas
 * - El colorId debe existir en BadgeColor
 */
export const POST = withApiHandler<CreateUninstallTagBody>(
  async (_request, logger, { body }) => {
    const normalized = normalizeUninstallTagPayload(body)

    // Validaciones en paralelo
    const [existingByName, colorExists, maxOrderResult] = await Promise.all([
      prisma.uninstallTag.findUnique({
        where: { name: normalized.name },
      }),
      prisma.badgeColor.findUnique({
        where: { id: normalized.colorId },
      }),
      prisma.uninstallTag.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true },
      }),
    ])

    if (existingByName) {
      throw new BusinessError(`Ya existe una tag con el nombre "${normalized.name}"`)
    }

    if (!colorExists) {
      throw new BusinessError('El color seleccionado no existe')
    }

    const order = maxOrderResult ? maxOrderResult.order + 10 : 10

    const newTag = await prisma.uninstallTag.create({
      data: {
        name: normalized.name,
        abbreviation: normalized.abbreviation,
        colorId: normalized.colorId,
        order,
      },
      include: {
        color: true,
      },
    })

    logger.info({ tagId: newTag.id }, 'Uninstall tag created')
    return NextResponse.json({ uninstallTag: newTag }, { status: 201 })
  },
  {
    bodySchema: uninstallTagWithOptionalAbbreviationSchema,
    fallbackError: 'Error al crear la uninstall tag',
  }
)
