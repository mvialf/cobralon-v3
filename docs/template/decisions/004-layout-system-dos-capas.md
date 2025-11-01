# ADR-004: Sistema de Layout SaaS de 2 Capas

## Estado

**Aceptado** | **Fecha:** 2025-01-13 | **Última modificación:** 2025-10-17

## Decisión

Implementar un **sistema de layout de 2 capas**:

1. **AppLayout** (orchestrator) - Componente principal que orquesta todo
2. **AppSidebar** (collapsible sidebar) - Sidebar con navegación principal y footer

## Contexto

Necesitábamos un layout SaaS profesional y familiar (sidebar + contenido), fácil de usar (DX), responsive (desktop/mobile), personalizable y con interactividad moderna (sidebar colapsible, dropdowns, theme toggle).

## Alternativa Principal

**Server Component Layout:** Más simple conceptualmente y mejor performance (menos JS), pero **sidebar no puede ser interactivo** (collapse, state). Theme toggle, dropdowns y menus requieren Client Components de todos modos. NO elegido: La interactividad del sidebar es esencial para UX moderna.

## Consecuencias

### Positivas ✅

- **DX excepcional:** Crear página es trivial (import + props + children), sin reinventar layout cada vez
- **Configuración centralizada:** Sidebar navigation en un solo lugar ([app-sidebar.tsx:19-48](../../../components/layout/app-sidebar.tsx#L19-L48))
- **Interactividad moderna:** Sidebar colapsible (estado persiste), theme toggle, dropdowns accesibles, badges
- **Responsive:** Mobile (drawer overlay) + Desktop (sidebar colapsible), breakpoints automáticos
- **Profesional:** UX familiar (GitHub, Linear, Notion-style), consistencia visual

### Negativas ⚠️

**Client Component obligatorio:** AppLayout requiere `"use client"` (más JS en cliente) por interactividad (sidebar, dropdowns, state).
**Mitigación:** Los `children` de AppLayout PUEDEN ser Server Components. Solo el layout wrapper es cliente.

## Quick Start

**Crear nueva página con layout:**

```tsx
// app/dashboard/page.tsx
import AppLayout from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout
      pageTitle="Dashboard"
      pageDescription="Vista general"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Dashboard' }]}
    >
      <div>Tu contenido aquí</div>
    </AppLayout>
  )
}
```

**Configurar sidebar navigation:**

Editar [app-sidebar.tsx:19-48](../../../components/layout/app-sidebar.tsx#L19-L48):

```tsx
import { Home, Plus } from 'lucide-react'

const navigationItems = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Nuevo', href: '/nuevo', icon: Plus },
]
```

**Arquitectura:**

```
AppLayout
├── AppSidebar (collapsible, navigation, user menu)
└── Main Content
    ├── PageHeader (título, breadcrumbs)
    └── children (tu contenido)
```

**Páginas sin layout:** AppLayout es opcional. Para páginas custom (landing, auth), NO uses AppLayout:

```tsx
// app/landing/page.tsx
export default function Landing() {
  return <div>Custom layout aquí</div>
}
```

## Referencias

- [AppLayout API](../components/app-layout.md)
- [AppSidebar Config](../components/app-sidebar.md)

---

**Última actualización:** 2025-10-17
