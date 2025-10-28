# 📊 Análisis Detallado: ProjectPaymentsTable

## Información del Archivo

- **Ruta:** `components/tables/project-payments-table.tsx`
- **Tipo:** Client Component React
- **Líneas:** 229
- **Responsabilidades detectadas:** 6
- **Complejidad:** Media-Alta
- **Estado SOLID:** ❌ Viola múltiples principios

---

## 🔍 Anatomía del Código

### Estructura Actual

```typescript
'use client'

// Imports (líneas 1-16)
import { useCallback, useEffect, useState } from 'react'
import { Table, TableBody, ... } from '@/components/ui/table'
import { Card, CardContent, ... } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'                           // ⚠️ Dependencia directa
import { formatDate, formatCurrency } from '@/lib/format' // ⚠️ Dependencia directa
import { useConfiguration } from '@/hooks/use-configuration' // ⚠️ Dependencia completa

// Type Definitions (líneas 18-71)
interface ProjectPaymentsTableProps { ... }
interface AllocationFromAPI { ... }       // ❌ Debería estar en types/
interface PaymentFromAPI { ... }          // ❌ Debería estar en types/
interface PaymentAllocation { ... }       // ❌ Debería estar en types/

// Component (líneas 73-228)
export function ProjectPaymentsTable({ projectId, hidePaymentMethod }) {

  // State Management (líneas 88-93)
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { configuration } = useConfiguration()
  const locale = configuration.locale

  // Data Fetching + Transformation (líneas 95-135)
  const fetchPayments = useCallback(async () => {
    // ❌ Fetching directo con fetch()
    // ❌ Transformación compleja en el componente
    // ❌ Ordenamiento en el componente
    // ❌ Manejo de errores con toast
  }, [projectId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Loading State (líneas 141-158)
  if (isLoading) { return <LoadingSkeleton /> }

  // Empty State (líneas 160-177)
  if (allocations.length === 0) { return <EmptyState /> }

  // Table Rendering (líneas 179-227)
  return <Table>...</Table>
}
```

---

## 🚨 Violaciones SOLID Detalladas

### 1. SRP - Single Responsibility Principle

#### ❌ Violación: 6 responsabilidades en 1 componente

**Responsabilidad 1: Renderizado UI** ✅ CORRECTO

```typescript
// Líneas 179-227
return (
  <Table>
    <TableHeader>...</TableHeader>
    <TableBody>
      {allocations.map((allocation, index) => (
        <TableRow>...</TableRow>
      ))}
    </TableBody>
  </Table>
)
```

**Veredicto:** Esta ES la responsabilidad correcta del componente.

---

**Responsabilidad 2: Fetching de datos** ❌ INCORRECTO

```typescript
// Línea 98
const response = await fetch(`/api/payments?projectId=${projectId}`)
```

**Problemas:**

- El componente conoce el endpoint específico
- Acoplamiento fuerte con la API
- Imposible cambiar estrategia de fetching (GraphQL, cache, etc.)
- Testear requiere mockear `global.fetch`

**Debería estar en:** `lib/services/payments.service.ts`

---

**Responsabilidad 3: Transformación de datos** ❌ INCORRECTO

```typescript
// Líneas 104-121: Transformación compleja
const projectAllocations = data.payments.flatMap((payment: PaymentFromAPI) =>
  payment.allocations
    .filter((alloc: AllocationFromAPI) => alloc.project.id === projectId)
    .map((alloc: AllocationFromAPI) => ({
      id: alloc.id,
      allocatedAmount: alloc.allocatedAmount,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        date: payment.date,
        type: payment.type,
        notes: payment.notes,
        paymentMethod: payment.paymentMethod,
        customer: payment.customer,
      },
    }))
)
```

**Problemas:**

- Lógica de negocio (flatMap + filter + map) dentro del componente
- No reutilizable (si otro componente necesita esto → copiar/pegar)
- Difícil de testear (requiere renderizar el componente)
- Complejidad cognitiva alta

**Debería estar en:** `lib/transformers/payment-transformers.ts` como pure function

