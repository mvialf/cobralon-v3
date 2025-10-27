# 🏗️ Arquitectura Propuesta: SOLID Refactoring

## Visión General

Transformar `ProjectPaymentsTable` de un componente monolítico con 6 responsabilidades a una arquitectura en capas con separación clara de concerns.

---

## 📐 Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: PRESENTATION                                          │
│  📄 components/tables/project-payments-table.tsx                 │
│                                                                  │
│  Responsabilidad: SOLO renderizar UI                            │
│  Input: Props con datos procesados                              │
│  Output: JSX (tabla)                                            │
│  Dependencias: Componentes UI (shadcn), formatters              │
│                                                                  │
│  ✅ Testeable: Sí (props → JSX)                                 │
│  ✅ Reutilizable: N/A (es el endpoint de UI)                    │
│  ✅ LOC: ~80-100 (vs 229 actual)                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓ usa
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: HOOKS (State Management)                              │
│  📄 hooks/use-project-payments.ts                                │
│                                                                  │
│  Responsabilidad: Orquestar fetching + transformación           │
│  Input: projectId                                               │
│  Output: { data, loading, error, refetch }                      │
│  Dependencias: PaymentsService, PaymentTransformers             │
│                                                                  │
│  ✅ Testeable: Sí (React Testing Library + mocks)               │
│  ✅ Reutilizable: Sí (otros componentes pueden usarlo)          │
│  ✅ LOC: ~40-60                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ usa
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: SERVICE (Data Access)                                 │
│  📄 lib/services/payments.service.ts                             │
│                                                                  │
│  Responsabilidad: Fetching de datos desde API                   │
│  Input: Query params                                            │
│  Output: DTO (Data Transfer Objects)                            │
│  Dependencias: fetch, error handling                            │
│                                                                  │
│  ✅ Testeable: Sí (mockear fetch)                               │
│  ✅ Reutilizable: Sí (toda la app lo usa)                       │
│  ✅ Extensible: Implementa IPaymentsRepository                  │
│  ✅ LOC: ~60-80                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ usa
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4: TRANSFORMERS (Business Logic)                         │
│  📄 lib/transformers/payment-transformers.ts                     │
│                                                                  │
│  Responsabilidad: Transformaciones de datos (pure functions)    │
│  Input: Data raw                                                │
│  Output: Data procesada                                         │
│  Dependencias: NINGUNA (pure functions)                         │
│                                                                  │
│  ✅ Testeable: 100% (sin mocks, solo input → output)            │
│  ✅ Reutilizable: Sí (composables)                              │
│  ✅ LOC: ~80-100                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓ usa
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: TYPES (Contracts)                                     │
│  📄 lib/types/payment.types.ts                                   │
│                                                                  │
│  Responsabilidad: Type definitions compartidas                  │
│  Contenido: Interfaces, Types, DTOs                             │
│  Dependencias: NINGUNA                                          │
│                                                                  │
│  ✅ Compartido: Por todas las capas                             │
│  ✅ LOC: ~50-80                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos Completo

### Secuencia de Ejecución

```
1. Usuario carga página con <ProjectPaymentsTable projectId="abc" />
                ↓
2. Component ejecuta: const { data, loading } = useProjectPayments('abc')
                ↓
3. Hook (useProjectPayments):
   - Inicializa estado: { data: [], loading: true, error: null }
   - Ejecuta: PaymentsService.fetchByProject('abc')
                ↓
4. Service (PaymentsService):
   - Hace fetch: GET /api/payments?projectId=abc
   - Recibe: PaymentFromAPI[]
   - Retorna al hook
                ↓
5. Hook aplica transformaciones:
   - allocations = PaymentTransformers.extractProjectAllocations(payments, 'abc')
   - sorted = PaymentTransformers.sortAllocationsByDate(allocations, 'asc')
   - Actualiza estado: { data: sorted, loading: false }
                ↓
6. Component re-renderiza con data procesada:
   - Mapea data a <TableRow>
   - Formatea con formatDate/formatCurrency
                ↓
7. Usuario ve la tabla renderizada ✅
```

### Diagrama de Secuencia

