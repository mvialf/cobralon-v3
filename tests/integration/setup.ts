import { config } from 'dotenv'
import { afterAll, beforeAll } from 'vitest'
import path from 'path'
import { prisma } from '@/lib/db'

/**
 * Setup global para tests de integración.
 *
 * Carga `.env.test` (no commiteado), verifica que apunte a una DB de test
 * y cierra la conexión Prisma al final del run.
 *
 * Salvaguarda crítica: el nombre del DATABASE_URL debe contener "test" para
 * evitar correr TRUNCATE contra una DB de desarrollo o producción por error.
 *
 * Las migraciones se asumen ya aplicadas al branch de Neon antes de correr
 * los tests (ver README de tests/integration). No las aplicamos aquí porque
 * `prisma migrate deploy` requiere shell + esto se ejecuta una sola vez.
 */
config({ path: path.resolve(process.cwd(), '.env.test') })

const dbUrl = process.env.DATABASE_URL ?? ''

if (!dbUrl) {
  throw new Error(
    '[integration setup] DATABASE_URL no configurada. ' +
      'Crea .env.test apuntando a un branch de Neon dedicado a tests.'
  )
}

if (!/test/i.test(dbUrl)) {
  throw new Error(
    '[integration setup] DATABASE_URL debe contener "test" en su nombre. ' +
      'Negativa a ejecutar tests destructivos contra una DB que no parece de test. ' +
      `URL recibida: ${dbUrl.replace(/:[^@]+@/, ':***@')}`
  )
}

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})
