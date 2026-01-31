# TanStack Query Patterns en Cobralon

## Query Key Conventions

El proyecto usa un patrón de string + params object:

| Recurso | List Key | Single Key | Con params |
|---------|----------|------------|------------|
| payments | `['payments']` | — | `['payments', { page, limit, type, ... }]` |
| projects | `['projects']` | `['projects', id]` | `['projects', { page, limit, projectState }]` |
| customers | `['customers']` | `['customers', id]` | `['customers', { page, limit, search }]` |
| visits | `['visits']` | `['visits', id]` | `['visits', { page, limit }]` |
| installments | — | — | `['installments', params]` |
| project-statuses | `['project-statuses']` | — | — |
| calendar-events | — | — | `['calendar-events', startISO, endISO]` |
| search-projects | — | — | `['search-projects', params]` |
| customer-projects | — | — | `['customer-projects', customerId]` |

**Regla:** El queryKey del `prefetchQuery` en el Server Component DEBE coincidir exactamente con el hook del cliente.

## Stale Times por recurso

| Recurso | staleTime | gcTime | Razón |
|---------|-----------|--------|-------|
| Listas paginadas | 60s | 5min | Datos cambian con frecuencia |
| project-statuses | 30s | 10min | Metadatos semi-estáticos |
| calendar-events | 5min | 5min | Rango de fechas amplio |
| search-projects | 30s | default | Búsqueda activa, datos cambian |

## QueryClient Config Global

`components/providers/query-provider.tsx`:

```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,          // 1 minuto
      gcTime: 5 * 60 * 1000,         // 5 minutos
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})
```

## Patrón SSR: Server Component → HydrationBoundary → Client

```typescript
// page.tsx (Server Component)
export default async function Page() {
  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['entities', { page: 1, limit: 50 }],  // Debe coincidir con hook
      queryFn: getInitialEntities,
    }),
    queryClient.prefetchQuery({
      queryKey: ['entity-statuses'],
      queryFn: getStatuses,
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageClient />
    </HydrationBoundary>
  )
}
```

**Decisión de diseño:** Facets NO se prefetch en SSR porque son costosos. Se cargan en cliente cuando el usuario aplica filtros.

## Invalidación con predicate (patrón preferido)

```typescript
queryClient.invalidateQueries({
  predicate: (query) => {
    const key = query.queryKey[0]
    if (key === 'payments') return true
    if (key === 'projects') return true           // Balance cambió
    if (key === 'search-projects') return true
    if (key === 'customer-projects' && query.queryKey[1] === customerId) return true
    return false
  },
})
```

Usar predicate cuando una mutation afecta múltiples recursos.

## Optimistic Updates

Patrón de 3 pasos: snapshot → update → rollback:

```typescript
onMutate: async (id) => {
  // 1. Cancelar queries para evitar override
  await queryClient.cancelQueries({ queryKey: ['entities'] })

  // 2. Snapshot para rollback
  const previousData = queryClient.getQueryData(['entities'])

  // 3. Update optimista
  queryClient.setQueriesData({ queryKey: ['entities'] }, (old) => {
    if (!old) return old
    return { ...old, items: old.items.filter((i) => i.id !== id) }
  })

  return { previousData }
},
onError: (error, id, context) => {
  if (context?.previousData) {
    queryClient.setQueryData(['entities'], context.previousData)
  }
  handleMutationError(error)
},
```

Para queries con partial key matching (ej: calendar con fechas):

```typescript
// getQueriesData para obtener múltiples
const previousQueries = queryClient.getQueriesData({ queryKey: ['calendar-events'] })

// setQueriesData para actualizar múltiples
queryClient.setQueriesData({ queryKey: ['calendar-events'] }, (old) => { ... })
```

## Prefetch de página siguiente

```typescript
useEffect(() => {
  if (!isPlaceholderData && data?.pagination) {
    const { page, totalPages } = data.pagination
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['entities', { ...queryParams, page: page + 1 }],
        queryFn: () => fetch(`/api/entities?page=${page + 1}&limit=${queryParams.limit}`)
          .then(r => r.json()),
      })
    }
  }
}, [data, isPlaceholderData, queryClient, queryParams])
```

## Queries condicionales

```typescript
useQuery({
  queryKey: ['search-projects', params],
  queryFn: fetchSearchProjects,
  enabled: Boolean(params.search && params.search.length >= 2),
})
```

## Archivos de hooks

Todos en `hooks/queries/`:

| Archivo | Líneas | Mutations |
|---------|--------|-----------|
| `use-payments.ts` | ~645 | create, update, delete, bulkDelete |
| `use-projects.ts` | ~624 | create, update, delete |
| `use-customers.ts` | ~461 | create, update, delete |
| `use-visits.ts` | ~269 | create, update, delete |
| `use-project-events.ts` | ~286 | create, update, updateDate (drag) |
| `use-aftersale-events.ts` | ~300 | create, update, transactional |
| `use-installments.ts` | ~184 | (solo lectura) |
| `use-project-statuses.ts` | ~83 | — |
| `use-calendar-events.ts` | ~83 | — |
