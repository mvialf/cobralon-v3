import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler } from '@/lib/api-handler'
import { createUserSchema, type CreateUserBody } from '@/lib/validations/user-validations'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) return fallback

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return fallback

  return parsed
}

function getPaginationParams(url: string) {
  const { searchParams } = new URL(url)
  const requestedLimit = parsePositiveInteger(searchParams.get('limit'), DEFAULT_LIMIT)

  return {
    take: Math.min(requestedLimit, MAX_LIMIT),
    skip: parsePositiveInteger(searchParams.get('offset'), 0),
  }
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * GET /api/users
 *
 * Fetch users with safe local pagination.
 */
export const GET = withApiHandler(
  async (request) => {
    const { take, skip } = getPaginationParams(request.url)

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.user.count(),
    ])

    return NextResponse.json({
      data: users,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + take < total,
      },
    })
  },
  {
    requiredRole: 'admin',
    fallbackError: 'Failed to fetch users',
  }
)

/**
 * POST /api/users
 *
 * Create a user.
 */
export const POST = withApiHandler<CreateUserBody>(
  async (_request, _logger, { body }) => {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: body.role,
      },
      select: userSelect,
    })

    return NextResponse.json(user, { status: 201 })
  },
  {
    bodySchema: createUserSchema,
    requiredRole: 'admin',
    fallbackError: 'Failed to create user',
  }
)
