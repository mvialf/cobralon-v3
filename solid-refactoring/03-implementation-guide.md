# 🚀 Guía de Implementación: SOLID Refactoring

## Estrategia General

**Enfoque:** Incremental y sin romper nada

1. ✅ Crear código nuevo JUNTO al viejo
2. ✅ Testear el código nuevo
3. ✅ Reemplazar cuando funcione
4. ✅ Eliminar código viejo

**Tiempo estimado:** 4-6 horas (incluyendo tests)

---

## 📋 Preparación (15 minutos)

### 1. Verificar estructura de carpetas

```bash
# Verificar que existen estos directorios
ls -la lib/types
ls -la lib/transformers
ls -la lib/services
ls -la hooks

# Si no existen, crearlos:
mkdir -p lib/types lib/transformers lib/services
```

### 2. Backup del código actual

```bash
# Crear branch de respaldo
git checkout -b backup/before-solid-refactoring

# Commit del estado actual
git add .
git commit -m "Backup: Estado antes de SOLID refactoring"

# Crear branch de trabajo
git checkout -b feature/solid-refactoring
```

### 3. Leer documentación

```bash
# Leer análisis y arquitectura
cat solid-refactoring/01-analysis.md
cat solid-refactoring/02-architecture.md
```

---

## 🏗️ Fase 1: Extraer Tipos (30 minutos)

### Paso 1.1: Crear archivo de tipos

```bash
touch lib/types/payment.types.ts
```

**Copiar desde:**
```bash
cp solid-refactoring/examples/types/payment.types.ts lib/types/
```

**O crear manualmente:**
```typescript
// lib/types/payment.types.ts

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

export interface IPaymentsRepository {
  fetchByProject(projectId: string): Promise<PaymentFromAPI[]>
  fetchByCustomer(customerId: string): Promise<PaymentFromAPI[]>
  fetchAll(params?: PaymentQueryParams): Promise<{
    payments: PaymentFromAPI[]
    total: number
    page: number
  }>
}

export interface PaymentQueryParams {
  projectId?: string
  customerId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

export class PaymentsFetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'PaymentsFetchError'
  }
}

// Exports adicionales (ver archivo completo en examples/)
```

### Paso 1.2: Verificar que compila

```bash
npm run typecheck
```

**Errores esperados:** Ninguno (los tipos son standalone)

### Paso 1.3: Commit

```bash
git add lib/types/payment.types.ts
git commit -m "feat(types): agregar tipos de dominio para pagos"
```

---

## 🔧 Fase 2: Crear Transformers (45 minutos)

### Paso 2.1: Crear archivo de transformers

```bash
touch lib/transformers/payment-transformers.ts
```

**Copiar desde:**
```bash
cp solid-refactoring/examples/transformers/payment-transformers.ts lib/transformers/
```

**O crear manualmente las funciones principales:**

```typescript
// lib/transformers/payment-transformers.ts
import type {
  PaymentFromAPI,
  AllocationFromAPI,
  PaymentAllocation,
} from '@/lib/types/payment.types'

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

function mapToPaymentAllocation(
  payment: PaymentFromAPI,
  allocation: AllocationFromAPI
): PaymentAllocation {
  return {
    id: allocation.id,
    allocatedAmount: allocation.allocatedAmount,
    payment: {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      date: payment.date,
      type: payment.type,
      notes: payment.notes,
      paymentMethod: {
        id: payment.paymentMethod.id,
        name: payment.paymentMethod.name,
        icon: payment.paymentMethod.icon,
      },
      customer: {
        id: payment.customer.id,
        name: payment.customer.name,
      },
    },
  }
}

export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: 'asc' | 'desc' = 'asc'
): PaymentAllocation[] {
  return [...allocations].sort((a, b) => {
    const dateA = new Date(a.payment.date).getTime()
    const dateB = new Date(b.payment.date).getTime()
    const diff = dateA - dateB
    return order === 'asc' ? diff : -diff
  })
}

// ... más funciones (ver archivo completo)
```

