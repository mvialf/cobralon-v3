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
 * Note: En Next.js 15, params siempre es una Promise (aunque puede ser vacía para
 * rutas sin parámetros dinámicos)
 */
export type APIHandler = (
  request: NextRequest,
  logger: pino.Logger,
  context: { params: Promise<Record<string, string>> }
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
