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

/**
 * Serializa campos Decimal de un proyecto completo (con customer.creditBalance).
 *
 * Usado en: calendar-events, project-events/[id]
 * Campos: subtotal, taxRate, total, balance, squareMeters, totalAmount, customer.creditBalance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeProjectDecimals<T extends Record<string, any>>(project: T) {
  return {
    ...project,
    subtotal: Number(project.subtotal),
    taxRate: Number(project.taxRate),
    total: Number(project.total),
    balance: Number(project.balance),
    squareMeters: Number(project.squareMeters),
    totalAmount: project.totalAmount ? Number(project.totalAmount) : null,
    customer: {
      ...project.customer,
      creditBalance: Number(project.customer.creditBalance),
    },
  }
}
