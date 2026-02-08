import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  teamTagWithOptionalAbbreviationSchema,
  normalizeTeamTagPayload,
} from '@/lib/validations/team-tag-validations'
import type { z } from 'zod'

type CreateTeamTagBody = z.infer<typeof teamTagWithOptionalAbbreviationSchema>

/**
 * GET /api/team-tags
 *
 * Obtiene todos los team tags, ordenados por orden ascendente
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

    const queryOptions: Parameters<typeof prisma.teamTag.findMany>[0] = {
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { order: 'asc' },
    }

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

    const teamTags = await prisma.teamTag.findMany(queryOptions)

    return NextResponse.json({ teamTags })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching team tags')
    return NextResponse.json({ error: 'Error al obtener los team tags' }, { status: 500 })
  }
})

/**
 * POST /api/team-tags
 *
 * Crea un nuevo team tag
 *
 * Validaciones:
 * - El nombre debe ser único
 * - La abreviatura debe tener exactamente 2 letras mayúsculas
 * - El colorId debe existir en BadgeColor
 */
export const POST = withApiHandler<CreateTeamTagBody>(
  async (_request, logger, { body }) => {
    const normalized = normalizeTeamTagPayload(body)

    // Validaciones en paralelo
    const [existingByName, colorExists, maxOrderResult] = await Promise.all([
      prisma.teamTag.findUnique({
        where: { name: normalized.name },
      }),
      prisma.badgeColor.findUnique({
        where: { id: normalized.colorId },
      }),
      prisma.teamTag.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true },
      }),
    ])

    if (existingByName) {
      throw new BusinessError(`Ya existe un integrante con el nombre "${normalized.name}"`)
    }

    if (!colorExists) {
      throw new BusinessError('El color seleccionado no existe')
    }

    const order = maxOrderResult ? maxOrderResult.order + 10 : 10

    const newTag = await prisma.teamTag.create({
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

    logger.info({ tagId: newTag.id }, 'Team tag created')
    return NextResponse.json({ teamTag: newTag }, { status: 201 })
  },
  {
    bodySchema: teamTagWithOptionalAbbreviationSchema,
    fallbackError: 'Error al crear el team tag',
  }
)
