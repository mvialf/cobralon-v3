# Plan: Migrar Endpoints Fetch-All a Patrón SQL Optimizado

**Fecha:** 2026-03-17
**Actualizado:** 2026-03-18
**Estado:** ✅ Completado
**Prioridad:** 2 (Media-Alta)
**Implementado en:** branch `dev2`, commits `7ba0abd`, `073b4d8`, `d9ded9d`

---

## Contexto

### Problema

Varios endpoints traen **todos los registros a memoria** y luego filtran, ordenan y paginan en JavaScript. Esto funciona con volúmenes bajos pero escala mal.

### Patrón de referencia

Ya existe un patrón optimizado en `lib/queries/project-list.ts` que usa:
- SQL raw con `normalize_text()` para búsqueda sin acentos (wrapper de `unaccent` + `lower` en PostgreSQL)
- Filtros en WHERE de SQL
- Paginación con LIMIT/OFFSET en SQL
- Facets con GROUP BY en SQL
- Tipos auxiliares en `types/project-list.ts`

Estructura: 4 funciones (`queryProjectList`, `countProjects`, `getStatusFacets`, `getStateFacets`) con `Prisma.$queryRaw` + `Prisma.sql` template literals seguros.

Los endpoints problemáticos son versiones anteriores que nunca se migraron a este patrón.

---

## Endpoints a Migrar

### 1. `GET /api/visits` — Prioridad Alta

**Archivo:** `app/api/visits/route.ts`

**Problema actual confirmado:** 5 pasadas secuenciales en JS (el código tiene un comentario admitiendo el patrón: `"filtros se aplican en memoria para normalización de búsqueda"`):
1. `prisma.visit.findMany` sin filtros — trae TODO
2. `.filter()` para búsqueda normalizada
3. `for...of` sobre `searchFiltered` para construir facets contando en JS (solo si `includeFacets=true`)
4. `.filter()` por statusIds
5. `.sort()` condicional + `.slice()` para orden y paginación

**JOIN actual:** `visitStatus` con `color` (bgClass, textClass).

**Solución:**
1. Crear `lib/queries/visit-list.ts` replicando el patrón de `project-list.ts`
2. Mover búsqueda a SQL con `normalize_text()` (función PostgreSQL ya existe globalmente)
3. Mover filtro de estado a WHERE con `visitStatusId = ANY($1)`
4. Mover orden a ORDER BY con whitelist de columnas
5. Mover paginación a LIMIT/OFFSET
6. Calcular facets con query separada usando GROUP BY `visitStatusId`

**Archivos:**
- `lib/queries/visit-list.ts` — **Crear** (no existe actualmente)
- `app/api/visits/route.ts` — Refactorizar para usar el nuevo query

### 2. `GET /api/projects-with-metadata` — Prioridad Alta

**Archivo:** `app/api/projects-with-metadata/route.ts`

**Problema actual confirmado:** Hace `Promise.all` con 2 queries (proyectos + statuses). Proyectos usa `findMany` sin `take`/`skip`. Tiene un pre-filtro DB por `customerId` y `projectState` via `getProjectStateWhere()`, pero la búsqueda textual y el filtro fino de estado se aplican en JS. Paginación manual con `.slice()`.

**Consumer único:** `hooks/queries/use-projects.ts` → `useProjectsWithMetadata(params)` con queryKey `['projects-with-metadata', params]`.

**Hook alternativo existente:** `useProjects(params)` consume `/api/projects` (que ya usa `project-list.ts` optimizado) con queryKey `['projects']`, `staleTime: 60s`, `placeholderData: keepPreviousData`.

**Solución:**
1. Migrar el consumer `useProjectsWithMetadata` a usar `/api/projects` (que ya está optimizado)
2. **Eliminar** el endpoint `/api/projects-with-metadata` y el hook `useProjectsWithMetadata`
3. Las mutations ya invalidan ambas query keys `['projects']` y `['projects-with-metadata']` — simplificar a solo `['projects']`

**Archivos:**
- `app/api/projects-with-metadata/route.ts` — **Eliminar**
- `hooks/queries/use-projects.ts` — Eliminar `useProjectsWithMetadata`, adaptar callers
- Componentes que usan `useProjectsWithMetadata` — Migrar a `useProjects`

### 3. Installments: Filtro Client-Side — Prioridad Media

**Archivo:** `app/payments/installments/page.tsx`