```typescript
// Mejor approach:
export function extractProjectAllocations(
  payments: PaymentFromAPI[],
  projectId: string
): PaymentAllocation[] {
  return payments.flatMap((payment) =>
    payment.allocations
      .filter((alloc) => alloc.project.id === projectId)
      .map((alloc) => mapToPaymentAllocation(payment, alloc))
  )
}
```

---

**Responsabilidad 4: Ordenamiento** ❌ INCORRECTO

```typescript
// Líneas 124-126
projectAllocations.sort((a: PaymentAllocation, b: PaymentAllocation) => {
  return new Date(a.payment.date).getTime() - new Date(b.payment.date).getTime()
})
```

**Problemas:**

- Mutación del array (side effect)
- Lógica de ordenamiento hardcodeada
- No parametrizable (si necesitas orden descendente → modifica el código)
- Mismo problema de testabilidad

**Debería estar en:** `lib/transformers/payment-transformers.ts`

```typescript
// Mejor approach:
export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[] {
  return [...allocations].sort((a, b) => {
    const diff = new Date(a.payment.date).getTime() - new Date(b.payment.date).getTime()
    return order === 'asc' ? diff : -diff
  })
}
```

---

**Responsabilidad 5: Manejo de estado** ⚠️ GRIS

```typescript
// Líneas 88-89
const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
const [isLoading, setIsLoading] = useState(true)
```

**Análisis:**

- El componente maneja su propio estado
- En arquitectura simple: ACEPTABLE
- En arquitectura escalable: DEBERÍA delegarse a custom hook

**Debería estar en:** `hooks/use-project-payments.ts`

```typescript
// Mejor approach:
export function useProjectPayments(projectId: string) {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // ... lógica de fetching

  return { allocations, isLoading, error }
}

// Componente:
export function ProjectPaymentsTable({ projectId }) {
  const { allocations, isLoading, error } = useProjectPayments(projectId)

  // Solo renderizar
}
```

---

**Responsabilidad 6: Manejo de errores y notificaciones** ❌ INCORRECTO

```typescript
// Líneas 130-131
console.error('Error fetching payments:', error)
toast.error('Error al cargar pagos')
```

**Problemas:**

- Acoplamiento directo con librería de toasts (sonner)
- Si cambias de librería → modificas todos los componentes
- No testeable (requiere mockear `toast` global)

**Debería estar en:** Service layer o error boundary

```typescript
// Mejor approach en service:
class PaymentsService {
  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    try {
      const response = await fetch(`/api/payments?projectId=${projectId}`)
      if (!response.ok) throw new PaymentsFetchError('Failed to fetch')
      return response.json()
    } catch (error) {
      // Log y re-throw
      console.error('PaymentsService error:', error)
      throw error
    }
  }
}

// Componente maneja error sin conocer detalles:
const { error } = useProjectPayments(projectId)
if (error) toast.error('Error al cargar pagos')
```

---

### 2. OCP - Open/Closed Principle

#### ⚠️ Parcial: Extensión requiere modificación

**Problema 1: Ordenamiento hardcodeado**

```typescript
// Líneas 124-126: SIEMPRE orden ascendente
projectAllocations.sort((a, b) => {
  return new Date(a.payment.date).getTime() - new Date(b.payment.date).getTime()
})
```

**Escenario:** Usuario quiere ver pagos más recientes primero.

**Solución actual:** Modificar el código del componente ❌

**Solución OCP:** Props parametrizables ✅

```typescript
interface ProjectPaymentsTableProps {
  projectId: string
  sortOrder?: 'asc' | 'desc' // ← Extensión sin modificación
}
```

---

**Problema 2: Columnas fijas**

```typescript
// Líneas 184-190: Columnas hardcodeadas
<TableHeader>
  <TableRow>
    <TableHead>N°</TableHead>
    <TableHead>Fecha</TableHead>
    {!hidePaymentMethod && <TableHead>Método</TableHead>}
    <TableHead>Monto Asignado</TableHead>
  </TableRow>
</TableHeader>
```

**Escenario:** Agregar columna "Referencia" o "Notas".

**Solución actual:** Modificar el componente ❌

**Solución OCP:** Composition pattern ✅

