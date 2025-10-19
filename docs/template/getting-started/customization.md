# Customización del Template

Guía para personalizar el template según tus necesidades.

## 1. Cambiar Colores y Theming

### Color Primario

Edita [app/globals.css](../../../app/globals.css):

```css
@theme {
  /* Cambia el color primario */
  --color-primary: 176 84% 25%; /* HSL sin hsl() */
  /* Verde: 142 76% 36% */
  /* Azul: 217 91% 60% */
  /* Púrpura: 262 83% 58% */
}
```

### Variables de Tema Completas

Todas las variables están en [app/globals.css líneas 6-68](../../../app/globals.css#L6-L68).

Variables principales:

- `--color-background` - Fondo principal
- `--color-foreground` - Texto principal
- `--color-primary` - Color primario (botones, links)
- `--color-destructive` - Color de errores
- `--color-sidebar-*` - Colores del sidebar

## 2. Customizar Sidebar

### Cambiar Logo

Edita [components/layout/app-sidebar.tsx](../../../components/layout/app-sidebar.tsx):

```tsx
<SidebarHeader>
  <div className="flex items-center gap-2 px-2 py-2">
    <span className="text-xl font-bold">TU LOGO</span>
  </div>
</SidebarHeader>
```

### Agregar/Quitar Links de Navegación

Edita el array `navigationItems`:

```tsx
const navigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Usuarios', href: '/users', icon: Users },
  // Agrega más aquí
]
```

Ver guía completa en [AppSidebar docs](../components/app-sidebar.md).

## 3. Customizar Header

Edita [components/layout/header-nav.tsx](../../../components/layout/header-nav.tsx):

### Cambiar Logo

```tsx
<Link href="/">
  <span className="text-xl font-bold">MI APP</span>
</Link>
```

### Quitar Notificaciones

Comenta o elimina el bloque del Bell icon.

### Customizar User Menu

Edita el DropdownMenu:

```tsx
<DropdownMenuContent>
  <DropdownMenuItem>Mi Perfil</DropdownMenuItem>
  <DropdownMenuItem>Configuración</DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem>Cerrar Sesión</DropdownMenuItem>
</DropdownMenuContent>
```

## 4. Customizar Componentes UI

Los componentes shadcn/ui son **tu código**. Edítalos directamente.

### Ejemplo: Cambiar Estilos de Button

Edita [components/ui/button.tsx](../../../components/ui/button.tsx):

```tsx
const buttonVariants = cva('inline-flex items-center justify-center rounded-md...', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      // Agrega variant custom:
      brand: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    },
  },
})
```

Uso:

```tsx
<Button variant="brand">Mi botón custom</Button>
```

## 5. Cambiar Tipografía

El template usa **Geist Sans** y **Geist Mono**.

### Cambiar a Otra Font

1. Edita [app/layout.tsx](../../../app/layout.tsx):

```tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      {children}
    </html>
  )
}
```

2. Actualiza [app/globals.css](../../../app/globals.css#L71-L72):

```css
body {
  font-family: var(--font-sans);
}
```

## 6. Agregar Nuevas Páginas

### Página Simple

```bash
mkdir app/users
```

```tsx
// app/users/page.tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function UsersPage() {
  return (
    <AppLayout pageTitle="Usuarios">
      <div>Lista de usuarios</div>
    </AppLayout>
  )
}
```

### Página con Parámetros Dinámicos

```bash
mkdir -p app/users/[id]
```

```tsx
// app/users/[id]/page.tsx
export default function UserDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppLayout pageTitle={`Usuario ${params.id}`}>
      <div>Detalles del usuario {params.id}</div>
    </AppLayout>
  )
}
```

## 7. Configuración de Producción

### Habilitar Type Checking en Builds

Edita [next.config.mjs](../../../next.config.mjs):

```javascript
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // ← Cambiar a false
  },
  typescript: {
    ignoreBuildErrors: false, // ← Cambiar a false
  },
}
```

### Optimizar Imágenes

```javascript
const nextConfig = {
  images: {
    unoptimized: false, // ← Cambiar a false
    domains: ['tu-cdn.com'], // Agregar dominios permitidos
  },
}
```

## 8. Agregar Autenticación

El template NO incluye auth por defecto. Opciones recomendadas:

### NextAuth.js

```bash
npm install next-auth
```

Ver [NextAuth.js docs](https://next-auth.js.org/getting-started/example).

### Clerk

```bash
npm install @clerk/nextjs
```

Ver [Clerk Next.js docs](https://clerk.com/docs/quickstarts/nextjs).

### Supabase Auth

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

Ver [Supabase Auth docs](https://supabase.com/docs/guides/auth/quickstarts/nextjs).

## 9. Agregar Base de Datos

El template NO incluye DB por defecto. Opciones:

- **Prisma** + PostgreSQL/MySQL
- **Drizzle ORM** + PostgreSQL
- **Supabase** (DB + Auth + Storage)
- **Firebase** (Firestore)

## 10. Deploy

### Vercel (Recomendado para Next.js)

```bash
npm install -g vercel
vercel
```

### Otros Providers

- **Netlify**: Compatible con Next.js
- **Railway**: Soporta Next.js + DB
- **Docker**: Crea Dockerfile custom

---

## Siguiente Paso

Explora [Componentes UI](../components/ui-components.md) o lee [Methodology](../methodology/) para workflows.

## Ver También

- [Stack Tecnológico](../architecture/stack.md)
- [ADRs](../decisions/) - Decisiones arquitecturales
- [Patterns](../methodology/patterns.md) - Code patterns
