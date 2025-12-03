# Plan: Migración a Server-Side Filtering

> **Estado:** ✅ Fase 1-3 completadas para Projects (2025-12-03)
> **Creado:** 2025-12-03
> **Prioridad:** Alta (afecta correctitud de datos)

## ✅ Progreso de Implementación

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1.1 | Modificar data-table.tsx - manualFiltering | ✅ Completado |
| 1.2 | Modificar data-table-faceted-filter.tsx - serverFacets | ✅ Completado |
| 1.3 | Modificar data-table-toolbar.tsx - propagar filtros | ✅ Completado |
| 2.1 | Actualizar API /api/projects - filtros + facets | ✅ Completado |
| 3.1 | Actualizar projects/page.tsx - manualFiltering | ✅ Completado |
| 3.2 | Actualizar projects/columns.tsx | ✅ Completado |
| 4 | Migrar payments, customers, aftersales | ⏳ Pendiente |
| 5 | Optimizaciones (cache, índices) | ⏳ Pendiente |

---

## Resumen Ejecutivo

El sistema actual de DataTable mezcla incorrectamente patrones de filtrado server-side y client-side, causando comportamientos inconsistentes y datos incorrectos en filtros facetados. Este plan detalla la migración completa a server-side filtering para escalabilidad multi-tenant futura.

---

## Problema Identificado

### Síntomas

1. Filtros facetados muestran conteos incorrectos (calculados sobre página actual, no total)
2. Búsqueda client-side solo encuentra matches en registros paginados (20 de N)
3. Algunos filtros van al server, otros aplican client-side (inconsistente)
4. `getFacetedUniqueValues()` retorna `undefined` o valores erróneos

### Causa Raíz

```tsx
// data-table.tsx - PROBLEMA ACTUAL
const table = useReactTable({
  manualPagination: true, // ✅ Paginación server-side
  // manualFiltering: ???      // ❌ FALTA - No declarado
  getFilteredRowModel: getFilteredRowModel(), // ❌ Aplica filtrado client-side
  // getFacetedRowModel: ???   // ❌ FALTA - Facets no funcionan
})
```

**Según TanStack Table:** Cuando `manualPagination: true`, los datos ya vienen procesados del server. Aplicar `getFilteredRowModel()` filtra datos que ya están filtrados/paginados.

---

## Decisión Arquitectural

### Elegido: Server-Side Completo

**Razones:**

- Escalabilidad multi-tenant (miles de registros por tenant)
- Consistencia de datos (filtros siempre correctos)
- Menor carga en browser (solo datos de página actual)
- Código único de filtrado (solo en API, no duplicado)

**Trade-offs aceptados:**

- Más queries al DB (mitigado con cache e índices)
- Latencia en filtros (~100-300ms vs instantáneo)

---

## Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────┐
│                      BROWSER (Cliente)                       │
├─────────────────────────────────────────────────────────────┤
│  DataTable                                                   │
│  ├── manualPagination: true                                  │
│  ├── manualFiltering: true    ← NUEVO                        │
│  ├── state: { pagination, columnFilters, globalFilter }     │
│  ├── onPaginationChange → actualiza URL/estado              │
│  ├── onColumnFiltersChange → actualiza URL/estado           │
│  └── onGlobalFilterChange → actualiza URL/estado            │
│                                                              │
│  NO incluye:                                                 │
│  ├── getFilteredRowModel()    ← REMOVER cuando manual       │
│  ├── getFacetedRowModel()     ← No necesario                │
│  └── getFacetedUniqueValues() ← Viene del server            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Routes                           │
├─────────────────────────────────────────────────────────────┤
│  GET /api/projects?page=1&limit=20&search=jose&status=abc   │
│                                                              │
│  Response:                                                   │
│  {                                                           │
│    projects: [...],           // Solo página actual          │
│    pagination: {                                             │
│      page: 1,                                                │
│      limit: 20,                                              │
│      total: 1500,                                            │
│      totalPages: 75                                          │
│    },                                                        │
│    facets: {                  // ← NUEVO: Conteos reales     │
│      status: [                                               │
│        { value: "abc", label: "Activo", count: 800 },        │
│        { value: "def", label: "Pendiente", count: 450 },     │
│      ],                                                      │
│      projectState: [                                         │
│        { value: "Activo", count: 1200 },                     │
│        { value: "Finalizado", count: 300 },                  │
│      ]                                                       │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Base de Datos                           │
├─────────────────────────────────────────────────────────────┤
│  Queries optimizadas con:                                    │
│  ├── Índices compuestos (status, date, customer_id)         │
│  ├── WHERE con todos los filtros aplicados                  │
│  ├── COUNT para facets (puede ser query separada)           │
│  └── LIMIT/OFFSET para paginación                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Archivos Afectados

### Componentes Core (Modificar)

| Archivo                                               | Cambio                                                    |
| ----------------------------------------------------- | --------------------------------------------------------- |
| `components/data-table/data-table.tsx`                | Agregar soporte `manualFiltering`, condicionar row models |
| `components/data-table/data-table-toolbar.tsx`        | Enviar filtros al parent en lugar de aplicar localmente   |
| `components/data-table/data-table-faceted-filter.tsx` | Recibir facets desde props, no calcular internamente      |
| `components/data-table/index.ts`                      | Exportar nuevos tipos                                     |

### Páginas (Modificar)

| Archivo                    | Cambio                                                    |
| -------------------------- | --------------------------------------------------------- |
| `app/projects/page.tsx`    | Mover TODOS los filtros a queryParams del API             |
| `app/projects/columns.tsx` | Remover `filterFn` de columnas (server hace el filtrado)  |
| `app/payments/page.tsx`    | Eliminar filtrado client-side, mover a API                |
| `app/payments/columns.tsx` | Remover `filterFn` de columnas                            |
| `app/customer/page.tsx`    | Ya es mayormente server-side, ajustar consistencia        |
| `app/aftersales/page.tsx`  | Evaluar: ¿migrar o mantener client-side? (datos pequeños) |

### APIs (Modificar)

| Archivo                      | Cambio                                                               |
| ---------------------------- | -------------------------------------------------------------------- |
| `app/api/projects/route.ts`  | Agregar filtros: status, projectState. Retornar facets               |
| `app/api/payments/route.ts`  | Agregar filtros: type, paymentMethod, projectNumber. Retornar facets |
| `app/api/customers/route.ts` | Verificar consistencia, agregar facets si hay filtros                |

### Archivos a Eliminar/Deprecar

| Archivo                                     | Razón                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `components/data-table/filter-functions.ts` | Ya no se usa filtrado client-side (mantener solo para casos específicos como aftersales) |

---

## Plan de Implementación

### Fase 1: Actualizar DataTable Core

**Objetivo:** Hacer que DataTable soporte ambos modos (client y server) explícitamente.

#### 1.1 Modificar `data-table.tsx`

```tsx
// ANTES
export function DataTable<TData, TValue>({
  manualPagination = false,
  // ...
})

// DESPUÉS
export function DataTable<TData, TValue>({
  manualPagination = false,
  manualFiltering = false, // ← NUEVO
  facets, // ← NUEVO: facets desde server
  onColumnFiltersChange, // ← NUEVO: callback para filtros
  onGlobalFilterChange, // ← NUEVO: callback para búsqueda global
  // ...
})
```

```tsx
// Configuración condicional de row models
const table = useReactTable({
  // ...

  // Solo incluir getFilteredRowModel si NO es manual
  ...(manualFiltering ? {} : { getFilteredRowModel: getFilteredRowModel() }),

  // Solo incluir faceting si NO es manual
  ...(manualFiltering
    ? {}
    : {
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
      }),

  manualFiltering,
  manualPagination,
})
```

#### 1.2 Modificar `data-table-faceted-filter.tsx`

```tsx
// ANTES
const facets = column?.getFacetedUniqueValues()

// DESPUÉS
interface DataTableFacetedFilterProps<TData, TValue> {
  // ...
  serverFacets?: { value: string; count: number }[] // ← NUEVO
}

// Usar serverFacets si están disponibles, sino calcular
const facets = serverFacets
  ? new Map(serverFacets.map((f) => [f.value, f.count]))
  : column?.getFacetedUniqueValues()
```

#### 1.3 Modificar `data-table-toolbar.tsx`

```tsx
// Cuando manualFiltering, propagar cambios al parent
const handleFilterChange = (columnId: string, values: string[]) => {
  if (onColumnFiltersChange) {
    // Server-side: notificar al parent
    onColumnFiltersChange(columnId, values)
  } else {
    // Client-side: aplicar directamente
    column?.setFilterValue(values.length ? values : undefined)
  }
}
```

---

### Fase 2: Actualizar APIs

**Objetivo:** APIs retornan datos filtrados + facets.

#### 2.1 Ejemplo: `app/api/projects/route.ts`

```tsx
// GET /api/projects
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Parámetros de paginación
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  // Parámetros de filtrado
  const search = searchParams.get('search') || undefined
  const statusId = searchParams.get('statusId') || undefined
  const projectState = searchParams.get('projectState') || undefined

  // Construir WHERE clause
  const where: Prisma.ProjectWhereInput = {
    ...(search && {
      OR: [
        { projectNumber: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
    ...(statusId && { projectStatusId: statusId }),
    ...(projectState === 'Activo' && {
      OR: [{ balance: { gt: 0 } }, { projectStatus: { isFinal: false } }],
    }),
    ...(projectState === 'Finalizado' && {
      balance: { lte: 0 },
      projectStatus: { isFinal: true },
    }),
  }

  // Query principal + count
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: true, projectStatus: true },
      orderBy: { date: 'desc' },
    }),
    prisma.project.count({ where }),
  ])

  // Facets (queries paralelas)
  const [statusFacets, stateFacets] = await Promise.all([
    prisma.project.groupBy({
      by: ['projectStatusId'],
      where: { ...where, projectStatusId: { not: null } },
      _count: true,
    }),
    // Para projectState, necesitamos lógica custom
    calculateProjectStateFacets(where),
  ])

  return Response.json({
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    facets: {
      status: statusFacets.map((f) => ({
        value: f.projectStatusId,
        count: f._count,
      })),
      projectState: stateFacets,
    },
  })
}
```

---

### Fase 3: Actualizar Páginas

**Objetivo:** Páginas envían filtros al API y reciben facets.

#### 3.1 Ejemplo: `app/projects/page.tsx`

```tsx
// Estado de filtros (además de search y pagination existentes)
const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

// Query params incluyen filtros
const queryParams = useMemo(
  () => ({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: debouncedSearch || undefined,
    statusId: columnFilters.projectStatus?.[0] || undefined,
    projectState: columnFilters.projectState?.[0] || undefined,
  }),
  [pagination, debouncedSearch, columnFilters]
)

// Recibir facets del API
const { data } = useProjects(queryParams)
const facets = data?.facets

// Handler para cambio de filtros
const handleColumnFilterChange = (columnId: string, values: string[]) => {
  setColumnFilters((prev) => ({
    ...prev,
    [columnId]: values,
  }))
  // Resetear a página 1
  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
}

// Pasar a DataTable
;<DataTable
  columns={columns}
  data={projects}
  manualPagination={true}
  manualFiltering={true} // ← NUEVO
  facets={facets} // ← NUEVO
  onColumnFiltersChange={handleColumnFilterChange} // ← NUEVO
  // ...
/>
```

#### 3.2 Modificar `columns.tsx`

```tsx
// REMOVER filterFn de las columnas (server hace el filtrado)
{
  accessorKey: 'projectStatus',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
  cell: ({ row }) => { /* ... */ },
  // filterFn: filterByProjectStatus,  ← ELIMINAR
  enableSorting: true,
}
```

---

### Fase 4: Migrar Páginas Restantes

| Página       | Prioridad | Complejidad | Notas                                 |
| ------------ | --------- | ----------- | ------------------------------------- |
| `projects`   | Alta      | Media       | Tiene filtros híbridos actuales       |
| `payments`   | Alta      | Alta        | Tiene múltiples filtros client-side   |
| `customers`  | Media     | Baja        | Ya es mayormente server-side          |
| `aftersales` | Baja      | Evaluar     | Datos pequeños, puede quedarse client |

---

### Fase 5: Optimizaciones

#### 5.1 Cache de Facets

Los facets no cambian con cada keystroke. Cachear por 30-60 segundos:

```tsx
// En el hook useProjects
const { data: facets } = useQuery({
  queryKey: ['project-facets', statusFilter, stateFilter],
  queryFn: () => fetchFacets(),
  staleTime: 60 * 1000, // 1 minuto
})
```

#### 5.2 Índices de Base de Datos

```sql
-- Índices recomendados para filtros frecuentes
CREATE INDEX idx_projects_status ON projects(project_status_id);
CREATE INDEX idx_projects_search ON projects USING gin(
  to_tsvector('spanish', project_number || ' ' || project_name)
);
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_date ON projects(date DESC);
```

#### 5.3 Debounce de Filtros

Ya implementado (500ms), pero considerar reducir para filtros de select (no requieren typing):

```tsx
// Búsqueda: 500ms (usuario escribe)
const debouncedSearch = useDebounce(searchTerm, 500)

// Filtros select: 0ms o 100ms (selección inmediata)
const handleStatusChange = (values: string[]) => {
  setStatusFilter(values) // Aplicar inmediatamente
}
```

---

## Validación

### Criterios de Éxito

- [ ] Filtros facetados muestran conteos correctos (total, no página)
- [ ] Búsqueda encuentra resultados en todos los datos, no solo página actual
- [ ] Todos los filtros se aplican en el server (verificar Network tab)
- [ ] No hay `getFilteredRowModel()` cuando `manualFiltering: true`
- [ ] Performance: <300ms para filtros, <500ms para búsqueda
- [ ] Sin regresiones en funcionalidad existente

### Tests Manuales

1. Página de Proyectos:
   - Buscar "cliente X" → Debe encontrar aunque esté en página 5
   - Filtrar por Estado → Conteo debe reflejar total, no página actual
   - Combinar búsqueda + filtro → Resultados correctos

2. Página de Pagos:
   - Filtrar por Tipo "Proyecto" → Solo pagos a proyecto
   - Filtrar por Método de Pago → Conteo correcto

---

## Referencias

### Documentación TanStack Table

- [Manual Filtering](https://tanstack.com/table/latest/docs/guide/column-filtering#manual-server-side-column-filtering)
- [Manual Pagination](https://tanstack.com/table/latest/docs/guide/pagination#manual-server-side-pagination)
- [Column Faceting](https://tanstack.com/table/latest/docs/guide/column-faceting)

### Archivos de Contexto del Proyecto

- `docs/template/components/data-table.md` - Documentación del DataTable
- `docs/template/methodology/patterns/` - Patrones de código

---

## Historial de Cambios

| Fecha      | Cambio                    |
| ---------- | ------------------------- |
| 2025-12-03 | Creación del plan inicial |

---

## Notas para Futuras Sesiones

1. **Antes de implementar:** Leer este documento completo
2. **Orden de implementación:** Fase 1 → 2 → 3 → 4 → 5
3. **Si hay dudas:** Consultar documentación de TanStack Table con Context7
4. **Testing:** Validar con Network tab que queries van al server
5. **Rollback:** Si algo falla, `manualFiltering: false` restaura comportamiento actual
