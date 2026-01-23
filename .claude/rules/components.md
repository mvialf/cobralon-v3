---
paths: ["components/**/*.tsx", "app/**/*.tsx"]
---

# Convenciones de Componentes

## Path Aliases

- `@/components` → componentes
- `@/lib` → utilidades y helpers
- `@/hooks` → custom hooks
- `@/app` → App Router de Next.js

## Crear Nueva Página

```tsx
// 1. Crear archivo: app/dashboard/page.tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function DashboardPage() {
  return (
    <AppLayout pageTitle="Dashboard" pageDescription="Descripción">
      <div>Tu contenido aquí</div>
    </AppLayout>
  )
}

// 2. Agregar al sidebar (opcional)
// Editar: components/layout/app-sidebar.tsx líneas 19-48
```

## Agregar Componente shadcn/ui

```bash
npx shadcn@latest add [component-name]
```

## Convenciones Obligatorias

- **Prohibido `any`**: Usar interfaces, tipos específicos o `unknown`
- Layouts son client components (`"use client"`)
- Iconos desde `lucide-react`
- Path imports con alias `@/`

## Patrones de Features

1. **Read-Only Data Display** → Server Component + DataTable
2. **CRUD Operations** → Form + Dialog + API Route
3. **Modal Interactions** → Dialog + Client Component
4. **Complex Relations (N:M)** → Transformers + Allocations

## Principios

- Server Components First (fetch en server)
- Extract When It Hurts (>10 líneas O 2+ usos)
- Data Down, Events Up (props > hooks)

**Guía completa:** [docs/template/guides/building-features/](docs/template/guides/building-features/)
