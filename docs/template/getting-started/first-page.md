# Crear Tu Primera Página

Tutorial paso a paso para crear una página usando el template.

## Paso 1: Crear el Archivo de Página

Next.js usa file-based routing en el directorio `app/`.

```bash
# Crear directorio para la nueva página
mkdir app/dashboard
```

Crear `app/dashboard/page.tsx`:

```tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general de tu aplicación"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Dashboard' }]}
    >
      <div>
        <h2 className="text-2xl font-bold">¡Hola desde Dashboard!</h2>
        <p>Esta es tu primera página.</p>
      </div>
    </AppLayout>
  )
}
```

## Paso 2: Navegar a la Página

Abre [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

Verás:

- Header con logo, theme toggle, notificaciones, user menu
- Sidebar con navegación
- Tu contenido: "¡Hola desde Dashboard!"

## Paso 3: Agregar Link al Sidebar

Edita [components/layout/app-sidebar.tsx](../../../components/layout/app-sidebar.tsx):

```tsx
import { Home, LayoutDashboard, Users } from 'lucide-react'

const navigationItems = [
  {
    title: 'Inicio',
    href: '/',
    icon: Home,
  },
  {
    title: 'Dashboard', // ← Nuevo
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  // ...resto de items
]
```

Ahora el link aparecerá en el sidebar.

## Paso 4: Agregar Componentes UI

Mejoremos la página con componentes shadcn/ui:

```tsx
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Dashboard' }]}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Total de usuarios activos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1,234</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ventas</CardTitle>
            <CardDescription>Ventas este mes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">$45,231</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent>
            <Button>Ver Reportes</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
```

## Paso 5: Agregar Metadata (SEO)

Next.js permite metadata estática o dinámica:

```tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Mi App SaaS',
  description: 'Vista general de tu aplicación',
}

export default function DashboardPage() {
  // ...resto del código
}
```

## Patrones Comunes

### Página sin Sidebar

Si necesitas una página sin AppLayout:

```tsx
// app/landing/page.tsx
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header>Mi header custom</header>
      <main>Contenido sin sidebar</main>
      <footer>Footer</footer>
    </div>
  )
}
```

### Página con Loading State

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Cargando...</p>
    </div>
  )
}
```

### Página con Error Boundary

```tsx
// app/dashboard/error.tsx
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Algo salió mal</h2>
      <button onClick={reset}>Reintentar</button>
    </div>
  )
}
```

## Siguiente Paso

Lee [Customización](customization.md) para personalizar el template.

## Ver También

- [AppLayout API](../components/app-layout.md)
- [Componentes UI Disponibles](../components/ui-components.md)
- [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing)
