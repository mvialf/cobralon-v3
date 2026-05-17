import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * IMPORTANTE: Forzar Node.js runtime para usar Prisma
 * Next.js usa Edge Runtime por defecto, pero Prisma requiere Node.js
 */
export const runtime = 'nodejs'

/**
 * Middleware de Autenticacion
 *
 * Protege las rutas de la aplicacion, redirigiendo a /login
 * si el usuario no tiene una sesion activa.
 *
 * Rutas publicas (no requieren auth):
 * - /login
 * - /api/auth/* (endpoints de autenticacion)
 * - /_next/* (archivos estaticos de Next.js)
 * - /favicon.ico
 *
 * Todas las demas rutas requieren autenticacion.
 *
 * @see https://www.better-auth.com/docs/integrations/next
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas publicas que NO requieren autenticacion
  const publicRoutes = ['/login']

  // Permitir acceso a rutas de auth API, archivos estaticos y publicas
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    publicRoutes.includes(pathname)
  ) {
    return NextResponse.next()
  }

  // Verificar sesion del usuario
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    // Si no hay sesion, redirigir a login
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      // Guardar la URL original para redirigir despues del login
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Usuario autenticado, permitir acceso
    return NextResponse.next()
  } catch (error) {
    // Error al verificar sesion, redirigir a login
    console.error('Error en middleware de auth:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

/**
 * Configuracion del Matcher
 *
 * Define que rutas pasan por el middleware.
 * Excluimos archivos estaticos y API routes de Next.js.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
