import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth Client
 *
 * Cliente de autenticacion para usar en componentes de React.
 * Proporciona hooks y funciones para:
 * - Login/Logout
 * - Session management
 *
 * @example
 * // En un Client Component:
 * import { authClient } from "@/lib/auth-client";
 *
 * function LoginForm() {
 *   const { data, error } = await authClient.signIn.email({
 *     email: "[email protected]",
 *     password: "password123"
 *   });
 * }
 *
 * @see https://www.better-auth.com/docs/basic-usage
 */
export const authClient = createAuthClient({
  // Base URL se infiere automaticamente del environment
  // En desarrollo: http://localhost:3000
  // En produccion: tu dominio de Vercel
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
})

// Re-export hooks utiles
export const { useSession } = authClient
