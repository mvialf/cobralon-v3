# 🚀 Fase 1: Migración a React Query

**Prioridad:** 🔴 Crítica | **Esfuerzo:** 3-5 días | **Riesgo:** Bajo

---

## 📋 Objetivo

Migrar el state management actual (useState + useEffect) a React Query para obtener:

- ✅ Cache automático inteligente
- ✅ Loading/error states built-in
- ✅ Refetch strategies configurables
- ✅ Fundación para optimistic updates (Fase 2)
- ✅ 50% menos boilerplate

---

## 🎯 Estado Actual vs Objetivo

### Antes (Cobralon actual)

```typescript
// hooks/use-payments.ts
export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPayments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/payments?limit=1000')
      if (!response.ok) throw new Error('Error al cargar pagos')
      const data = await response.json()
      setPayments(data.payments)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Error al cargar pagos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  return { payments, isLoading, fetchPayments }
}
```

### Después (Patrón de Cobrolox)

````typescript
// hooks/queries/use-payments.ts
import { useQuery } from '@tanstack/react-query'

export interface PaymentsQueryParams {
  page?: number
  limit?: number
  customerId?: string
  startDate?: string
  endDate?: string
}

export interface PaymentsResponse {
  payments: Payment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Hook para obtener lista de pagos con paginación y filtros
 *
 * @param params - Filtros opcionales
 * @returns Query con payments y paginación
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = usePayments({
 *   page: 1,
 *   limit: 10,
 *   customerId: 'abc-123'
 * })
 * ```
 */
export function usePayments(params: PaymentsQueryParams = {}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async (): Promise<PaymentsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.startDate) searchParams.set('startDate', params.startDate)
      if (params.endDate) searchParams.set('endDate', params.endDate)

      const response = await fetch(`/api/payments?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar pagos')
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - datos considerados "frescos"
    gcTime: 10 * 60 * 1000, // 10 minutos - mantener en cache
  })
}
````

**Mejoras:**

- ✅ **-30 líneas de código** (~50% reducción)
- ✅ Cache automático (no refetch innecesarios)
- ✅ Query keys parametrizados (cache por filtros)
- ✅ Error state automático
- ✅ Refetching strategies configurables

---

## 📦 Instalación de Dependencias

### 1. Instalar React Query

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### 2. Setup del QueryClient

**Crear:** `lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos (default para queries)
      gcTime: 10 * 60 * 1000, // 10 minutos (cache time)
      retry: 1, // Reintentar 1 vez en error
      refetchOnWindowFocus: false, // No refetch al volver a la ventana
    },
    mutations: {
      retry: 0, // No reintentar mutations
    },
  },
})
```

**Por qué estos defaults:**

- `staleTime: 5min` → Data de negocio no cambia cada segundo
- `gcTime: 10min` → Mantener cache mientras usuario navega
- `refetchOnWindowFocus: false` → Evitar requests innecesarios
- `retry: 1` → Reintentar en network glitches
- `mutations.retry: 0` → No reintentar operaciones destructivas

### 3. Setup del Provider

**Modificar:** `app/layout.tsx`

```typescript
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

---

## 🔄 Plan de Migración (Incremental)

### Hook 1: usePayments (Empezar aquí)

**Por qué primero:** Es el más simple, no tiene mutations aún.

**Pasos:**

1. **Crear nuevo archivo**

   ```bash
   mkdir -p hooks/queries
   touch hooks/queries/use-payments-query.ts
   ```

2. **Implementar con React Query**

   ```typescript
   // Ver código "Después" arriba
   ```

3. **Actualizar componentes gradualmente**

   ```typescript
   // Antes
   import { usePayments } from '@/hooks/use-payments'

   // Después
   import { usePayments } from '@/hooks/queries/use-payments-query'
   ```

4. **Verificar funcionalidad**
   - Abrir página de payments
   - Verificar que carga correctamente
   - Verificar que filters funcionan
   - Abrir React Query DevTools
   - Verificar cache (data debe persistir al navegar away/back)

5. **Eliminar archivo antiguo**

   ```bash
   rm hooks/use-payments.ts
   ```

6. **Renombrar**
   ```bash
   mv hooks/queries/use-payments-query.ts hooks/queries/use-payments.ts
   ```

### Hook 2: useProjects

**Actual:** `hooks/queries/use-projects.ts`

**Plan:**

1. Agregar types de params y response
2. Migrar a useQuery
3. Configurar staleTime/gcTime
4. Actualizar componentes

**Código de referencia (adaptar):**

```typescript
export interface ProjectsQueryParams {
  page?: number
  limit?: number
  search?: string
  customerId?: string
  statusId?: string
}

export interface ProjectsResponse {
  projects: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useProjects(params: ProjectsQueryParams = {}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async (): Promise<ProjectsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)
      if (params.customerId) searchParams.set('customerId', params.customerId)
      if (params.statusId) searchParams.set('statusId', params.statusId)