### Paso 2.2: Crear tests de transformers

```bash
touch lib/transformers/__tests__/payment-transformers.test.ts
```

**Copiar desde:**
```bash
cp solid-refactoring/examples/transformers/payment-transformers.test.ts \
   lib/transformers/__tests__/
```

### Paso 2.3: Ejecutar tests

```bash
npm test lib/transformers/__tests__/payment-transformers.test.ts
```

**Resultado esperado:**
```
✓ lib/transformers/__tests__/payment-transformers.test.ts (30 tests) 15ms
  ✓ extractProjectAllocations (4 tests)
  ✓ sortAllocationsByDate (4 tests)
  ✓ sortAllocationsByAmount (3 tests)
  ✓ filterByPaymentType (3 tests)
  ✓ calculateTotalAllocated (3 tests)
  ✓ groupAllocationsByMonth (3 tests)
  ✓ getAllocationStatistics (3 tests)
  ✓ pipeTransformers (3 tests)
  ✓ Integration tests (2 tests)
  ✓ Edge cases (2 tests)

Test Files  1 passed (1)
     Tests  30 passed (30)
  Start at  10:00:00
  Duration  15ms
```

### Paso 2.4: Commit

```bash
git add lib/transformers/
git commit -m "feat(transformers): agregar pure functions para transformación de pagos"
```

---

## 🌐 Fase 3: Crear Service (60 minutos)

### Paso 3.1: Crear archivo de service

```bash
touch lib/services/payments.service.ts
```

**Copiar desde:**
```bash
cp solid-refactoring/examples/services/payments.service.ts lib/services/
```

**O crear manualmente la clase principal:**

```typescript
// lib/services/payments.service.ts
import type {
  IPaymentsRepository,
  PaymentFromAPI,
  PaymentQueryParams,
} from '@/lib/types/payment.types'

export class PaymentsService implements IPaymentsRepository {
  private baseUrl: string

  constructor(baseUrl: string = '/api/payments') {
    this.baseUrl = baseUrl
  }

  async fetchByProject(projectId: string): Promise<PaymentFromAPI[]> {
    const url = `${this.baseUrl}?projectId=${encodeURIComponent(projectId)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!Array.isArray(data.payments)) {
      throw new Error('Invalid response structure')
    }

    return data.payments
  }

  // ... otros métodos (ver archivo completo)
}

export const paymentsService = new PaymentsService()
```

### Paso 3.2: Crear tests de service

```bash
touch lib/services/__tests__/payments.service.test.ts
```

**Contenido básico:**

```typescript
// lib/services/__tests__/payments.service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PaymentsService } from '../payments.service'
import type { PaymentFromAPI } from '@/lib/types/payment.types'

describe('PaymentsService', () => {
  let service: PaymentsService
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    service = new PaymentsService()
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch payments by project', async () => {
    const mockPayments: PaymentFromAPI[] = [
      {
        id: 'payment-1',
        amount: 1000,
        currency: 'CLP',
        date: '2025-01-15',
        type: 'Project',
        reference: null,
        notes: null,
        paymentMethod: { id: 'm1', name: 'Efectivo', icon: null },
        customer: { id: 'c1', name: 'Juan' },
        allocations: [],
      },
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ payments: mockPayments }),
    })

    const result = await service.fetchByProject('project-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/payments?projectId=project-1',
      expect.any(Object)
    )
    expect(result).toEqual(mockPayments)
  })

  it('should throw error on HTTP error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(service.fetchByProject('project-1')).rejects.toThrow(
      'HTTP 500: Internal Server Error'
    )
  })

  // ... más tests
})
```

### Paso 3.3: Ejecutar tests

```bash
npm test lib/services/__tests__/payments.service.test.ts
```

### Paso 3.4: Commit

```bash
git add lib/services/
git commit -m "feat(services): agregar PaymentsService con abstracción IPaymentsRepository"
```

---

## 🪝 Fase 4: Crear Custom Hook (60 minutos)

### Paso 4.1: Crear archivo de hook

```bash
touch hooks/use-project-payments.ts
```

**Copiar desde:**
```bash
cp solid-refactoring/examples/hooks/use-project-payments.ts hooks/
```

**O crear manualmente:**

```typescript
// hooks/use-project-payments.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  IPaymentsRepository,
  PaymentAllocation,
} from '@/lib/types/payment.types'
import { PaymentTransformers } from '@/lib/transformers/payment-transformers'
import { paymentsService } from '@/lib/services/payments.service'

