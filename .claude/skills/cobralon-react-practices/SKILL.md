---
name: cobralon-react-practices
description: |
  Guia de buenas practicas React/Next.js adaptada a Cobralon. Basada en Vercel React Best Practices, filtrada y contextualizada para nuestro stack (Next.js 15, React 19, React Query v5, Prisma, Server Components).

  USAR CUANDO: escribas, revises o refactorices componentes React, pages de Next.js, data fetching, API routes o Client Components. Aplica automaticamente al crear nuevos componentes, modificar hooks, o revisar rendimiento.

  NO es una guia generica — cada regla fue auditada contra el codebase real de Cobralon. Las reglas irrelevantes fueron descartadas con justificacion.
---

# Cobralon React Practices

12 reglas activas, 7 patrones establecidos, 20+ reglas descartadas. Adaptada de [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices).

## Reglas Activas por Prioridad

Aplicar en codigo nuevo y refactorizaciones. Para ejemplos detallados con before/after: ver [references/active-rules.md](references/active-rules.md).

### PRIORIDAD CRITICA — Eliminar Waterfalls

| ID | Regla | Aplicacion en Cobralon |
|----|-------|----------------------|
| `async-defer-await` | Mover await despues de validaciones tempranas | API routes con validacion secuencial |
| `async-suspense` | Usar `<Suspense>` para streaming de contenido | Pages principales (projects, payments, customers) |

### PRIORIDAD ALTA — Bundle y Server

| ID | Regla | Aplicacion en Cobralon |
|----|-------|----------------------|
| `bundle-dynamic` | Usar `next/dynamic` para componentes pesados | Calendarios, dialogos complejos, formularios grandes |
| `server-select` | Usar `select` en vez de `include` en Prisma queries SSR | Server Components que pasan datos a Client Components |

### PRIORIDAD MEDIA — Re-renders y UX

| ID | Regla | Aplicacion en Cobralon |
|----|-------|----------------------|
| `rerender-transitions` | Usar `useTransition` para filtros/paginacion | DataTable de projects, payments, customers, visits |
| `rerender-derived-state` | Calcular estado derivado en render, no en effects | Formularios complejos (payment-to-customer-form) |
| `rerender-event-handlers` | Mover logica de useEffect a event handlers | Sincronizacion de formularios |
| `rerender-clean-deps` | Corregir dependency arrays, eliminar eslint-disable | Hooks con deps incorrectos |
| `rerender-clean-memo` | Eliminar useMemo/useCallback innecesarios | ~18 useCallback y ~10 useMemo triviales |

### PRIORIDAD BAJA — Calidad de Codigo

| ID | Regla | Aplicacion en Cobralon |
|----|-------|----------------------|
| `rendering-conditional` | Usar ternario en vez de `&&` para renders condicionales | Prevenir renders de `0` o `""` |
| `rendering-hoist-jsx` | Extraer JSX estatico fuera del componente | Configuraciones de columnas, opciones fijas |
| `rendering-content-visibility` | Usar `content-visibility: auto` en listas largas | DataTables con muchas filas |

## Patrones Establecidos (No Regresionar)

Ya implementados correctamente. Para documentacion: ver [references/established-patterns.md](references/established-patterns.md).

| Patron | Estado | Ubicacion |
|--------|--------|-----------|
| `Promise.all` para queries paralelas | 25+ usos | Pages SSR, API routes |
| `serialize()` para Decimal/Date | Centralizado | `lib/utils/serialize.ts` |
| Prefetch paralelo con React Query | Todas las pages | `HydrationBoundary` + `dehydrate` |
| `keepPreviousData` en paginacion | Todos los hooks | `hooks/queries/` |
| `useState(() => ...)` lazy init | QueryClient | `components/providers/query-provider.tsx` |
| Functional setState | Paginacion/filtros | `page-client.tsx` |
| Early return en API routes | Consistente | `app/api/` |

## Reglas Descartadas (y por que)

| Regla Vercel | Razon de exclusion |
|-------------|-------------------|
| `client-swr-dedup` | Usamos React Query v5, no SWR. React Query tiene dedup built-in |
| `server-cache-react` / `server-cache-lru` | No tenemos queries duplicadas entre Server Components |
| `server-auth-actions` | No usamos Server Actions — solo API Routes |
| `bundle-barrel-imports` | Solo 5 barrel files pequenos, impacto minimo |
| `js-*` (12 reglas) | Micro-optimizaciones JS sin impacto medible en app de gestion |
| `advanced-*` (3 reglas) | Patrones avanzados innecesarios para nuestro caso |
| `rendering-svg-*` | No tenemos animaciones SVG |
| `client-localstorage-schema` | Solo `ConfigurationContext` usa localStorage, ya esta bien |
| `client-passive-event-listeners` | No tenemos scroll listeners custom |
| `async-dependencies` (better-all) | No queremos agregar dependencias — Promise.all + .then() cubre nuestros casos |
| `bundle-preload` | Next.js Link ya hace prefetch automatico |
| `server-after-nonblocking` | No tenemos operaciones post-response (analytics, logging diferido) |

## Checklist para Code Review

Verificar en cada PR que toque React/Next.js:

```
[ ] No hay await secuenciales que puedan ser paralelos
[ ] Componentes pesados usan next/dynamic si no se renderizan en viewport inicial
[ ] Filtros y paginacion usan useTransition
[ ] No hay useEffect para estado derivado (calcular en render)
[ ] No hay useMemo/useCallback wrapping primitivos o expresiones simples
[ ] Server Components usan select (no include) cuando pasan datos a Client
[ ] Condicionales de render usan ternario, no &&
```
