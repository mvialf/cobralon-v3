/**
 * Pino Structured Logger
 *
 * Singleton logger instance con configuración por ambiente.
 *
 * Features:
 * - Pretty-print en development
 * - JSON estructurado en production
 * - Redacción automática de campos sensibles
 * - Serialización de errores
 * - Child loggers para contexto
 *
 * @see docs/project/decisions/012-pino-structured-logging.md
 */

import pino from 'pino'

/**
 * Determina el nivel de logging basado en el ambiente
 */
function getLogLevel(): pino.Level {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as pino.Level | undefined

  // Validar que sea un nivel válido de Pino
  const validLevels: pino.Level[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace']
  if (envLevel && validLevels.includes(envLevel)) {
    return envLevel
  }

  // Default por ambiente
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

/**
 * Configuración de Pino
 */
const pinoConfig: pino.LoggerOptions = {
  level: getLogLevel(),

  // Formatters personalizados
  formatters: {
    level: (label) => {
      return { level: label }
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        // Agregar información del ambiente
        env: process.env.NODE_ENV || 'development',
      }
    },
  },

  // Serialización de objetos especiales
  serializers: {
    err: pino.stdSerializers.err, // Serializa Error objects con stack trace
    req: pino.stdSerializers.req, // Serializa Request objects
    res: pino.stdSerializers.res, // Serializa Response objects
  },

  // Redacción automática de campos sensibles
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'api_key',
      'accessToken',
      'access_token',
      'refreshToken',
      'refresh_token',
      'secret',
      'creditCard',
      'credit_card',
      'cardNumber',
      'card_number',
      'cvv',
      'ssn',
    ],
    censor: '[REDACTED]',
  },

  // Timestamp en formato ISO
  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty-print solo en development
  ...(process.env.NODE_ENV === 'production'
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{msg}',
          },
        },
      }),
}

/**
 * Singleton logger instance
 *
 * @example
 * ```typescript
 * import { logger } from '@/lib/logger'
 *
 * logger.info('Application started')
 * logger.error({ err: error }, 'Failed to process payment')
 *
 * // Child logger con contexto
 * const requestLogger = logger.child({ requestId: 'abc-123' })
 * requestLogger.info('Processing request')
 * ```
 */
export const logger = pino(pinoConfig)

/**
 * Genera un ID único para requests/operations
 *
 * @returns UUID v4
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}

/**
 * Genera un ID único para cron job executions
 *
 * @returns UUID v4 con timestamp
 */
export function generateRunId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const uuid = crypto.randomUUID().split('-')[0]
  return `run-${timestamp}-${uuid}`
}

/**
 * Sanitiza objetos para logging (previene referencias circulares)
 *
 * IMPORTANTE: Úsalo solo cuando sea necesario. Preferir selective logging.
 *
 * @example
 * ```typescript
 * const prismaModel = await db.payment.findUnique({ include: { customer: true } })
 *
 * // ❌ MALO: Puede tener referencias circulares
 * logger.info({ payment: prismaModel }, 'Payment fetched')
 *
 * // ✅ MEJOR: Selective logging
 * logger.info({
 *   paymentId: prismaModel.id,
 *   customerId: prismaModel.customer.id
 * }, 'Payment fetched')
 *
 * // ⚠️ ALTERNATIVA: Si realmente necesitas todo el objeto
 * logger.info({ payment: sanitizeForLogging(prismaModel) }, 'Payment fetched')
 * ```
 */
export function sanitizeForLogging<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch (error) {
    logger.warn({ err: error }, 'Failed to sanitize object for logging')
    return obj
  }
}

// Log de inicialización
logger.info(
  {
    level: getLogLevel(),
    env: process.env.NODE_ENV || 'development',
    prettyPrint: process.env.NODE_ENV !== 'production',
  },
  'Logger initialized'
)