export interface UseProjectPaymentsOptions {
  sortOrder?: 'asc' | 'desc'
  sortBy?: 'date' | 'amount'
  repository?: IPaymentsRepository
}

export interface UseProjectPaymentsResult {
  data: PaymentAllocation[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  reset: () => void
  stats: {
    count: number
    totalAmount: number
    averageAmount: number
  }
}

export function useProjectPayments(
  projectId: string,
  options: UseProjectPaymentsOptions = {}
): UseProjectPaymentsResult {
  const {
    sortOrder = 'asc',
    sortBy = 'date',
    repository = paymentsService,
  } = options

  const [data, setData] = useState<PaymentAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch
      const payments = await repository.fetchByProject(projectId)

      // 2. Transform
      let allocations = PaymentTransformers.extractProjectAllocations(
        payments,
        projectId
      )

      // 3. Sort
      if (sortBy === 'date') {
        allocations = PaymentTransformers.sortAllocationsByDate(allocations, sortOrder)
      } else {
        allocations = PaymentTransformers.sortAllocationsByAmount(allocations, sortOrder)
      }

      setData(allocations)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [projectId, sortOrder, sortBy, repository])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = useMemo(() => {
    return PaymentTransformers.getAllocationStatistics(data)
  }, [data])

  const reset = useCallback(() => {
    setData([])
    setError(null)
    setLoading(false)
  }, [])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    reset,
    stats,
  }
}
```

### Paso 4.2: Crear tests de hook

```bash
touch hooks/__tests__/use-project-payments.test.tsx
```

**Contenido:**

```typescript
// hooks/__tests__/use-project-payments.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProjectPayments } from '../use-project-payments'
import { MockPaymentsService } from '@/lib/services/payments.service'
import type { PaymentFromAPI } from '@/lib/types/payment.types'

describe('useProjectPayments', () => {
  it('should fetch and process payments', async () => {
    const mockService = new MockPaymentsService()
    const mockPayments: PaymentFromAPI[] = [
      {
        id: 'payment-1',
        amount: 1000,
        currency: 'CLP',
        date: '2025-01-15',
        type: 'Project',
        reference: null,
        notes: null,
        paymentMethod: { id: 'm1', name: 'Efectivo', icon: null },
        customer: { id: 'c1', name: 'Juan' },
        allocations: [
          {
            id: 'alloc-1',
            allocatedAmount: 1000,
            project: { id: 'project-1' },
          },
        ],
      },
    ]

    mockService.mockFetchByProject('project-1', mockPayments)

    const { result } = renderHook(() =>
      useProjectPayments('project-1', { repository: mockService })
    )

    // Inicialmente loading
    expect(result.current.loading).toBe(true)

    // Esperar a que termine
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Verificar datos
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].allocatedAmount).toBe(1000)
    expect(result.current.error).toBeNull()
  })

  // ... más tests
})
```

### Paso 4.3: Ejecutar tests

```bash
npm test hooks/__tests__/use-project-payments.test.tsx
```

### Paso 4.4: Commit

```bash
git add hooks/
git commit -m "feat(hooks): agregar useProjectPayments para orquestar pagos"
```

---

## 🎨 Fase 5: Refactorizar Componente (90 minutos)

### Paso 5.1: Crear componente refactorizado

**IMPORTANTE:** NO borrar el componente original todavía.

```bash
# Renombrar el viejo (backup temporal)
mv components/tables/project-payments-table.tsx \
   components/tables/project-payments-table.old.tsx