```typescript
<ProjectPaymentsTable projectId="..." columns={[
  { key: 'number', label: 'N°', render: (row) => row.number },
  { key: 'date', label: 'Fecha', render: (row) => formatDate(row.date) },
  { key: 'amount', label: 'Monto', render: (row) => formatCurrency(row.amount) },
  // Agregar columnas sin modificar el componente
]} />
```

---

**Problema 3: Estados de UI no customizables**

```typescript
// Líneas 141-158: Loading state hardcodeado
if (isLoading) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Cargando historial de pagos...</CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
```

**Escenario:** Quieres un loading spinner en lugar de skeletons.

**Solución actual:** Modificar el componente ❌

**Solución OCP:** Slots/Children ✅

```typescript
interface ProjectPaymentsTableProps {
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
}

// Uso:
<ProjectPaymentsTable
  projectId="..."
  loadingComponent={<Spinner />}
  emptyComponent={<CustomEmptyState />}
/>
```

---

### 3. LSP - Liskov Substitution Principle

#### ⚠️ No hay herencia, pero hay **inconsistencia semántica**

**Problema: Dos representaciones del mismo concepto**

```typescript
// Representación 1: Desde la API
interface PaymentFromAPI {
  id: string
  amount: number
  allocations: AllocationFromAPI[] // ← Payment TIENE allocations
}

// Representación 2: Interna
interface PaymentAllocation {
  id: string
  allocatedAmount: number
  payment: {
    // ← Allocation TIENE payment
    id: string
    amount: number
  }
}
```

**Análisis:**

- `PaymentFromAPI` tiene relación 1:N con allocations
- `PaymentAllocation` invierte la relación: allocation → payment
- Esta inversión puede causar confusión conceptual

**Mejor approach:** Adapters explícitos

```typescript
// Domain types (interno)
interface Payment {
  id: string
  amount: number
}
interface Allocation {
  id: string
  paymentId: string
  amount: number
}

// API DTOs
interface PaymentDTO {
  id: string
  amount: number
  allocations: AllocationDTO[]
}

// Adapter
class PaymentAdapter {
  static toDomain(dto: PaymentDTO): { payment: Payment; allocations: Allocation[] } {
    // Transformación explícita
  }
}
```

---

### 4. ISP - Interface Segregation Principle

#### ⚠️ Dependencias innecesarias

**Problema: Dependencia del objeto `configuration` completo**

```typescript
// Líneas 90-93
const { configuration } = useConfiguration()
const locale = configuration.locale // Solo necesita locale
```

**Análisis:**

- Necesita: `locale`
- Obtiene: `{ pais, region, ciudad, comuna, currency, locale }` (6 valores)
- Si cualquier valor cambia → re-render innecesario

**Impacto medido:**

```typescript
// Cambio en `configuration.pais`:
// ANTES: Re-render de ProjectPaymentsTable ❌ (innecesario)
// DESPUÉS: No re-render ✅
```

**Solución 1: Props explícitas (inversión de dependencia)**

```typescript
interface ProjectPaymentsTableProps {
  projectId: string
  locale?: string  // ← Dependencia mínima y explícita
}

// Uso:
const { locale } = useConfiguration()
<ProjectPaymentsTable projectId="..." locale={locale} />
```

**Beneficios:**

- Testeable (inyectas locale mock)
- Sin re-renders innecesarios
- Dependencia explícita

**Solución 2: Hook especializado**

```typescript
// hooks/use-locale.ts
export function useLocale(): string {
  const { configuration } = useConfiguration()
  return configuration.locale
}

// Uso en componente:
const locale = useLocale()
```

---

### 5. DIP - Dependency Inversion Principle

#### ❌ Violación CRÍTICA: Múltiples dependencias de bajo nivel

**Problema 1: Dependencia directa de fetch API**

```typescript
// Línea 98: Acoplamiento con implementación concreta
const response = await fetch(`/api/payments?projectId=${projectId}`)
```

**Principio violado:**

> Los módulos de alto nivel no deberían depender de módulos de bajo nivel.
> Ambos deberían depender de abstracciones.

**Análisis:**

- Módulo de alto nivel: `ProjectPaymentsTable` (componente UI)
- Módulo de bajo nivel: `fetch()` (browser API)
- ❌ El componente depende directamente de fetch

