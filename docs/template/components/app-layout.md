# AppLayout

Componente orchestrator principal del sistema de layout SaaS. Combina AppSidebar + contenido principal.

## Ubicación

[components/layout/app-layout.tsx](../../../components/layout/app-layout.tsx)

## Props

```typescript
interface AppLayoutProps {
  children: React.ReactNode // Contenido de la página
  pageTitle?: string // Título mostrado en PageHeader (default: "Dashboard")
  pageDescription?: string // Descripción bajo el título
  breadcrumbs?: Array<{
    // Breadcrumbs de navegación
    label: string
    href?: string // href opcional (último breadcrumb no tiene href)
  }>
}
```

## Uso Básico

```tsx
import AppLayout from '@/components/layout/app-layout'

export default function MyPage() {
  return (
    <AppLayout pageTitle="Mi Página" pageDescription="Descripción">
      <div>Tu contenido aquí</div>
    </AppLayout>
  )
}
```

## Con Breadcrumbs

```tsx
<AppLayout
  pageTitle="Perfil de Usuario"
  pageDescription="Gestiona tu información personal"
  breadcrumbs={[
    { label: 'Inicio', href: '/' },
    { label: 'Configuración', href: '/settings' },
    { label: 'Perfil' }, // Último sin href
  ]}
>
  <div>Contenido</div>
</AppLayout>
```

## Estructura Interna

```
AppLayout
└── SidebarProvider
    ├── AppSidebar (colapsible)
    └── main
        ├── PageHeader (título + descripción + breadcrumbs)
        └── children (tu contenido)
```

## Características

- ✅ Client Component (`"use client"`)
- ✅ Responsive (sidebar se convierte en drawer en mobile)
- ✅ Sidebar colapsible con estado persistente
- ✅ PageHeader integrado

## Cuándo NO Usar

- Páginas landing (sin sidebar/header interno)
- Páginas de auth (login, signup)
- Páginas completamente custom

En esos casos, crea tu layout manualmente sin AppLayout.

## Ver También

- [AppSidebar](app-sidebar.md) - Sidebar de navegación
- [ADR-004: Layout System](../decisions/004-layout-system-dos-capas.md) - Decisión arquitectural
