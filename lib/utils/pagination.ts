/**
 * Helpers de paginación para API routes.
 *
 * Centraliza el parseo de query params de paginación y la construcción
 * del objeto de respuesta, eliminando duplicación en ~7 routes.
 */

/**
 * Parsea y valida los parámetros de paginación de una URL.
 *
 * - page: mínimo 1
 * - limit: entre 1 y 100, default configurable
 * - skip: calculado automáticamente
 */
export function parsePaginationParams(searchParams: URLSearchParams, defaultLimit = 10) {
  const normalizedDefaultLimit = parsePositiveInteger(defaultLimit, 10)
  const page = parsePositiveInteger(searchParams.get('page'), 1)
  const limit = Math.min(
    parsePositiveInteger(searchParams.get('limit'), normalizedDefaultLimit),
    100
  )

  return { page, limit, skip: (page - 1) * limit }
}

function parsePositiveInteger(value: string | number | null, fallback: number) {
  if (value === null) {
    return fallback
  }

  const numberValue = typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value)

  if (!Number.isFinite(numberValue)) {
    return fallback
  }

  return Math.max(1, Math.trunc(numberValue))
}

/**
 * Construye el objeto de paginación para la respuesta JSON.
 */
export function buildPaginationResponse(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}