```
Component          Hook              Service          Transformers       API
   |                |                   |                   |             |
   |--useProjectPayments('abc')------->|                   |             |
   |                |                   |                   |             |
   |                |--fetchByProject-->|                   |             |
   |                |                   |--fetch---------->|------------>|
   |                |                   |                   |             |
   |                |                   |<-PaymentFromAPI[]--------------|
   |                |<-PaymentFromAPI[]--|                  |             |
   |                |                   |                   |             |
   |                |--extractProjectAllocations()--------->|             |
   |                |<-PaymentAllocation[]--------------------|             |
   |                |                   |                   |             |
   |                |--sortAllocationsByDate()------------->|             |
   |                |<-Sorted PaymentAllocation[]-----------|             |
   |                |                   |                   |             |
   |<-{data,loading}-|                  |                   |             |
   |                |                   |                   |             |
   |--render()----->|                   |                   |             |
```

---

## 📦 Especificación de Cada Capa

### LAYER 1: Presentation (Component)

**Archivo:** `components/tables/project-payments-table.tsx`

**Props Interface:**
```typescript
interface ProjectPaymentsTableProps {
  projectId: string
  hidePaymentMethod?: boolean
  locale?: string  // Opcional, default desde context
  sortOrder?: 'asc' | 'desc'  // Opcional, default 'asc'
  onPaymentClick?: (paymentId: string) => void  // Opcional
}
```

**Responsabilidades:**
- ✅ Renderizar tabla con datos recibidos
- ✅ Formatear montos y fechas (usando formatters)
- ✅ Mostrar loading/empty states
- ❌ NO fetching
- ❌ NO transformaciones
- ❌ NO manejo de estado complejo

**Dependencias:**
- `useProjectPayments()` hook
- `formatDate`, `formatCurrency` utilities
- Componentes UI de shadcn

**Tamaño estimado:** ~80-100 líneas (vs 229 actual)

