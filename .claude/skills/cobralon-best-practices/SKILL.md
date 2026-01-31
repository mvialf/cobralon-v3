---
name: cobralon-best-practices
description: |
  Guía centralizada de buenas prácticas React/Next.js para Cobralon.
  Usar cuando: (1) se escribe código nuevo en componentes, páginas o API routes,
  (2) se hace refactoring de código existente, (3) se revisa código por performance,
  (4) se optimiza bundle size o tiempos de carga, (5) se necesita verificar si un
  patrón sigue las convenciones del proyecto.

  Cubre: patrones establecidos del proyecto, paralelización de queries Prisma,
  raw SQL con Prisma.sql, indexing strategy, facets opcionales, imports dinámicos,
  React.cache(), after(), re-render optimization, rendering patterns,
  TanStack Query patterns (query keys, mutations, SSR hydration), y
  convenciones Next.js 15 + React 19 + React Query + Prisma.
---

# Cobralon Best Practices

Guía centralizada de buenas prácticas React/Next.js para Cobralon.
Combina patrones ya establecidos en el proyecto con mejoras pendientes basadas en las guías de Vercel.

## Resumen de categorías

| # | Categoría | Impacto | Estado | Referencia |
|---|-----------|---------|--------|------------|
| 0 | Patrones establecidos | — | ✅ Mantener | [established-patterns.md](references/established-patterns.md) |
| 1 | Async waterfalls | CRITICAL | ⚠️ Parcial | [critical-async-bundle-patterns.md](references/critical-async-bundle-patterns.md) |
| 2 | Bundle size | CRITICAL | ⚠️ Parcial | [critical-async-bundle-patterns.md](references/critical-async-bundle-patterns.md) |
| 3 | Server-side performance | HIGH | ⚠️ Pendiente | [server-patterns.md](references/server-patterns.md) |
| 4 | Re-render optimization | MEDIUM | ⚠️ Pendiente | [client-rerender-patterns.md](references/client-rerender-patterns.md) |
| 5 | Rendering patterns | MEDIUM | ⚠️ Pendiente | [rendering-patterns.md](references/rendering-patterns.md) |
| 6 | DB & raw query perf | HIGH | ✅ Implementado | [db-query-patterns.md](references/db-query-patterns.md) |
| 7 | TanStack Query patterns | HIGH | ✅ Documentado | [tanstack-query-patterns.md](references/tanstack-query-patterns.md) |

## Patrones establecidos (referencia rápida)

Lo que Cobralon **ya hace bien** y debe mantenerse en código nuevo.
Ver detalles en [established-patterns.md](references/established-patterns.md).

| Patrón | Ejemplo real |
|--------|-------------|
| Server/Client split con HydrationBoundary | `app/customer/page.tsx` + `page-client.tsx` |
| Promise.all en GET endpoints | `app/api/customers/route.ts:46-50` |
| Named imports (lucide-react, etc.) | `import { Pencil, Trash2 } from 'lucide-react'` |
| Barrel files selectivos | `components/data-table/index.ts` |
| React Hook Form + Zod | `components/forms/customer/customer-form.tsx` |
| Composición de campos de formulario | `ProjectFinancialFields`, `AddressFields` |
| Structured logging con Pino | `withLogging` en 24+ endpoints |
| Lógica financiera aislada | `lib/business-logic/` sin deps de UI |
| keepPreviousData en React Query | `hooks/queries/use-customers.ts` |
| serialize() para RSC → Client | `lib/utils/serialize.ts` |
| Path aliases @/ | Todos los imports |

## Reglas por prioridad

### CRITICAL — Async waterfalls

