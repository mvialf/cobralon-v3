import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging deshabilitado temporalmente para mejorar performance
    // ANTES: log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    log: ['error'], // Solo errors, incluso en desarrollo
  })

// ✅ Habilitar extensiones de Prisma para mejor performance
// relationJoins ya está habilitado en schema.prisma como preview feature
// Esto convierte múltiples queries en JOINs SQL, reduciendo roundtrips a la DB

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
