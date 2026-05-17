import { PrismaClient } from '@prisma/client'

/**
 * Type para transacción de Prisma
 *
 * Representa el cliente de Prisma disponible dentro de una transacción.
 * Excluye métodos que no están disponibles en transacciones.
 *
 * @example
 * ```ts
 * await prisma.$transaction(async (tx: PrismaTransaction) => {
 *   await tx.payment.create({ data })
 * })
 * ```
 */
export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>
