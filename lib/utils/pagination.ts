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
 * - limit: máximo 100, default configurable
 * - skip: calculado automáticamente
 */
export function parsePaginationParams(searchParams: URLSearchParams, defaultLimit = 10) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(parseInt(searchParams.get('limit') || String(defaultLimit)), 100)
  return { page, limit, skip: (page - 1) * limit }
}

/**
 * Construye el objeto de paginación para la respuesta JSON.
 */
export function buildPaginationResponse(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}