**Problema actual confirmado:**
- Línea 24: `fetch('/api/installments?limit=1000')` con comentario explícito "Fetch con límite alto para paginación client-side"
- Líneas 57-63: `useMemo` filtra por `statusFilter` sobre el array completo en memoria
- El filtro operativo debe derivarse por `dueDate`; `status` ya no existe en el modelo.

**Estado del bloqueo anterior:** resuelto. El plan de cuotas derivadas ya fue aplicado; no hay `paidDate` ni cron vigente.

**Nota importante:** El endpoint `GET /api/installments` **ya usa paginación server-side correcta** (`skip`/`take` con `parsePaginationParams`, `Promise.all([findMany, count])`, `relationLoadStrategy: 'join'`). El problema está solo en el consumer (la página) que pide `limit=1000` y filtra en cliente.

**Solución:**
1. Pasar filtro de fecha como query param al API (reemplaza filtro de status)
2. Eliminar `useMemo` de filtrado client-side
3. Usar paginación server-side real (20-50 por página) en vez de `limit=1000`

**Archivos:**
- `app/payments/installments/page.tsx` — Refactorizar fetch con paginación real
- `app/api/installments/route.ts` — Ya soporta paginación; verificar filtros post-plan-P4

---

## Fases de Implementación

### Fase 1: Visits (independiente)

1. Crear `lib/queries/visit-list.ts` con:
   - Parámetros: `search`, `statusIds`, `sortBy`, `sortOrder`, `page`, `limit`
   - Query raw con JOINs: `Visit → VisitStatus → BadgeColor`, `Visit → Project → Customer`
   - Búsqueda con `normalize_text()` sobre campos relevantes (nombre cliente, número proyecto, dirección)
   - Facets con query GROUP BY `visitStatusId` separada
2. Crear `types/visit-list.ts` con tipos raw y transformados (replicar patrón de `types/project-list.ts`)
3. Refactorizar `app/api/visits/route.ts` para usar el nuevo módulo
4. Verificar que la UI de visitas sigue funcionando

**Verificación:**
```bash
npm run typecheck
npm run dev  # Verificar tabla de visitas manualmente
```

### Fase 2: Projects-with-metadata (independiente)

1. Identificar todos los componentes que usan `useProjectsWithMetadata`:
```bash
grep -rn "useProjectsWithMetadata" --include="*.ts" --include="*.tsx" app/ components/ hooks/
```
2. Migrar cada consumer a `useProjects` — verificar que la interfaz de datos es compatible
3. Eliminar `useProjectsWithMetadata` de `hooks/queries/use-projects.ts`
4. Eliminar endpoint `app/api/projects-with-metadata/route.ts`
5. Simplificar invalidaciones de mutations: quitar `['projects-with-metadata']`

**Verificación:**
```bash
npm run typecheck
npm run dev  # Verificar que las tablas/vistas de proyectos funcionan
```

### Fase 3: Installments Client-Side (después del plan P4)

1. Modificar `page.tsx` para pasar filtros al servidor (fecha en vez de status)
2. Implementar paginación server-side real con `page`/`limit` params
3. Eliminar `limit=1000` y `useMemo` de filtrado
4. Agregar controles de paginación en UI

**Verificación:**
```bash
npm run typecheck
npm run dev  # Verificar tabla de cuotas
```

---

## Referencia: Patrón a Replicar

Estructura de `lib/queries/project-list.ts`:

```typescript
// SORT_COLUMN_MAP — whitelist de columnas permitidas para ORDER BY
const SORT_COLUMN_MAP: Record<string, Prisma.Sql> = {
  projectNumber: Prisma.sql`p."projectNumber"`,
  total: Prisma.sql`p."totalAmount"`,
  // ...
}

interface QueryParams {
  search?: string
  statusIds?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// 4 funciones exportadas:
export async function queryProjectList(params): Promise<RawRow[]>   // datos con LIMIT/OFFSET
export async function countProjects(params): Promise<number>        // COUNT total
export async function getStatusFacets(params): Promise<Facet[]>     // GROUP BY status
export async function getStateFacets(params): Promise<Facet[]>      // GROUP BY estado derivado
```

---

## Riesgos

- **Visits:** La función `normalize_text()` ya existe en PostgreSQL (creada para proyectos). Verificar con `SELECT normalize_text('test')` que aplica globalmente.
- **Projects-with-metadata:** El hook `useProjectsWithMetadata` podría devolver campos que `useProjects` no incluye. Comparar interfaces antes de migrar.
- **Installments:** Depende del plan P4. No implementar antes de que P4 esté completo.