**Consecuencias:**

1. Imposible testear sin mockear `global.fetch`
2. No puedes cambiar estrategia (GraphQL, WebSocket, cache)
3. No puedes agregar retry, circuit breaker, etc.

**Solución DIP:**

```typescript
// 1. Define abstracción (interface)
interface IPaymentsRepository {
  fetchByProject(projectId: string): Promise<Payment[]>
}

// 2. Implementación concreta
class FetchPaymentsRepository implements IPaymentsRepository {
  async fetchByProject(projectId: string): Promise<Payment[]> {
    const response = await fetch(`/api/payments?projectId=${projectId}`)
    if (!response.ok) throw new Error('Failed to fetch')
    return response.json()
  }
}

// 3. Componente depende de abstracción (via hook)
function useProjectPayments(projectId: string, repository: IPaymentsRepository) {
  // Hook usa repository.fetchByProject()
}

// 4. Inyección de dependencia
const repository = new FetchPaymentsRepository()
const { data } = useProjectPayments(projectId, repository)
```

**Beneficios:**

- Testeable: Inyectas mock repository
- Extensible: Implementas `CachedPaymentsRepository`, `GraphQLPaymentsRepository`, etc.
- Desacoplado: Componente no conoce implementación

---

**Problema 2: Dependencia directa de formatters**

```typescript
// Línea 16
import { formatDate, formatCurrency } from '@/lib/format'

// Uso líneas 200, 210
formatDate(allocation.payment.date, 'short', locale)
formatCurrency(allocation.allocatedAmount, allocation.payment.currency)
```

**Análisis:**

- No es terrible (son utilities puras)
- Pero idealmente deberían ser inyectables

**Solución pragmática:**

```typescript
// Opción A: Props (overkill para formatters)
interface ProjectPaymentsTableProps {
  formatDate?: (date: Date, format: string, locale: string) => string
  formatCurrency?: (amount: number, currency: string) => string
}

// Opción B: Context (mejor para formatters globales)
const FormatterContext = createContext<{
  formatDate: (date: Date, format: string, locale: string) => string
  formatCurrency: (amount: number, currency: string) => string
}>()

// Uso:
const { formatDate, formatCurrency } = useFormatters()
```

**Veredicto:** Para formatters, la dependencia directa es **aceptable** (son pure functions estables).

---

**Problema 3: Dependencia directa de toast**

```typescript
// Línea 14
import { toast } from 'sonner'

// Línea 131
toast.error('Error al cargar pagos')
```

**Análisis:**

- Acoplamiento con librería específica (sonner)
- Cambiar librería → cambias TODOS los componentes

**Solución DIP:**

```typescript
// 1. Abstracción
interface INotificationService {
  error(message: string): void
  success(message: string): void
}

// 2. Implementación con sonner
class SonnerNotificationService implements INotificationService {
  error(message: string): void {
    toast.error(message)
  }
  success(message: string): void {
    toast.success(message)
  }
}

// 3. Context provider
const NotificationContext = createContext<INotificationService>(...)

// 4. Hook
function useNotification(): INotificationService {
  return useContext(NotificationContext)
}

// 5. Componente usa abstracción
const notification = useNotification()
notification.error('Error al cargar pagos')
```

**Beneficios:**

- Migrar de sonner a otra librería: Solo cambias implementación
- Testear: Mockeas INotificationService

---

## 📊 Métricas de Complejidad

### Complejidad Ciclomática

**Definición:** Número de caminos independientes a través del código.

**Cálculo para `fetchPayments()`:**

```typescript
async function fetchPayments() {
  try {                                    // +1 (try)
    setIsLoading(true)
    const response = await fetch(...)
    if (!response.ok) throw new Error(...) // +1 (if)

    const data = await response.json()

    const projectAllocations = data.payments.flatMap((payment) =>  // +1 (flatMap)
      payment.allocations
        .filter((alloc) => alloc.project.id === projectId)         // +1 (filter)
        .map((alloc) => ({ ... }))                                 // +1 (map)
    )

    projectAllocations.sort(...)           // +1 (sort)
    setAllocations(projectAllocations)
  } catch (error) {                        // +1 (catch)
    console.error(...)
    toast.error(...)
  } finally {                              // +1 (finally)
    setIsLoading(false)
  }
}
```

