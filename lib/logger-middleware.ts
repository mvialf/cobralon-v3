/**
 * Logger Middleware para Next.js API Routes
 *
 * Provee wrapper withLogging() para auto-logging de requests/responses
 * con generación automática de requestId y child loggers.
 *
 * @see docs/project/decisions/012-pino-structured-logging.md
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type pino from 'pino'
import { logger, generateRequestId } from './logger'

/**
 * Handler type para API routes con logger inyectado
 *
 * Note: context es opcional para backward compatibility,
 * pero el wrapper externo siempre lo recibe de Next.js 15
 */
export type APIHandler = (
  request: NextRequest,
  logger: pino.Logger,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse

/**
 * Wrapper para API routes con logging automático
 *
 * Features:
 * - Genera requestId único
 * - Logs de request received/completed
 * - Tracking de duration
 * - Error handling con logging
 * - Child logger con contexto inyectado
 *
 * @example
 * ```typescript
 * // app/api/payments/route.ts
 * import { withLogging } from '@/lib/logger-middleware'
 *
 * export const POST = withLogging(async (request, logger) => {
 *   logger.info('Processing payment creation')
 *
 *   const body = await request.json()
 *
 *   // Child logger con contexto de negocio
 *   const paymentLogger = logger.child({ customerId: body.customerId })
 *   paymentLogger.debug('Validating payment data')
 *
 *   // ... tu lógica ...
 *
 *   paymentLogger.info({ paymentId: result.id }, 'Payment created')
 *   return NextResponse.json(result, { status: 201 })
 * })
 * ```
 */
export function withLogging(handler: APIHandler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const startTime = performance.now()
    const requestId = generateRequestId()

    // Extraer información del request
    const url = new URL(request.url)
    const method = request.method
    const path = url.pathname
    const searchParams = Object.fromEntries(url.searchParams)

    // Child logger con contexto del request
    const requestLogger = logger.child({
      requestId,
      method,
      path,
      ...(Object.keys(searchParams).length > 0 && { searchParams }),
    })

    // Log inicial
    requestLogger.info('Request received')

    try {
      // Ejecutar handler con logger inyectado
      // Pasar context tal cual - el handler decide si usa params o no
      const response = await handler(request, requestLogger, context)

      // Calcular duración
      const duration = Math.round(performance.now() - startTime)

      // Log de éxito
      requestLogger.info(
        {
          status: response.status,
          duration,
        },
        'Request completed'
      )

      return response
    } catch (error) {
      // Calcular duración
      const duration = Math.round(performance.now() - startTime)

      // Log de error
      requestLogger.error(
        {
          err: error,
          duration,
        },
        'Request failed'
      )

      // Re-throw para que Next.js maneje el error
      throw error
    }
  }
}

/**
 * Helper para extraer y logear body de requests de forma segura
 *
 * IMPORTANTE: Este helper clona el request porque .json() consume el stream.
 * Úsalo con cuidado para no duplicar parsing.
 *
 * @example
 * ```typescript
 * export const POST = withLogging(async (request, logger) => {
 *   const body = await logRequestBody(request, logger)
 *
 *   // ... tu lógica ...
 * })
 * ```
 */
export async function logRequestBody<T = unknown>(
  request: NextRequest,
  logger: pino.Logger,
  options: {
    /** Campos a excluir del log (además de los redacted globalmente) */
    exclude?: string[]
    /** Nivel de logging (default: debug) */
    level?: 'trace' | 'debug' | 'info'
  } = {}
): Promise<T> {
  const { exclude = [], level = 'debug' } = options

  try {
    const body = (await request.json()) as T

    // Crear copia para logging sin campos excluidos
    const bodyForLogging = { ...(body as object) }
    exclude.forEach((key) => {
      delete bodyForLogging[key as keyof typeof bodyForLogging]
    })

    logger[level]({ body: bodyForLogging }, 'Request body parsed')

    return body
  } catch (error) {
    logger.warn({ err: error }, 'Failed to parse request body')
    throw error
  }
}

/**
 * Helper para logear response antes de enviarlo
 *
 * @example
 * ```typescript
 * export const GET = withLogging(async (request, logger) => {
 *   const data = await fetchData()
 *
 *   return logResponse(
 *     NextResponse.json(data),
 *     logger,
 *     { message: 'Data fetched successfully' }
 *   )
 * })
 * ```
 */
export function logResponse(
  response: NextResponse,
  logger: pino.Logger,
  options: {
    /** Mensaje custom para el log */
    message?: string
    /** Metadata adicional */
    meta?: Record<string, unknown>
    /** Nivel de logging (default: debug) */
    level?: 'trace' | 'debug' | 'info'
  } = {}
): NextResponse {
  const { message = 'Response ready', meta = {}, level = 'debug' } = options

  logger[level](
    {
      status: response.status,
      ...meta,
    },
    message
  )

  return response
}

/**
 * Helper para crear child logger con contexto de negocio común
 *
 * @example
 * ```typescript
 * export const POST = withLogging(async (request, logger) => {
 *   const body = await request.json()
 *
 *   // Child logger con contexto automático
 *   const bizLogger = createBusinessLogger(logger, {
 *     customerId: body.customerId,
 *     operation: 'payment_creation'
 *   })
 *
 *   bizLogger.info('Starting payment validation')
 *   // ... logs heredan customerId y operation ...
 * })
 * ```
 */
export function createBusinessLogger<T extends Record<string, unknown>>(
  logger: pino.Logger,
  context: T
): pino.Logger {
  return logger.child(context)
}
