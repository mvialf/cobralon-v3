import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '@/lib/db'

/**
 * Better Auth Configuration
 *
 * Sistema de autenticacion usando Better Auth con:
 * - Email/Password authentication
 * - Session management
 * - Prisma adapter para PostgreSQL (Neon)
 *
 * @see https://www.better-auth.com/docs
 */
export const auth = betterAuth({
  appName: 'Cobralon',

  // Database adapter (Prisma + PostgreSQL)
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Email & Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true, // Auto login despues de signup
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // Actualizar cada 24 horas
  },

  // Security settings
  advanced: {
    cookiePrefix: 'cobralon-auth',
    database: {
      generateId: () => crypto.randomUUID(), // UUID v4
    },
  },
})

// Type helpers para usar en toda la app
// Better Auth infiere los tipos automaticamente desde la configuracion