**Resultado:** Complejidad ciclomática ≈ **8** (Alta para una función)

**Recomendación:** Mantener < 10 (idealmente < 5)

---

### Líneas de Código

| Sección              | Líneas  | Porcentaje |
| -------------------- | ------- | ---------- |
| Imports              | 16      | 7%         |
| Types                | 53      | 23%        |
| Component            | 156     | 68%        |
| - State management   | 6       | 3%         |
| - Fetching/Transform | 41      | 18%        |
| - Rendering          | 49      | 21%        |
| - Loading state      | 18      | 8%         |
| - Empty state        | 18      | 8%         |
| - Table rendering    | 30      | 13%        |
| **Total**            | **229** | **100%**   |

**Análisis:**

- 68% del archivo es lógica del componente
- 41% de la lógica del componente es fetching/transformación (NO debería estar ahí)

---

## 🧪 Análisis de Testabilidad

### Test Actual (hipotético)

```typescript
describe('ProjectPaymentsTable', () => {
  it('should render payments', async () => {
    // ❌ Mock 1: fetch global
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ payments: mockPayments }),
    })

    // ❌ Mock 2: useConfiguration hook
    jest.mock('@/hooks/use-configuration', () => ({
      useConfiguration: () => ({
        configuration: { locale: 'es-CL', /* ... otros 5 valores */ }
      })
    }))

    // ❌ Mock 3: toast
    jest.mock('sonner', () => ({
      toast: { error: jest.fn() }
    }))

    // ❌ Mock 4: formatDate
    jest.mock('@/lib/format', () => ({
      formatDate: (date) => date,
      formatCurrency: (amount) => `$${amount}`
    }))

    // Render
    const { getByText } = render(<ProjectPaymentsTable projectId="123" />)

    // Esperar carga asíncrona
    await waitFor(() => {
      expect(getByText('$100')).toBeInTheDocument()
    })
  })
})
```

**Problemas:**

1. Requiere 4 mocks globales
2. Difícil mantener (cambios en implementación → cambian mocks)
3. Lento (renderiza componente real)
4. Frágil (si cambias estructura DOM → test falla)

### Test Refactorizado (propuesto)

```typescript
describe('ProjectPaymentsTable', () => {
  it('should render payments', () => {
    // ✅ Sin mocks: Solo pasas props
    const mockData = [
      {
        id: '1',
        allocatedAmount: 100,
        payment: {
          date: '2025-01-01',
          currency: 'CLP',
          paymentMethod: { name: 'Efectivo' }
        }
      }
    ]

    const { getByText } = render(
      <ProjectPaymentsTable
        data={mockData}
        loading={false}
        locale="es-CL"
      />
    )

    // Assertions simples
    expect(getByText('$100')).toBeInTheDocument()
  })
})
```

**Beneficios:**

- 0 mocks
- Rápido (solo renderiza tabla)
- Mantenible (props explícitas)

---

## 📋 Resumen Ejecutivo

### ❌ Problemas Críticos

1. **SRP violado:** 6 responsabilidades en 1 componente
2. **DIP violado:** Dependencias directas de fetch, toast
3. **Testabilidad:** Requiere 4-5 mocks globales
4. **Reutilización:** Lógica no reutilizable (atada al componente)
5. **Mantenibilidad:** Cambios en API → modificas componente UI

### ✅ Qué funciona bien

1. **Renderizado UI:** Estructura de tabla clara
2. **Props interface:** Simple y efectiva
3. **Estados de UI:** Loading/Empty states bien implementados
4. **Formateo:** Uso correcto de formatters
5. **Funciona:** El componente cumple su propósito actual

### 🎯 Veredicto

**Estado:** ⚠️ Deuda técnica acumulándose

**Acción recomendada:** Refactorizar ANTES de agregar más funcionalidad

**Prioridad:** Media-Alta

**Esfuerzo estimado:** 4-6 horas (incluyendo tests)

**ROI esperado:** Alto (testabilidad, reutilización, mantenibilidad)

---

**Siguiente paso:** Lee `02-architecture.md` para ver la arquitectura propuesta.
