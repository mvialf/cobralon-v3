# 📦 Paso 1: Extraer Transformers

**Duración:** 45 minutos
**Dificultad:** Media
**Objetivo:** Mover lógica de transformación a pure functions reutilizables

---

## ¿Por Qué Este Paso?

**Problema actual:**
- Lógica de transformación mezclada en componente (líneas 104-126)
- 23 líneas de flatMap/filter/map/sort inline
- No reutilizable
- Difícil de testear

**Solución:**
- Extraer a pure functions en `lib/transformers/`
- Testeable sin mocks
- Reutilizable en server Y client

---

## Pre-requisitos

- [ ] Git branch limpio
- [ ] Tests actuales pasan
- [ ] Has leído `01-philosophy.md`

---

## Paso 1.1: Crear Types (10 min)

### Crear Archivo

```bash
mkdir -p lib/types
touch lib/types/payment.types.ts
```

### Código

```typescript
// lib/types/payment.types.ts

/**
 * Data Transfer Objects (DTOs) para el sistema de pagos
 */

// API Types (lo que recibes del backend)
export interface AllocationFromAPI {
  id: string
  allocatedAmount: number
  project: {
    id: string
    projectNumber: string
    projectName: string | null
    currency: string
  }
}

export interface PaymentFromAPI {
  id: string
  amount: number
  currency: string
  date: string
  type: 'Project' | 'Customer'
  reference: string | null
  notes: string | null
  customer: {
    id: string
    name: string
    phone: string
  }
  paymentMethod: {
    id: string
    name: string
    icon: string | null
  }
  allocations: AllocationFromAPI[]
}

// UI Types (lo que el componente necesita)
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
      phone: string
    }
  }
}

// Transform Options
export type SortOrder = 'asc' | 'desc'
```

### Actualizar Componente

```typescript
// components/tables/project-payments-table.tsx

// ❌ ANTES: Types inline (líneas 18-71)
interface AllocationFromAPI { ... }
interface PaymentFromAPI { ... }
interface PaymentAllocation { ... }

// ✅ DESPUÉS: Import desde module
import type {
  PaymentFromAPI,
  PaymentAllocation,
} from '@/lib/types/payment.types'
```

**Resultado:** -53 líneas del componente ✅

---

## Paso 1.2: Crear Transformers (20 min)

### Crear Archivo

```bash
mkdir -p lib/transformers
touch lib/transformers/payment-transformers.ts
```

### Código

```typescript
// lib/transformers/payment-transformers.ts

import type {
  PaymentFromAPI,
  PaymentAllocation,
  SortOrder,
} from '@/lib/types/payment.types'

/**
 * Extrae allocations de un proyecto específico
 */
export function extractProjectAllocations(
  payments: PaymentFromAPI[],
  projectId: string
): PaymentAllocation[] {
  return payments.flatMap((payment) =>
    payment.allocations
      .filter((alloc) => alloc.project.id === projectId)
      .map((alloc) => ({
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
}

/**
 * Ordena allocations por fecha
 */
export function sortAllocationsByDate(
  allocations: PaymentAllocation[],
  order: SortOrder = 'asc'
): PaymentAllocation[] {
  return [...allocations].sort((a, b) => {
    const dateA = new Date(a.payment.date).getTime()
    const dateB = new Date(b.payment.date).getTime()
    const diff = dateA - dateB
    return order === 'asc' ? diff : -diff
  })
}

/**
 * Pipeline completo
 */
export function processProjectPayments(
  payments: PaymentFromAPI[],
  projectId: string,
  order: SortOrder = 'asc'
): PaymentAllocation[] {
  const allocations = extractProjectAllocations(payments, projectId)
  return sortAllocationsByDate(allocations, order)
}
```

### Actualizar Componente

```typescript
// components/tables/project-payments-table.tsx

import { processProjectPayments } from '@/lib/transformers/payment-transformers'

const fetchPayments = useCallback(async () => {
  try {
    const response = await fetch(`/api/payments?projectId=${projectId}`)
    const data: { payments: PaymentFromAPI[] } = await response.json()

    // ❌ ANTES: 23 líneas de transformación
    // const projectAllocations = data.payments.flatMap(...)
    // projectAllocations.sort(...)

    // ✅ DESPUÉS: 1 línea
    const allocations = processProjectPayments(data.payments, projectId, 'asc')

    setAllocations(allocations)
  } catch (error) {
    toast.error('Failed to load payments')
  }
}, [projectId])
```

**Resultado:** -23 líneas del componente ✅

---

## Paso 1.3: Escribir Tests (15 min)

### Crear Archivo de Tests

```bash
mkdir -p lib/transformers/__tests__
touch lib/transformers/__tests__/payment-transformers.test.ts
```

### Tests Esenciales

