---
name: cobralon-best-practices
description: "Usar para revisar u optimizar performance/rendering en Cobralon: bundle size, async waterfalls, server/client rendering, re-renders, React Query performance, query performance, RSC serialization y carga diferida. Verifica patrones existentes antes de copiarlos."
---

<!-- Usar cuando: (1) se investiga lentitud visible, renders excesivos o waterfalls,
(2) se optimiza bundle size o tiempos de carga, (3) se evalúa server/client rendering,
(4) se revisa performance de React Query o queries DB, (5) se necesita decidir si un
patrón existente sigue siendo conveniente desde performance.

Cubre: async waterfalls, paralelización de queries Prisma, query performance,
raw SQL con Prisma.sql, indexing strategy, facets opcionales, imports dinámicos,
React.cache(), after(), RSC serialization, re-render optimization, rendering patterns
y React Query performance (query keys, staleTime, SSR hydration, invalidaciones).

No usar como skill de arquitectura general. Si el problema principal es complejidad
estructural, límites de módulos o exceso de abstracciones, consulta primero
`cobralon-architecture-simplification` y optimiza después con medición o evidencia. -->

# Cobralon Best Practices

Skill de performance y rendering para Cobralon.
Usa patrones reales del repo como evidencia a verificar, no como reglas a preservar por defecto.
Antes de copiar un patrón existente, revisa si sigue resolviendo el caso actual sin introducir
waterfalls, renders innecesarios, sobre-fetching, bundle extra o serialización excesiva.

## Resumen de categorías

| # | Categoría | Impacto | Estado | Referencia |
|---|-----------|---------|--------|------------|
| 0 | Patrones existentes a verificar | — | Referencia | [established-patterns.md](references/established-patterns.md) |
| 1 | Async waterfalls | CRITICAL | ⚠️ Parcial | [critical-async-bundle-patterns.md](references/critical-async-bundle-patterns.md) |
| 2 | Bundle size | CRITICAL | ⚠️ Parcial | [critical-async-bundle-patterns.md](references/critical-async-bundle-patterns.md) |
| 3 | Server-side performance | HIGH | ⚠️ Pendiente | [server-patterns.md](references/server-patterns.md) |
| 4 | Re-render optimization | MEDIUM | ⚠️ Pendiente | [client-rerender-patterns.md](references/client-rerender-patterns.md) |
| 5 | Rendering patterns | MEDIUM | ⚠️ Pendiente | [rendering-patterns.md](references/rendering-patterns.md) |
| 6 | DB & raw query perf | HIGH | ✅ Implementado | [db-query-patterns.md](references/db-query-patterns.md) |
| 7 | TanStack Query patterns | HIGH | ✅ Documentado | [tanstack-query-patterns.md](references/tanstack-query-patterns.md) |

## Criterios de uso

- Verifica con código actual, bundle output, profiler, query plans o tests cuando el cambio tenga riesgo.
- Prefiere cambios medidos y locales sobre reescrituras amplias.
- Usa patrones existentes como punto de partida, pero no los preserves si causan waterfall, render redundante, bundle innecesario o query lenta.
- Rebaja reglas generales a heurísticas salvo en seguridad, invariantes financieros o contratos públicos.
- Si la causa es complejidad estructural, usa primero `cobralon-architecture-simplification`.

## Patrones existentes a verificar

Referencia rápida de patrones presentes en Cobralon. Ver detalles en
[established-patterns.md](references/established-patterns.md) y confirma que el caso actual
tiene el mismo perfil de performance antes de copiarlo.

| Patrón | Ejemplo real | Verificar |
|--------|--------------|-----------|
| Server/Client split con HydrationBoundary | `app/customer/page.tsx` + `page-client.tsx` | Hydration útil, no sobre-serializar |
| Promise.all en queries independientes | `app/api/projects/[id]/route.ts` | Independencia real y errores manejados |
| Named imports | `import { Pencil, Trash2 } from 'lucide-react'` | Tree-shaking efectivo |
| Barrel files selectivos | `components/data-table/index.ts` | No ocultan imports pesados |
| React Hook Form + Zod | `components/forms/customers/customer-form.tsx` | Validación sin renders excesivos |
| Structured logging | `withLogging`, `withApiHandler` | No bloquea el camino crítico |
| keepPreviousData en React Query | `hooks/queries/use-customers.ts` | UX y cache correctos para paginación |
| serialize() para RSC -> Client | `lib/utils/serialize.ts` | Payload necesario y acotado |

