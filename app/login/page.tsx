import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// Forzar renderizado dinámico - evita pre-rendering con useSearchParams
export const dynamic = 'force-dynamic'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { LoginForm } from './login-form'

/**
 * Fallback mientras se carga el formulario
 */
function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}

/**
 * Pagina de Login (Server Component)
 *
 * Permite a los usuarios iniciar sesion con email y contrasena.
 * El formulario esta envuelto en Suspense para soportar pre-rendering
 * con useSearchParams (requerido por Next.js 15).
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