```typescript
// lib/transformers/__tests__/payment-transformers.test.ts

import { describe, it, expect } from 'vitest'
import {
  extractProjectAllocations,
  sortAllocationsByDate,
  processProjectPayments,
} from '../payment-transformers'
import type { PaymentFromAPI } from '@/lib/types/payment.types'

const mockPayments: PaymentFromAPI[] = [
  {
    id: 'payment-1',
    amount: 1000,
    currency: 'CLP',
    date: '2025-01-15T00:00:00Z',
    type: 'Project',
    reference: null,
    notes: null,
    customer: { id: 'customer-1', name: 'John', phone: '+56912345678' },
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' },
    allocations: [
      {
        id: 'alloc-1',
        allocatedAmount: 500,
        project: { id: 'project-A', projectNumber: 'P 0001', projectName: 'A', currency: 'CLP' }
      },
      {
        id: 'alloc-2',
        allocatedAmount: 500,
        project: { id: 'project-B', projectNumber: 'P 0002', projectName: 'B', currency: 'CLP' }
      }
    ]
  },
  {
    id: 'payment-2',
    amount: 2000,
    currency: 'CLP',
    date: '2025-01-20T00:00:00Z',
    type: 'Project',
    reference: null,
    notes: null,
    customer: { id: 'customer-1', name: 'John', phone: '+56912345678' },
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' },
    allocations: [
      {
        id: 'alloc-3',
        allocatedAmount: 2000,
        project: { id: 'project-A', projectNumber: 'P 0001', projectName: 'A', currency: 'CLP' }
      }
    ]
  }
]

describe('extractProjectAllocations', () => {
  it('debe extraer allocations de proyecto específico', () => {
    const result = extractProjectAllocations(mockPayments, 'project-A')
    expect(result).toHaveLength(2)
    expect(result[0].allocatedAmount).toBe(500)
    expect(result[1].allocatedAmount).toBe(2000)
  })

  it('debe retornar array vacío si no hay allocations', () => {
    const result = extractProjectAllocations(mockPayments, 'project-Z')
    expect(result).toEqual([])
  })
})

describe('sortAllocationsByDate', () => {
  it('debe ordenar ascendente por defecto', () => {
    const unsorted = extractProjectAllocations(mockPayments, 'project-A')
    const sorted = sortAllocationsByDate(unsorted)

    expect(sorted[0].payment.date).toBe('2025-01-15T00:00:00Z')
    expect(sorted[1].payment.date).toBe('2025-01-20T00:00:00Z')
  })

  it('debe ordenar descendente cuando se especifica', () => {
    const unsorted = extractProjectAllocations(mockPayments, 'project-A')
    const sorted = sortAllocationsByDate(unsorted, 'desc')

    expect(sorted[0].payment.date).toBe('2025-01-20T00:00:00Z')
    expect(sorted[1].payment.date).toBe('2025-01-15T00:00:00Z')
  })

  it('no debe mutar el array original', () => {
    const original = extractProjectAllocations(mockPayments, 'project-A')
    const copy = [...original]

    sortAllocationsByDate(original, 'desc')

    expect(original).toEqual(copy)
  })
})

describe('processProjectPayments', () => {
  it('debe extraer y ordenar en un paso', () => {
    const result = processProjectPayments(mockPayments, 'project-A', 'asc')

    expect(result).toHaveLength(2)
    expect(result[0].payment.date).toBe('2025-01-15T00:00:00Z')
  })
})
```

### Ejecutar Tests

```bash
npm test lib/transformers/__tests__/payment-transformers.test.ts
```

**Esperado:**
```
✓ extractProjectAllocations (3 tests)
✓ sortAllocationsByDate (3 tests)
✓ processProjectPayments (1 test)

Tests: 7 passed
Time: <100ms
```

---

## Validación

### Checklist

- [ ] Types extraídos a `lib/types/payment.types.ts`
- [ ] Transformers extraídos a `lib/transformers/payment-transformers.ts`
- [ ] Componente usa transformers (no lógica inline)
- [ ] Tests pasan (7 tests mínimo)
- [ ] TypeScript compila sin errores
- [ ] App funciona correctamente

### Verificar Mejoras

**Antes:**
- Componente: 229 líneas
- Lógica inline: 76 líneas (types + transformación)
- Tests: 0

**Después:**
- Componente: 153 líneas (-76)
- Lógica reutilizable: `lib/transformers/`, `lib/types/`
- Tests: 7 (+7)

**Ganancia:** -33% LOC en componente, +∞ testabilidad

---

## Troubleshooting

### Error: "Cannot find module '@/lib/types/payment.types'"

**Solución:**
```bash
# Verificar tsconfig.json tiene path alias
cat tsconfig.json | grep "@/*"
# Debe mostrar: "@/*": ["./*"]
```

---

### Tests fallan: "TypeError: Cannot read property 'flatMap'"

**Solución:**
```typescript
// Mock data debe tener estructura correcta
const mockPayments: PaymentFromAPI[] = [...]
// Asegúrate que allocations es array
```

---

### Componente muestra data incorrecta

**Solución:**
```typescript
// Verificar que estás pasando el projectId correcto
const allocations = processProjectPayments(data.payments, projectId, 'asc')
//                                                         ^^^^^^^^^^^
// Este debe coincidir con props.projectId
```

---

## Próximo Paso

✅ **Completaste Paso 1: Extraer Transformers**

**Siguiente:** `step-2-simplify-component.md`

Ahora que tienes transformers reutilizables, puedes simplificar el componente aún más.
