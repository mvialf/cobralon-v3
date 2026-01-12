import { Decimal } from '@prisma/client/runtime/library'

/**
 * Serializa datos de Prisma para pasar a Client Components.
 *
 * Convierte:
 * - Date → string ISO
 * - Decimal → number
 * - Objetos anidados → recursivamente
 * - Arrays → cada elemento
 *
 * @example
 * const data = await prisma.project.findMany(...)
 * return serialize(data) // Safe para HydrationBoundary
 */
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      // Decimal → number
      if (value instanceof Decimal) {
        return value.toNumber()
      }
      // BigInt → number (si alguna vez se usa)
      if (typeof value === 'bigint') {
        return Number(value)
      }
      return value
    })
  )
}