      const response = await fetch(`/api/projects?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyectos')
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
```

### Hook 3: useCustomers (Nuevo)

**Crear:** `hooks/queries/use-customers.ts`

**Patrón similar:**

```typescript
export interface CustomersQueryParams {
  page?: number
  limit?: number
  search?: string
}

export interface CustomersResponse {
  customers: Customer[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useCustomers(params: CustomersQueryParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async (): Promise<CustomersResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)

      const response = await fetch(`/api/customers?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar clientes')
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook para obtener un cliente específico por ID
 */
export function useCustomer(customerId?: string) {
  return useQuery({
    queryKey: ['customers', customerId],
    queryFn: async (): Promise<Customer> => {
      if (!customerId) throw new Error('customerId requerido')

      const response = await fetch(`/api/customers/${customerId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar cliente')
      }

      return response.json()
    },
    enabled: Boolean(customerId), // Solo ejecutar si hay customerId
  })
}
```

### Hook 4: useProject (Single Item)

**Patrón para obtener item individual:**

```typescript
export function useProject(projectId?: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async (): Promise<Project> => {
      if (!projectId) throw new Error('projectId requerido')

      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar proyecto')
      }

      return response.json()
    },
    enabled: Boolean(projectId), // ← CRÍTICO: Solo ejecutar si hay projectId
  })
}
```

**Por qué `enabled`:**

- Si projectId es undefined, no hacer fetch
- Evita requests con URLs malformadas (`/api/projects/undefined`)
- Usado en modales de edición (projectId viene cuando se abre)

---

## 🧪 Validación y Testing

### 1. Testing Manual

**Checklist:**

- [ ] Datos cargan correctamente
- [ ] Loading state aparece mientras carga
- [ ] Error state aparece en errores
- [ ] Filtros funcionan (params en queryKey)
- [ ] Cache funciona (navegar away/back sin refetch)
- [ ] DevTools muestra queries correctamente

### 2. Testing con DevTools

**Abrir DevTools:**

- Click en ícono de React Query en esquina
- Ver queries activas
- Ver cache hits
- Simular refetch manual
- Ver staleTime countdown

**Queries esperadas:**

```
["payments", { page: 1, limit: 10 }]        ← Query activa
["projects", { customerId: "abc-123" }]     ← Otra query
["customers", "customer-uuid-123"]          ← Single item
```

### 3. Test Unitario (Opcional en Fase 1)

```typescript
// hooks/queries/__tests__/use-projects.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useProjects } from '../use-projects'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // No retry en tests
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useProjects', () => {
  it('fetches projects successfully', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        projects: [{ id: '1', projectName: 'Test' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      }),
    })

    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    })

    // Initial state
    expect(result.current.isLoading).toBe(true)

    // Wait for data
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.projects).toHaveLength(1)
    expect(result.current.data?.projects[0].projectName).toBe('Test')
  })
})
```

---

## 📊 Métricas de Éxito

### Antes de Fase 1:

- ❌ Refetch en cada mount
- ❌ Loading states manuales
- ❌ Sin cache entre navegación
- ❌ Boilerplate repetitivo

### Después de Fase 1:

- ✅ Cache inteligente (no refetch innecesarios)
- ✅ Loading/error states automáticos
- ✅ Navegación sin loading (cache hits)
- ✅ 50% menos código

### KPIs:

- **Reducción de requests:** 70% menos (gracias a cache)
- **Tiempo de carga percibido:** 80% más rápido (cache hits)
- **Código:** -30 a -50 líneas por hook
- **Developer experience:** 10x mejor (DevTools)

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Breaking Changes en Componentes

**Probabilidad:** Media | **Impacto:** Medio

**Síntomas:**

- Componentes esperan `{ payments }` pero reciben `{ data }`
- Componentes llaman `fetchPayments()` pero no existe

**Mitigación:**

```typescript
// Wrapper de compatibilidad temporal
export function usePaymentsCompat() {
  const query = usePayments()

  return {
    payments: query.data?.payments || [],
    isLoading: query.isLoading,
    fetchPayments: () => query.refetch(), // ← Compatibility layer
  }
}
```

### Riesgo 2: Cache Demasiado Agresivo

**Probabilidad:** Baja | **Impacto:** Alto

**Síntoma:** Usuarios ven data desactualizada después de cambios

**Mitigación:**

- Ajustar `staleTime` según volatilidad de data
- Pagos/Projects: 5 min ✅
- Customers: 5 min ✅
- Búsquedas: 30 seg (implementar en Fase 3)

### Riesgo 3: Memory Leaks

**Probabilidad:** Baja | **Impacto:** Medio

**Síntoma:** Memory crece con navegación prolongada

**Mitigación:**

- `gcTime: 10 * 60 * 1000` limpia cache viejo
- React Query garbage collection automático
- Monitor con DevTools

---

## 🎯 Checklist de Completitud

### Setup

- [ ] `@tanstack/react-query` instalado
- [ ] `@tanstack/react-query-devtools` instalado
- [ ] `lib/query-client.ts` creado
- [ ] Provider agregado a `app/layout.tsx`
- [ ] DevTools visible en desarrollo

### Hooks Migrados

- [ ] `usePayments()` migrado
- [ ] `useProjects()` migrado
- [ ] `useCustomers()` creado
- [ ] `useCustomer(id)` creado
- [ ] `useProject(id)` creado

### Validación

- [ ] Todas las páginas funcionan
- [ ] Cache funciona correctamente
- [ ] DevTools muestra queries
- [ ] No memory leaks visibles
- [ ] Performance igual o mejor

### Documentación

- [ ] JSDoc en todos los hooks
- [ ] Ejemplos de uso
- [ ] README actualizado

---

## 🚀 Siguiente Fase

Una vez completada Fase 1:

→ **[Fase 2: Optimistic Updates](./fase-2-optimistic-updates.md)**

En Fase 2 agregaremos mutations (CREATE, UPDATE, DELETE) con optimistic updates y rollback automático.

---

**Última actualización:** 2025-11-12