```

```bash
# Crear el nuevo
touch components/tables/project-payments-table.tsx
```

**Copiar desde:**
```bash
cp solid-refactoring/examples/components/project-payments-table.refactored.tsx \
   components/tables/project-payments-table.tsx
```

### Paso 5.2: Adaptar imports

Verificar que todos los imports existen:

```typescript
// components/tables/project-payments-table.tsx
import { useProjectPayments } from '@/hooks/use-project-payments'
import { formatDate, formatCurrency } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'
```

### Paso 5.3: Testing manual

```bash
# Iniciar dev server
npm run dev
```

**Verificar:**
1. La tabla se renderiza correctamente
2. Datos se muestran igual que antes
3. Loading skeleton funciona
4. Empty state funciona
5. No hay errores en consola

### Paso 5.4: Comparar con el original

```bash
# Ver cambios línea por línea
git diff --no-index \
  components/tables/project-payments-table.old.tsx \
  components/tables/project-payments-table.tsx
```

**Métricas esperadas:**
- Líneas: 229 → ~100 (56% reducción)
- Responsabilidades: 6 → 1
- Complejidad: Alta → Baja

### Paso 5.5: Crear tests de componente

```bash
touch components/tables/__tests__/project-payments-table.test.tsx
```

**Contenido:**

```typescript
// components/tables/__tests__/project-payments-table.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectPaymentsTable } from '../project-payments-table'
import * as useProjectPaymentsModule from '@/hooks/use-project-payments'

describe('ProjectPaymentsTable', () => {
  it('should render loading state', () => {
    vi.spyOn(useProjectPaymentsModule, 'useProjectPayments').mockReturnValue({
      data: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
      reset: vi.fn(),
      stats: {
        count: 0,
        totalAmount: 0,
        averageAmount: 0,
        projectPayments: 0,
        customerPayments: 0,
      },
    })

    render(<ProjectPaymentsTable projectId="proj-1" />)

    expect(screen.getByText('Cargando historial de pagos...')).toBeInTheDocument()
  })

  it('should render empty state', () => {
    vi.spyOn(useProjectPaymentsModule, 'useProjectPayments').mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      reset: vi.fn(),
      stats: {
        count: 0,
        totalAmount: 0,
        averageAmount: 0,
        projectPayments: 0,
        customerPayments: 0,
      },
    })

    render(<ProjectPaymentsTable projectId="proj-1" />)

    expect(
      screen.getByText('No hay pagos registrados para este proyecto')
    ).toBeInTheDocument()
  })

  // ... más tests
})
```

### Paso 5.6: Ejecutar todos los tests

```bash
npm test
```

**Resultado esperado:**
```
✓ lib/transformers/__tests__/payment-transformers.test.ts (30 tests)
✓ lib/services/__tests__/payments.service.test.ts (5 tests)
✓ hooks/__tests__/use-project-payments.test.tsx (3 tests)
✓ components/tables/__tests__/project-payments-table.test.tsx (3 tests)

Test Files  4 passed (4)
     Tests  41 passed (41)
```

### Paso 5.7: Commit

```bash
git add components/tables/
git commit -m "feat(components): refactorizar ProjectPaymentsTable siguiendo SOLID"
```

---

## ✅ Fase 6: Validación Final (30 minutos)

### Checklist de validación

```bash
# 1. Build sin errores
npm run build

# 2. Typecheck sin errores
npm run typecheck

# 3. Lint sin warnings
npm run lint

# 4. Tests pasan
npm test

