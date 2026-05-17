/**
 * API Handler middleware unificado para Next.js API Routes
 *
 * Provee:
 * - BusinessError: errores de negocio con statusCode
 * - handleApiError: diferenciación de errores (Zod, Prisma, negocio)
 * - withApiHandler: wrapper que integra logging + validación + error handling
 *
 * @see docs/project/decisions/012-pino-structured-logging.md
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type pino from 'pino'
import { ZodError, type ZodType, type ZodTypeDef } from 'zod'
import { auth } from './auth'
import { withLogging } from './logger-middleware'

const MAX_ZOD_ISSUES = 5

/**
 * Error de negocio con status HTTP específico.
 * Diferente de ApiError (lib/errors.ts) que es client-side.
 *
 * @example
 * throw new BusinessError('Crédito insuficiente', 400)
 * throw new BusinessError('Cliente no encontrado', 404)
 * throw new BusinessError('Email duplicado', 409, 'EMAIL_DUPLICATE')
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}

// Tipo para errores conocidos de Prisma
interface PrismaKnownError {
  code: string
  meta?: { target?: string[] }
}

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrismaKnownError).code === 'string' &&
    (error as { name?: string }).name === 'PrismaClientKnownRequestError'
  )
}

/**
 * Maneja errores de API diferenciando por tipo.
 * Exportada standalone para endpoints que no usen withApiHandler.
 *
 * - BusinessError → su statusCode (400, 404, etc.)
 * - ZodError → 400 con details
 * - Prisma P2002 → 409 Conflict
 * - Prisma P2025 → 404 Not Found
 * - Prisma P2003 → 400 FK violation
 * - Resto → 500 con fallbackMessage
 */
export function handleApiError(
  error: unknown,
  logger: pino.Logger,
  fallbackMessage: string = 'Error interno del servidor'
): NextResponse {
  // BusinessError → statusCode específico
  if (error instanceof BusinessError) {
    logger.warn({ statusCode: error.statusCode, code: error.code }, error.message)
    return NextResponse.json(
      { error: error.message, ...(error.code && { code: error.code }) },
      { status: error.statusCode }
    )
  }

  // ZodError → 400 con detalles de validación
  if (error instanceof ZodError) {
    const details = error.errors.slice(0, MAX_ZOD_ISSUES)
    logger.warn({ zodErrors: details, totalZodErrors: error.errors.length }, 'Validation failed')
    return NextResponse.json(
      { error: 'Datos inválidos', details, totalErrors: error.errors.length },
      { status: 400 }
    )
  }

  // Prisma known errors
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case 'P2002': {
        const fields = error.meta?.target?.join(', ') || 'campo'
        logger.warn({ prismaCode: error.code, fields }, 'Unique constraint violation')
        return NextResponse.json(
          { error: `Ya existe un registro con ese ${fields}`, code: 'UNIQUE_VIOLATION' },
          { status: 409 }
        )
      }
      case 'P2025':
        logger.warn({ prismaCode: error.code }, 'Record not found')
        return NextResponse.json(
          { error: 'Registro no encontrado', code: 'NOT_FOUND' },
          { status: 404 }
        )
      case 'P2003':
        logger.warn({ prismaCode: error.code }, 'Foreign key constraint violation')
        return NextResponse.json(
          { error: 'Referencia a registro inexistente', code: 'FK_VIOLATION' },
          { status: 400 }
        )
    }
  }

  // Error genérico → 500
  logger.error({ err: error }, fallbackMessage)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

// UUID v4 regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ApiHandlerOptions<TBody> {
  /** Schema Zod para parsear el body (constrains solo output type) */
  bodySchema?: ZodType<TBody, ZodTypeDef, unknown>
  /** Nombres de params de URL a validar como UUID */
  validateUuidParams?: string[]
  /** Rol requerido para ejecutar el handler */
  requiredRole?: string
  /** Roles permitidos para ejecutar el handler */
  requiredRoles?: string[]
  /** Mensaje genérico para errores 500 */
  fallbackError?: string
}

type ApiSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>
type SessionWithRole = ApiSession & {
  user: ApiSession['user'] & {
    role?: string | null
  }
}

interface HandlerContext<TBody> {
  params: Record<string, string>
  body: TBody
  session?: SessionWithRole
}

type ApiHandler<TBody> = (
  request: NextRequest,
  logger: pino.Logger,
  context: HandlerContext<TBody>
) => Promise<NextResponse> | NextResponse

/**
 * Wrapper unificado para API routes.
 * Integra withLogging + validación UUID + parsing Zod + error handling.
 *
 * @example
 * // Con body schema
 * export const POST = withApiHandler<CustomerFormData>(
 *   async (request, logger, { body }) => {
 *     const customer = await prisma.customer.create({ data: body })
 *     return NextResponse.json(customer, { status: 201 })
 *   },
 *   { bodySchema: customerSchema, fallbackError: 'Error al crear cliente' }
 * )
 *
 * @example
 * // Con UUID validation
 * export const GET = withApiHandler(
 *   async (request, logger, { params }) => {
 *     const project = await prisma.project.findUnique({ where: { id: params.id } })
 *     return NextResponse.json(project)
 *   },
 *   { validateUuidParams: ['id'] }
 * )
 */
export function withApiHandler<TBody = unknown>(
  handler: ApiHandler<TBody>,
  options: ApiHandlerOptions<TBody> = {}
) {
  const {
    bodySchema,
    validateUuidParams,
    requiredRole,
    requiredRoles,
    fallbackError = 'Error interno del servidor',
  } = options
  const allowedRoles = [...(requiredRole ? [requiredRole] : []), ...(requiredRoles ?? [])]

  return withLogging(async (request, logger, context) => {
    try {
      // 1. Resolver params
      const params = await context.params

      // 2. Verificar sesión/rol si el endpoint lo requiere
      let session: SessionWithRole | undefined
      if (allowedRoles.length > 0) {
        const authSession = await auth.api.getSession({
          headers: request.headers,
        })

        if (!authSession) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        session = authSession as SessionWithRole
        const role = typeof session.user.role === 'string' ? session.user.role : undefined
        if (!role || !allowedRoles.includes(role)) {
          return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
        }
      }

      // 3. Validar UUID params
      if (validateUuidParams) {
        for (const paramName of validateUuidParams) {
          const value = params[paramName]
          if (!value || !UUID_REGEX.test(value)) {
            return NextResponse.json(
              { error: `UUID inválido para parámetro '${paramName}'` },
              { status: 400 }
            )
          }
        }
      }

      // 4. Parsear body con Zod si hay schema
      let body = {} as TBody
      if (bodySchema) {
        let rawBody: unknown
        try {
          rawBody = await request.json()
        } catch {
          return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
        }

        const parseResult = bodySchema.safeParse(rawBody)
        if (!parseResult.success) {
          return handleApiError(parseResult.error, logger, fallbackError)
        }
        body = parseResult.data
      }

      // 5. Ejecutar handler
      return await handler(request, logger, { params, body, session })
    } catch (error) {
      return handleApiError(error, logger, fallbackError)
    }
  })
}
