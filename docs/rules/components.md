---
paths: ["components/**/*.tsx", "app/**/*.tsx"]
---

# Convenciones de Componentes

## Path Aliases

- `@/components` -> componentes
- `@/lib` -> utilidades y helpers
- `@/hooks` -> custom hooks
- `@/app` -> App Router de Next.js

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

1. **Read-Only Data Display** -> Server Component + DataTable
2. **CRUD Operations** -> Form + Dialog + API Route
3. **Modal Interactions** -> Dialog + Client Component
4. **Complex Relations (N:M)** -> Transformers + Allocations

## Principios

- Server Components First (fetch en server)
- Extract When It Hurts (>10 líneas O 2+ usos)
- Data Down, Events Up (props > hooks)

Para features CRUD completas, usar el skill `cobralon-crud-generator` y contrastar con patrones reales en `app/customer`, `app/projects`, `components/forms` y `components/dialogs`.

## Dudas de Arquitectura

Si un componente replica cálculos de backend, contiene reglas de dominio persistentes o necesita previews financieros complejos, usar `cobralon-architecture-simplification` para decidir qué queda en frontend y qué debe ser función pura compartida o validación backend.
Contrastar también con `docs/rules/api-routes.md` para contratos de endpoints y con `docs/rules/database.md` cuando los totales dependan de persistencia, transacciones o balances derivados.

## Skills relacionados

- **Generación CRUD**: usar skill `cobralon-crud-generator` para crear feature completa
- **Best practices**: usar skill `cobralon-best-practices` para patrones de performance y rendering
- **Simplificación arquitectónica**: usar skill `cobralon-architecture-simplification` para duplicación frontend/backend y separación de responsabilidades
