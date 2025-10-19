import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/users
 *
 * Fetch all users with pagination support
 *
 * Query params:
 * - limit: Number of users to return (default: 10)
 * - offset: Number of users to skip (default: 0)
 *
 * Example: GET /api/users?limit=20&offset=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const take = Number(searchParams.get('limit')) || 10
    const skip = Number(searchParams.get('offset')) || 0

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

/**
 * POST /api/users
 *
 * Create a new user
 *
 * Body (JSON):
 * {
 *   "email": "user@example.com",
 *   "name": "User Name" // optional
 * }
 *
 * Example:
 * POST /api/users
 * Content-Type: application/json
 *
 * {
 *   "email": "john@example.com",
 *   "name": "John Doe"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // TODO: Add validation with Zod for production use
    // Example:
    // const userSchema = z.object({
    //   email: z.string().email(),
    //   name: z.string().optional()
    // })
    // const validatedData = userSchema.parse(body)

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name || null,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Database error:', error)

    // Handle unique constraint violation (duplicate email)
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
