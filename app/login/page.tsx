import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[45fr_55fr]">
      {/* Panel izquierdo - Branding */}
      <div className="hidden lg:flex bg-sidebar text-sidebar-foreground flex-col justify-between p-12">
        <div>
          <span className="text-sm font-medium tracking-wider text-sidebar-foreground/60 uppercase">
            Sistema de gestion
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">Cobralon</h1>
          <p className="text-lg text-sidebar-foreground/60 max-w-md leading-relaxed">
            Gestion de cobranza, proyectos y pagos en un solo lugar.
          </p>
          <div className="flex items-center gap-3 pt-4">
            <div className="h-px w-12 bg-sidebar-primary" />
            <span className="text-sm text-sidebar-primary font-medium">
              Control financiero simplificado
            </span>
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/40">
          &copy; {new Date().getFullYear()} Cobralon
        </p>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex flex-col items-center justify-center bg-background p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Branding mobile - visible solo en pantallas chicas */}
          <div className="mb-10 lg:hidden">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Cobralon</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sistema de gestion de cobranza</p>
          </div>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
