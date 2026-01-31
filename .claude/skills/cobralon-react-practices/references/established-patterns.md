# Patrones Establecidos — No Regresionar

Patrones que ya seguimos correctamente. Esta referencia sirve para:
1. Documentar que ya los cumplimos (no re-implementar)
2. Detectar regresiones en code review
3. Onboarding de nuevos patrones (entender por que estan asi)

---

## 1. Promise.all para Queries Paralelas

**Regla Vercel:** `async-parallel`
**Estado:** Implementado en 25+ lugares

Todas las pages SSR y API routes con multiples queries usan `Promise.all()`:

```typescript
// app/projects/page.tsx — SSR
const [rawProjects, total] = await Promise.all([
  prisma.project.findMany({ ... }),
  prisma.project.count({ where: activeWhere }),
])

// app/projects/page.tsx — Prefetch paralelo
await Promise.all([
  queryClient.prefetchQuery({ queryKey: ['projects', ...], queryFn: getInitialProjects }),
  queryClient.prefetchQuery({ queryKey: ['project-statuses'], queryFn: getProjectStatuses }),
])

// app/api/projects/route.ts — GET con facets
const [projects, total, statusFacetsRaw, stateFacetsRaw] = await Promise.all([
  queryProjectList(filters),
  countProjects(filters),
  getStatusFacets(facetFilters),
  getStateFacets(facetFilters),
])
```

**Regresion a evitar:** No agregar queries secuenciales cuando son independientes.

---

## 2. Serializacion Centralizada

**Regla Vercel:** `server-serialization`
**Estado:** Centralizado en `lib/utils/serialize.ts`

Todas las pages SSR serializan datos de Prisma antes de pasarlos a Client Components:

```typescript
// lib/utils/serialize.ts — convierte Decimal → number, Date → string
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_key, value) => {
    if (value instanceof Decimal) return value.toNumber()
    if (typeof value === 'bigint') return Number(value)
    return value
  }))
}

// Uso en pages SSR
return serialize({ projects, pagination: { ... } })
```

**Regresion a evitar:** No pasar objetos Prisma crudos (con Decimal) a Client Components.

---

## 3. React Query Hydration Pattern

**Regla Vercel:** `server-parallel-fetching` + `server-dedup-props`
**Estado:** Todas las pages principales

Patron Server Component → HydrationBoundary → Client Component:

```typescript
// Server Component (page.tsx)
export default async function ProjectsPage() {
  const queryClient = new QueryClient()
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['projects', ...], queryFn: getInitialProjects }),
  ])
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsPageClient />
    </HydrationBoundary>
  )
}

// Client Component (page-client.tsx)
export function ProjectsPageClient() {
  // Usa datos pre-cargados sin flash de loading
  const { data, isLoading } = useProjects(queryParams)
}
```

**QueryKeys sincronizados:** Los queryKey del prefetch DEBEN coincidir exactamente con los del hook del cliente. Si no coinciden, React Query no reconoce que los datos ya estan cached.

**Regresion a evitar:** No cambiar queryKeys del servidor sin actualizar los del cliente.

---

## 4. keepPreviousData en Paginacion

**Regla Vercel:** Relacionado con `rerender-transitions`
**Estado:** Todos los hooks de queries

```typescript
// hooks/queries/use-projects.ts
export function useProjects(params: ProjectsQueryParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => { ... },
    placeholderData: keepPreviousData, // Evita flash blanco entre paginas
  })
}
```

**Regresion a evitar:** No remover `placeholderData: keepPreviousData` de hooks paginados.

---

## 5. Lazy State Initialization

**Regla Vercel:** `rerender-lazy-state-init`
**Estado:** QueryClient provider

```typescript
// components/providers/query-provider.tsx
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({  // Funcion inicializadora — se ejecuta solo una vez
      defaultOptions: {
        queries: { staleTime: 1000 * 60, gcTime: 1000 * 60 * 5, ... }
      }
    })
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

**Regresion a evitar:** No pasar `new QueryClient(...)` directamente a useState (se recrearia en cada render).

---

## 6. Functional setState

**Regla Vercel:** `rerender-functional-setstate`
**Estado:** Usado en paginacion

```typescript
// app/projects/page-client.tsx
const handleSearchChange = (search: string) => {
  setSearchTerm(search)
  if (pagination.pageIndex !== 0) {
    setPagination({ ...pagination, pageIndex: 0 })
  }
}
```

**Nota:** El patron actual funciona pero seria mas robusto con:
```typescript
setPagination(prev => ({ ...prev, pageIndex: 0 }))
```
Considerar migrar cuando se toquen estos archivos.

---

## 7. Early Return en API Routes

**Regla Vercel:** `js-early-exit`
**Estado:** Consistente en todas las API routes

```typescript
// app/api/payments/route.ts — POST
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  if (!body.customerId) {
    return NextResponse.json({ error: 'Cliente requerido' }, { status: 400 })
  }

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'Monto invalido' }, { status: 400 })
  }

  // Solo llega aqui si todo es valido
  // ... logica de negocio
})
```

**Regresion a evitar:** No anidar validaciones en if/else profundos. Retornar temprano.

---

## 8. Logica de Negocio Aislada

**No es regla de Vercel, pero es patron establecido de Cobralon.**

```
lib/business-logic/
  payment-fifo.ts        # Distribucion FIFO
  credit-management.ts   # Sistema de creditos
  project-state.ts       # Estado derivado de proyecto
  totals.ts              # Calculo de totales
  update-project-balance.ts  # Actualizacion de balances
```

Funciones puras sin dependencias de UI ni DB directa. Reciben datos, retornan resultados.

**Regresion a evitar:** No agregar logica financiera en componentes React o API routes directamente. Mantenerla en `lib/business-logic/`.

---

## 9. Logging Estructurado con withLogging

**No es regla de Vercel, pero es patron critico de Cobralon.**

```typescript
// 46 de 69 API routes usan withLogging (66%)
export const GET = withLogging(async (request, logger) => {
  logger.info('Request received')
  // ...
  logger.info({ found: data.length }, 'Request completed')
})
```

**Regresion a evitar:** No crear API routes sin `withLogging`. Todo endpoint nuevo debe usarlo.

---

## Resumen de Checks para Code Review

Verificar que NO se haya roto:

```
[ ] Queries paralelas siguen usando Promise.all
[ ] Server Components usan serialize() antes de pasar datos
[ ] HydrationBoundary + dehydrate en pages con prefetch
[ ] QueryKeys del prefetch coinciden con los del hook cliente
[ ] keepPreviousData presente en hooks paginados
[ ] QueryClient usa useState con funcion inicializadora
[ ] API routes usan withLogging
[ ] Logica financiera vive en lib/business-logic/
```
