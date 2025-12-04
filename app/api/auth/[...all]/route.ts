import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

/**
 * Better Auth API Route Handler
 *
 * Esta ruta maneja todas las operaciones de autenticacion:
 * - POST /api/auth/sign-in/email - Login con email/password
 * - POST /api/auth/sign-up/email - Registro de usuario
 * - POST /api/auth/sign-out - Logout
 * - GET /api/auth/get-session - Obtener sesion actual
 * - Y mas endpoints automaticos...
 *
 * @see https://www.better-auth.com/docs/integrations/next
 */
export const { POST, GET } = toNextJsHandler(auth)