**Ejemplo simplificado:**
```typescript
export function ProjectPaymentsTable({
  projectId,
  hidePaymentMethod = false,
  locale,
  sortOrder = 'asc'
}: ProjectPaymentsTableProps) {
  // Estado delegado al hook
  const { data, loading, error } = useProjectPayments(projectId, sortOrder)

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorState error={error} />
  if (data.length === 0) return <EmptyState />

  // SOLO renderizar
  return (
    <Table>
      <TableHeader>...</TableHeader>
      <TableBody>
        {data.map((allocation, index) => (
          <TableRow key={allocation.id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{formatDate(allocation.payment.date, locale)}</TableCell>
            <TableCell>{formatCurrency(allocation.allocatedAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

### LAYER 2: Hooks (State Management)

**Archivo:** `hooks/use-project-payments.ts`

**Interface:**
```typescript
interface UseProjectPaymentsResult {
  data: PaymentAllocation[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

function useProjectPayments(
  projectId: string,
  sortOrder?: 'asc' | 'desc'
): UseProjectPaymentsResult
```

**Responsabilidades:**
- ✅ Manejo de estado (loading, error, data)
- ✅ Orquestar fetching vía service
- ✅ Aplicar transformaciones vía transformers
- ✅ Memoización con useMemo/useCallback
- ❌ NO lógica de transformación (delega a transformers)
- ❌ NO implementación de fetching (delega a service)

**Dependencias:**
- `PaymentsService` (service layer)
- `PaymentTransformers` (transformer functions)

**Tamaño estimado:** ~40-60 líneas

**Ejemplo simplificado:**
```typescript
export function useProjectPayments(
  projectId: string,
  sortOrder: 'asc' | 'desc' = 'asc'
): UseProjectPaymentsResult {
  const [data, setData] = useState<PaymentAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch desde service
      const payments = await PaymentsService.fetchByProject(projectId)

      // 2. Transformar con transformers
      const allocations = PaymentTransformers.extractProjectAllocations(
        payments,
        projectId
      )

      // 3. Ordenar
      const sorted = PaymentTransformers.sortAllocationsByDate(
        allocations,
        sortOrder
      )

      setData(sorted)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [projectId, sortOrder])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
```

---

### LAYER 3: Service (Data Access)

**Archivo:** `lib/services/payments.service.ts`

**Interface (abstracción):**
```typescript
export interface IPaymentsRepository {
  fetchByProject(projectId: string): Promise<PaymentFromAPI[]>
  fetchByCustomer(customerId: string): Promise<PaymentFromAPI[]>
  fetchAll(params?: PaymentQueryParams): Promise<PaymentFromAPI[]>
}
```

**Implementación:**
```typescript
export class PaymentsService implements IPaymentsRepository {
  private baseUrl: string

  constructor(baseUrl: string = '/api/payments') {
    this.baseUrl = baseUrl
  }

  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    // Implementación con fetch
  }

  // Otros métodos...
}

// Singleton export
export const paymentsService = new PaymentsService()
```

**Responsabilidades:**
- ✅ Fetching de datos desde API
- ✅ Manejo de errores HTTP
- ✅ Retry logic (opcional)
- ✅ Cache (opcional, con SWR o React Query)
- ❌ NO transformaciones de datos
- ❌ NO lógica de negocio

**Dependencias:**
- `fetch` (browser API)
- Type definitions (`PaymentFromAPI`)

**Tamaño estimado:** ~60-80 líneas

**Beneficios:**
- ✅ Testeable (mockear fetch)
- ✅ Extensible (implementar IPaymentsRepository con GraphQL, cache, etc.)
- ✅ Reutilizable (toda la app usa el mismo service)

---

### LAYER 4: Transformers (Business Logic)

**Archivo:** `lib/transformers/payment-transformers.ts`

**Funciones (todas pure functions):**

```typescript
// 1. Extraer allocations de un proyecto
export function extractProjectAllocations(
  payments: PaymentFromAPI[],
  projectId: string
): PaymentAllocation[]

// 2. Ordenar por fecha
export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[]

// 3. Agrupar por mes (para futuros reportes)
export function groupAllocationsByMonth(
  allocations: PaymentAllocation[]
): Map<string, PaymentAllocation[]>

// 4. Calcular total de allocations
export function calculateTotalAllocated(
  allocations: PaymentAllocation[]
): number

// 5. Filtrar por tipo de pago
export function filterByPaymentType(
  allocations: PaymentAllocation[],
  type: 'Project' | 'Customer'
): PaymentAllocation[]
```

**Responsabilidades:**
- ✅ Transformaciones de datos (pure functions)
- ✅ Ordenamiento, filtrado, mapeo
- ✅ Cálculos de negocio
- ✅ Composables (una función puede usar otra)
- ❌ NO side effects (fetch, setState, etc.)
- ❌ NO dependencias externas

**Características:**
- **Pure functions:** Mismo input → mismo output
- **Inmutables:** No modifican input, retornan nuevo array/objeto
- **Testeable al 100%:** Sin mocks necesarios

**Tamaño estimado:** ~80-100 líneas

**Ejemplo:**
```typescript
export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[] {
  // ✅ Inmutable: Copia el array
  return [...allocations].sort((a, b) => {
    const dateA = new Date(a.payment.date).getTime()
    const dateB = new Date(b.payment.date).getTime()
    const diff = dateA - dateB
    return order === 'asc' ? diff : -diff
  })
}
```

**Tests triviales:**
```typescript
describe('sortAllocationsByDate', () => {
  it('should sort ascending', () => {
    const input = [
      { payment: { date: '2025-01-15' } },
      { payment: { date: '2025-01-10' } }
    ]
    const result = sortAllocationsByDate(input, 'asc')
    expect(result[0].payment.date).toBe('2025-01-10')
    expect(result[1].payment.date).toBe('2025-01-15')
  })
})
```

---

### LAYER 5: Types (Contracts)

**Archivo:** `lib/types/payment.types.ts`

**Contenido:**

```typescript
// ====== API DTOs (Data Transfer Objects) ======

export interface PaymentFromAPI {
  id: string
  amount: number
  currency: string
  date: string
  type: 'Project' | 'Customer'
  reference: string | null
  notes: string | null
  paymentMethod: PaymentMethodDTO
  customer: CustomerDTO
  allocations: AllocationFromAPI[]
}

export interface AllocationFromAPI {
  id: string
  allocatedAmount: number
  project: {
    id: string
  }
}

// ====== Domain Types (Uso interno) ======

export interface PaymentAllocation {
  id: string
  allocatedAmount: number
  payment: {
    id: string
    amount: number
    currency: string
    date: string
    type: 'Project' | 'Customer'
    notes: string | null
    paymentMethod: {
      id: string
      name: string
      icon: string | null
    }
    customer: {
      id: string
      name: string
    }
  }
}

// ====== Service Interfaces ======

export interface IPaymentsRepository {
  fetchByProject(projectId: string): Promise<PaymentFromAPI[]>
  fetchByCustomer(customerId: string): Promise<PaymentFromAPI[]>
}

// ====== Query Params ======

export interface PaymentQueryParams {
  projectId?: string
  customerId?: string
  startDate?: string
  endDate?: string
}
```

**Responsabilidades:**
- ✅ Definir contratos compartidos
- ✅ DTOs de API
- ✅ Domain types
- ✅ Interfaces de servicios

**Dependencias:** NINGUNA

**Tamaño estimado:** ~50-80 líneas

---

## 🔌 Dependency Injection Pattern

### Problema: Acoplamiento fuerte con implementaciones

**Antes:**
```typescript
// Component directamente usa fetch
const response = await fetch('/api/payments?projectId=...')
```

**Después:**
```typescript
// Component usa abstracción (via hook)
const { data } = useProjectPayments(projectId)

// Hook usa service (inyectable)
const service = PaymentsService.getInstance()
const payments = await service.fetchByProject(projectId)
```

### Inyección de Dependencias en Tests

```typescript
// Test de hook con service mockeado
describe('useProjectPayments', () => {
  it('should fetch and transform data', async () => {
    // Mock del service
    const mockService: IPaymentsRepository = {
      fetchByProject: jest.fn().mockResolvedValue(mockPayments)
    }

    // Inyectar mock
    const { result } = renderHook(() =>
      useProjectPayments('project-1', mockService)
    )

    // Assertions
    await waitFor(() => {
      expect(result.current.data).toHaveLength(2)
    })
  })
})
```

---

## 🧪 Estrategia de Testing

### Pirámide de Tests

```
         /\
        /  \  E2E Tests (Component + Hook + Service + API)
       /────\  ← Pocos, lentos, costosos
      /      \
     /────────\  Integration Tests (Hook + Service)
    /          \  ← Algunos, medios
   /────────────\
  /              \  Unit Tests (Transformers, Service, Hook)
 /────────────────\  ← Muchos, rápidos, baratos
```

### Tests por Capa

| Capa | Tipo | Complejidad | Mocks | Cobertura |
|------|------|-------------|-------|-----------|
| **Transformers** | Unit | Baja | 0 | 100% |
| **Service** | Unit | Media | 1 (fetch) | 90%+ |
| **Hook** | Integration | Media | 1 (service) | 80%+ |
| **Component** | Integration | Alta | 1 (hook) | 70%+ |

**Total tests estimados:** 20-30 tests

**Tiempo de ejecución:** <5 segundos

---

## 📊 Comparación: Antes vs Después

### Líneas de Código

| Archivo | Antes | Después | Cambio |
|---------|-------|---------|--------|
| **Component** | 229 | ~90 | -60% |
| **Hook** | - | ~50 | +50 |
| **Service** | - | ~70 | +70 |
| **Transformers** | - | ~90 | +90 |
| **Types** | - | ~60 | +60 |
| **Tests** | 0 | ~200 | +200 |
| **Total** | 229 | ~560 | +144% |

**Análisis:**
- ✅ Más líneas totales (esperado en arquitectura modular)
- ✅ Pero cada archivo es más simple y testeable
- ✅ Tests agregan valor real (vs sin tests antes)

### Responsabilidades

| Antes | Después |
|-------|---------|
| Component: 6 responsabilidades | Component: 1 responsabilidad |
| - Rendering ✅ | - Rendering ✅ |
| - Fetching ❌ | Hook: State management |
| - Transformation ❌ | Service: Data fetching |
| - Sorting ❌ | Transformers: Business logic |
| - State management ⚠️ | Types: Contracts |
| - Error handling ❌ | |

### Testabilidad

| Métrica | Antes | Después |
|---------|-------|---------|
| **Mocks necesarios** | 4-5 | 0-1 |
| **Tests escritos** | 0 | 20-30 |
| **Cobertura** | 0% | 85%+ |
| **Velocidad tests** | N/A | <5s |

### Mantenibilidad

| Escenario | Antes | Después |
|-----------|-------|---------|
| **Cambiar API endpoint** | Modificar component | Modificar service |
| **Agregar ordenamiento** | Modificar component | Agregar prop |
| **Agregar cache** | Modificar component | Modificar service |
| **Reutilizar lógica** | Copiar/pegar | Importar hook |
| **Testear transformación** | Imposible | Trivial |

---

## 🚀 Extensibilidad Futura

### Casos de Uso Soportados

**1. Agregar cache con SWR:**
```typescript
// lib/services/payments.service.cached.ts
import useSWR from 'swr'

export function useProjectPayments(projectId: string) {
  const { data, error } = useSWR(
    ['payments', projectId],
    () => PaymentsService.fetchByProject(projectId),
    { revalidateOnFocus: false }
  )

  // Transformaciones igual que antes
  const allocations = useMemo(() =>
    data ? PaymentTransformers.extractProjectAllocations(data, projectId) : [],
    [data, projectId]
  )

  return { data: allocations, loading: !data && !error, error }
}
```

**2. Agregar retry logic:**
```typescript
// lib/services/payments.service.ts
class PaymentsService {
  async fetchByProject(projectId: string, retries = 3): Promise<PaymentFromAPI[]> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.doFetch(projectId)
      } catch (error) {
        if (i === retries - 1) throw error
        await this.delay(1000 * (i + 1))
      }
    }
    throw new Error('Max retries exceeded')
  }
}
```

**3. Agregar ordenamiento por monto:**
```typescript
// lib/transformers/payment-transformers.ts
export function sortAllocationsByAmount(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[] {
  return [...allocations].sort((a, b) => {
    const diff = a.allocatedAmount - b.allocatedAmount
    return order === 'asc' ? diff : -diff
  })
}

// Hook:
const sortFn = sortBy === 'date'
  ? PaymentTransformers.sortAllocationsByDate
  : PaymentTransformers.sortAllocationsByAmount
```

**4. Implementar GraphQL service:**
```typescript
// lib/services/payments.service.graphql.ts
class GraphQLPaymentsService implements IPaymentsRepository {
  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    const query = `
      query GetPayments($projectId: ID!) {
        payments(where: { projectId: $projectId }) {
          id amount currency date ...
        }
      }
    `
    const response = await this.graphqlClient.query(query, { projectId })
    return response.data.payments
  }
}
```

---

## ✅ Checklist de Implementación

### Fase 1: Preparación
- [ ] Leer este documento completo
- [ ] Revisar análisis (`01-analysis.md`)
- [ ] Entender flujo de datos

### Fase 2: Implementación
- [ ] Crear `lib/types/payment.types.ts`
- [ ] Crear `lib/transformers/payment-transformers.ts`
- [ ] Escribir tests de transformers
- [ ] Crear `lib/services/payments.service.ts`
- [ ] Escribir tests de service
- [ ] Crear `hooks/use-project-payments.ts`
- [ ] Escribir tests de hook
- [ ] Refactorizar `components/tables/project-payments-table.tsx`
- [ ] Escribir tests de component

### Fase 3: Validación
- [ ] Todos los tests pasan
- [ ] Build sin errores
- [ ] Lint sin warnings
- [ ] Verificar UI funciona igual que antes

### Fase 4: Deploy
- [ ] Code review
- [ ] Merge a dev
- [ ] Testing manual
- [ ] Deploy a producción

---

**Siguiente paso:** Lee `03-implementation-guide.md` para la guía paso a paso.