| Regla | Estado | Referencia |
|-------|--------|------------|
| Paralelizar queries independientes con Promise.all | 🔄 Parcial (GET ✅, POST ⚠️) | [critical-async-bundle-patterns.md#async-parallel](references/critical-async-bundle-patterns.md#paralelizar-queries-independientes) |
| Defer await hasta donde se necesite | ⚠️ Pendiente | [critical-async-bundle-patterns.md#async-defer](references/critical-async-bundle-patterns.md#defer-await-hasta-donde-se-necesite) |
| Suspense boundaries para streaming | ⚠️ Pendiente | [critical-async-bundle-patterns.md#async-suspense](references/critical-async-bundle-patterns.md#suspense-boundaries-para-streaming) |

### CRITICAL — Bundle size

| Regla | Estado | Referencia |
|-------|--------|------------|
| Dynamic imports para componentes pesados | ⚠️ Pendiente | [critical-async-bundle-patterns.md#bundle-dynamic](references/critical-async-bundle-patterns.md#dynamic-imports-para-componentes-pesados) |
| Defer third-party libs (xlsx) | ⚠️ Pendiente | [critical-async-bundle-patterns.md#bundle-third-party](references/critical-async-bundle-patterns.md#defer-third-party-libs) |
| Named imports (no barrel *) | ✅ Implementado | [established-patterns.md](references/established-patterns.md#named-imports) |

### HIGH — Server-side

| Regla | Estado | Referencia |
|-------|--------|------------|
| React.cache() para deduplicación | ⚠️ Pendiente | [server-patterns.md#cache](references/server-patterns.md#reactcache-para-deduplicación) |
| after() para ops no-bloqueantes | ⚠️ Pendiente | [server-patterns.md#after](references/server-patterns.md#after-para-operaciones-no-bloqueantes) |
| Minimizar serialización RSC | ✅ Implementado | [server-patterns.md#serialization](references/server-patterns.md#minimizar-serialización-rsc) |
| Parallel fetching en server components | ✅ Implementado | [server-patterns.md#parallel](references/server-patterns.md#parallel-fetching-en-server-components) |

### HIGH — DB & Raw Query Performance

| Regla | Estado | Referencia |
|-------|--------|------------|
| Raw SQL con Prisma.sql/Prisma.empty para queries condicionales | ✅ Implementado | [db-query-patterns.md](references/db-query-patterns.md) |
| JOIN condicional vs EXISTS subquery | ✅ Implementado | [db-query-patterns.md](references/db-query-patterns.md) |
| Facets opcionales con includeFacets param | ✅ Implementado | [db-query-patterns.md](references/db-query-patterns.md) |
| Índices compuestos con sort direction | ✅ Implementado | [db-query-patterns.md](references/db-query-patterns.md) |

### MEDIUM — Re-renders

| Regla | Estado | Referencia |
|-------|--------|------------|
| Estado derivado sin useEffect | ⚠️ Pendiente | [client-rerender-patterns.md#derived](references/client-rerender-patterns.md#estado-derivado-sin-useeffect) |
| setState funcional | ⚠️ Pendiente | [client-rerender-patterns.md#functional-setstate](references/client-rerender-patterns.md#setstate-funcional) |
| Lazy state initialization | ⚠️ Pendiente | [client-rerender-patterns.md#lazy-init](references/client-rerender-patterns.md#lazy-state-initialization) |
| useTransition para updates no-urgentes | ⚠️ Pendiente | [client-rerender-patterns.md#transitions](references/client-rerender-patterns.md#usetransition-para-updates-no-urgentes) |
| Dependencias primitivas en effects | ⚠️ Pendiente | [client-rerender-patterns.md#deps](references/client-rerender-patterns.md#dependencias-primitivas-en-effects) |

### MEDIUM — Rendering

| Regla | Estado | Referencia |
|-------|--------|------------|
| content-visibility para listas largas | ⚠️ Pendiente | [rendering-patterns.md#content-visibility](references/rendering-patterns.md#content-visibility-para-listas-largas) |
| Conditional render con ternarios (no &&) | ⚠️ Pendiente | [rendering-patterns.md#conditional](references/rendering-patterns.md#conditional-render-con-ternarios) |
| Hoist static JSX | ⚠️ Pendiente | [rendering-patterns.md#hoist-jsx](references/rendering-patterns.md#hoist-static-jsx) |

## Issues conocidos pendientes

Issues concretos detectados en el código actual:

### ~~1. Waterfall en POST `/api/payments/route.ts`~~ ✅ Resuelto

Resuelto con patrón defer: queries se inician antes de validaciones sync, await al necesitar resultados. Ver `route.ts:345-354`.

### 2. Waterfall en PUT `/api/projects/[id]/route.ts`

**Líneas ~100-117:** findUnique del proyecto + findUnique condicional del customer.

### 3. xlsx importado estáticamente

**Archivos `lib/excel/*.ts`:** La librería `xlsx` (~150KB gz) se importa con `import * as XLSX from 'xlsx'` en 10+ archivos. Se carga en el bundle incluso cuando el usuario no usa funciones de Excel.

### 4. Sin `next/dynamic` para componentes pesados

Diálogos de importación Excel y otros componentes pesados se cargan en el bundle inicial.

## Cómo usar

### Al escribir código nuevo

1. Consulta [established-patterns.md](references/established-patterns.md) para seguir las convenciones existentes
2. Si escribes un API route, revisa las reglas async en [critical-async-bundle-patterns.md](references/critical-async-bundle-patterns.md)
3. Si agregas dependencias externas, revisa las reglas de bundle en el mismo archivo

### Al hacer refactoring

1. Revisa [issues conocidos pendientes](#issues-conocidos-pendientes) para oportunidades cercanas
2. Consulta la referencia específica según el área que estés tocando

### Al revisar código

Usa las tablas de "Reglas por prioridad" como checklist rápido.

### Relación con otros skills y rules

| Recurso | Cubre | No duplicar |
|---------|-------|-------------|
| `.claude/rules/api-routes.md` | Estructura de API routes, validación Zod, HTTP codes | Estructura básica de routes |
| `.claude/rules/database.md` | Prisma, transacciones, FIFO | Lógica financiera |
| `.claude/rules/components.md` | Convenciones de componentes, shadcn/ui | Estructura básica de componentes |
| `.claude/rules/styles.md` | CSS, Tailwind, global.css | Estilos |
| Este skill | Performance, patrones avanzados, bundle, async | Todo lo de arriba |