## Reglas por prioridad

### CRITICAL — Async waterfalls

| Regla | Estado | Referencia |
|-------|--------|------------|
| Preferir Promise.all para queries independientes | 🔄 Parcial (GET ✅, POST ⚠️) | [critical-async-bundle-patterns.md#async-parallel](references/critical-async-bundle-patterns.md#paralelizar-queries-independientes) |
| Defer await hasta donde se necesite | ⚠️ Pendiente | [critical-async-bundle-patterns.md#async-defer](references/critical-async-bundle-patterns.md#defer-await-hasta-donde-se-necesite) |
| Suspense boundaries para streaming | ⚠️ Pendiente | [critical-async-bundle-patterns.md#async-suspense](references/critical-async-bundle-patterns.md#suspense-boundaries-para-streaming) |

### CRITICAL — Bundle size

| Regla | Estado | Referencia |
|-------|--------|------------|
| Considerar dynamic imports para componentes pesados | ⚠️ Pendiente | [critical-async-bundle-patterns.md#bundle-dynamic](references/critical-async-bundle-patterns.md#dynamic-imports-para-componentes-pesados) |
| Verificar carga de third-party libs pesadas, incluido xlsx | ⚠️ Verificar | [critical-async-bundle-patterns.md#bundle-third-party](references/critical-async-bundle-patterns.md#defer-third-party-libs) |
| Named imports (no barrel *) | ✅ Implementado | [established-patterns.md](references/established-patterns.md#named-imports) |

### HIGH — Server-side

| Regla | Estado | Referencia |
|-------|--------|------------|
| Evaluar React.cache() para deduplicación | ⚠️ Pendiente | [server-patterns.md#cache](references/server-patterns.md#reactcache-para-deduplicación) |
| Evaluar after() para ops no-bloqueantes | ⚠️ Pendiente | [server-patterns.md#after](references/server-patterns.md#after-para-operaciones-no-bloqueantes) |
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

Issues o hipótesis que deben verificarse contra el código productivo actual antes de cambiar:

### ~~1. Waterfall en POST `/api/payments/route.ts`~~ ✅ Resuelto

Resuelto con patrón defer: queries se inician antes de validaciones sync, await al necesitar resultados. Ver `route.ts:345-354`.

### 2. Carga de `xlsx`

Antes de optimizar, verifica si `xlsx` se importa en código productivo, tests o ambos, y si realmente entra en el bundle inicial del usuario. No asumir que imports en tests afectan el bundle productivo.

### 3. Sin `next/dynamic` para componentes pesados

Verificar con bundle analyzer o trazas si diálogos de importación Excel u otros componentes pesados se cargan en el bundle inicial.

## Cómo usar

### Al investigar performance

1. Identifica si el síntoma es waterfall, bundle, rendering, React Query o DB.
2. Revisa la referencia específica y contrástala con el código actual.
3. Cambia solo lo necesario y verifica con lint/typecheck; usa medición adicional cuando aplique.

### Al revisar código existente

Usa las tablas de "Reglas por prioridad" como checklist rápido. Si el hallazgo no afecta performance/rendering/query perf, probablemente pertenece a `docs/rules/` u otro skill.

### Relación con otros skills y rules

| Recurso | Cubre | No duplicar |
|---------|-------|-------------|
| `docs/rules/api-routes.md` | Estructura de API routes, validación Zod, HTTP codes | Estructura básica de routes |
| `docs/rules/database.md` | Prisma, transacciones, FIFO | Lógica financiera |
| `docs/rules/components.md` | Convenciones de componentes, shadcn/ui | Estructura básica de componentes |
| `docs/rules/styles.md` | CSS, Tailwind, global.css | Estilos |
| `cobralon-architecture-simplification` | Complejidad estructural, límites de módulos, abstracciones | Optimizaciones locales de performance |
| Este skill | Performance, rendering, bundle, async, React Query y query perf | Arquitectura general |