# 5. Coverage aceptable
npm test:coverage
```

**Coverage esperado:**
```
File                              | % Stmts | % Branch | % Funcs | % Lines
----------------------------------|---------|----------|---------|--------
lib/types/payment.types.ts        |     100 |      100 |     100 |     100
lib/transformers/payment-transformers.ts | 100 |  100 |     100 |     100
lib/services/payments.service.ts  |      90 |       85 |      95 |      90
hooks/use-project-payments.ts     |      85 |       80 |      90 |      85
components/tables/project-payments-table.tsx | 80 | 75 |      85 |      80
```

### Testing manual exhaustivo

1. **Flujo normal:**
   - Cargar página con proyecto que tiene pagos
   - Verificar que se muestran correctamente
   - Verificar orden cronológico

2. **Estados edge:**
   - Proyecto sin pagos → Empty state
   - Proyecto que no existe → Error handling
   - Network error → Error con botón retry

3. **Interactividad:**
   - Refetch funciona
   - No hay memory leaks (abrir/cerrar múltiples veces)

### Comparación con backup

```bash
# Comparar funcionalidad con el backup
git diff backup/before-solid-refactoring components/tables/
```

**Verificar que NO HAY:**
- Cambios de comportamiento visible
- Features removidas
- Regresiones de UI

---

## 🧹 Fase 7: Cleanup (15 minutos)

### 7.1: Eliminar archivo viejo

```bash
# Solo cuando estés 100% seguro
rm components/tables/project-payments-table.old.tsx
```

### 7.2: Commit final

```bash
git add .
git commit -m "chore: cleanup - remover archivo viejo de ProjectPaymentsTable"
```

### 7.3: Merge a dev

```bash
git checkout dev
git merge feature/solid-refactoring

# Verificar que todo funciona
npm run dev

# Push
git push origin dev
```

---

## 📊 Métricas Finales

### Antes vs Después

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Archivos** | 1 | 5 | +400% |
| **Líneas totales** | 229 | ~560 | +144% |
| **Líneas por archivo** | 229 | ~90-100 | -56% |
| **Responsabilidades** | 6 | 1 | -83% |
| **Tests** | 0 | 41+ | +∞ |
| **Coverage** | 0% | 85%+ | +∞ |
| **Testabilidad** | ❌ Muy difícil | ✅ Fácil | +100% |
| **Mocks necesarios** | 5 | 0-1 | -80% |
| **Complejidad ciclomática** | ~8 | ~3 | -62% |

---

## ⚠️ Troubleshooting

### Error: "Cannot find module '@/lib/types/payment.types'"

**Solución:**
```bash
# Verificar que el alias está configurado
cat tsconfig.json | grep "@/*"

# Debería mostrar:
# "@/*": ["./*"]
```

### Tests fallan con "fetch is not defined"

**Solución:**
```typescript
// vitest.setup.ts
import { vi } from 'vitest'

global.fetch = vi.fn()
```

### Componente no re-renderiza cuando cambia projectId

**Solución:** Verificar que `projectId` está en dependencies de useEffect:
```typescript
useEffect(() => {
  fetchData()
}, [fetchData]) // fetchData incluye projectId en sus deps
```

---

## 🎉 Resultado Final

Después de completar todos los pasos, tendrás:

✅ **Arquitectura SOLID** con separación de concerns
✅ **41+ tests** con cobertura 85%+
✅ **Código reutilizable** (hook, service, transformers)
✅ **Fácil de extender** (agregar features sin modificar existente)
✅ **Mantenible** (cambios localizados en una capa)
✅ **Documentado** (ADRs, comentarios, ejemplos)

---

**Siguiente paso:** ¡Replica este patrón en otros componentes del proyecto!

**Sugerencias de componentes para refactorizar:**
1. `CustomerForm` (similar patrón)
2. `PaymentForm` (más complejo, pero mismo approach)
3. `ProjectForm` (validation logic separable)

**Regla de oro:** Si un componente tiene >150 líneas o >3 responsabilidades → refactorizar.
