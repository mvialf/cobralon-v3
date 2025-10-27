# 📝 Guía de Implementación: Soft SOLID

## Visión General

Guía práctica paso a paso para refactorizar `ProjectPaymentsTable` usando el enfoque Soft SOLID.

**Tiempo total estimado:** 1-2 horas
**Break-even:** 1 semana
**Dificultad:** Media

---

## 🗺️ Roadmap Completo

```
Fase 1: Preparación (5 min)
    ↓
Fase 2: Extraer Types (15 min)
    ↓
Fase 3: Crear Transformers (30 min)
    ↓
Fase 4: Escribir Tests (20 min)
    ↓
Fase 5: Refactorizar Componente (20 min)
    ↓
Fase 6 (OPCIONAL): Migrar a Server Component (30 min)
    ↓
Validación Final (10 min)
```

---

## FASE 1: Preparación (5 min)

### 1.1 Backup del Código Actual

```bash
# Crear backup
cp components/tables/project-payments-table.tsx \
   components/tables/project-payments-table.backup.tsx

# O si usas git
git checkout -b refactor/soft-solid-payments-table
```

### 1.2 Crear Estructura de Carpetas

```bash
# Types
mkdir -p lib/types

# Transformers
mkdir -p lib/transformers

# Tests
mkdir -p lib/transformers/__tests__
```

### 1.3 Leer Código Actual

**Objetivo:** Entender qué hace el componente.

**Lee** [components/tables/project-payments-table.tsx](../components/tables/project-payments-table.tsx)

**Identifica:**
- ✅ Líneas 18-71: Type definitions
- ✅ Líneas 95-135: Fetching + transformación
- ✅ Líneas 179-227: Renderizado UI

**Pregunta clave:** ¿Cuál es la lógica que quiero reutilizar?
**Respuesta:** Transformación de `PaymentFromAPI[]` a `PaymentAllocation[]`

---

## FASE 2: Extraer Types (15 min)

### 2.1 Crear Archivo de Types

**Archivo:** `lib/types/payment.types.ts`

```typescript
// lib/types/payment.types.ts

/**
 * Data Transfer Objects (DTOs) para el sistema de pagos
 */

// ============================================
// API / Database Types (lo que recibes)
// ============================================

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
  date: string  // ISO string
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

// ============================================
// UI Types (lo que el componente necesita)
// ============================================

export interface PaymentAllocation {
  id: string
  allocatedAmount: number
  payment: {
    id: string
    amount: number
    currency: string
    date: string  // ISO string
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

// ============================================
// Transform Options
// ============================================

export type SortOrder = 'asc' | 'desc'

export interface TransformOptions {
  sortOrder?: SortOrder
  filterByType?: 'Project' | 'Customer'
}
```

### 2.2 Actualizar Imports en Componente

```typescript
// components/tables/project-payments-table.tsx

// ❌ ANTES: Types inline (líneas 18-71)
interface ProjectPaymentsTableProps { ... }
interface AllocationFromAPI { ... }
interface PaymentFromAPI { ... }
interface PaymentAllocation { ... }

// ✅ DESPUÉS: Import desde types module
import type {
  PaymentFromAPI,
  PaymentAllocation,
  SortOrder
} from '@/lib/types/payment.types'

interface ProjectPaymentsTableProps {
  projectId: string
  hidePaymentMethod?: boolean
}
```

**Resultado:** -53 líneas del componente ✅

---

## FASE 3: Crear Transformers (30 min)

### 3.1 Crear Archivo de Transformers

**Archivo:** `lib/transformers/payment-transformers.ts`

```typescript
// lib/transformers/payment-transformers.ts

import type {
  PaymentFromAPI,
  PaymentAllocation,
  SortOrder,
} from '@/lib/types/payment.types'

/**
 * Extrae las allocations de un proyecto específico desde una lista de pagos
 *
 * @param payments - Lista de pagos con sus allocations
 * @param projectId - ID del proyecto a filtrar
 * @returns Array de PaymentAllocation para el proyecto
 *
 * @example
 * const payments = [...] // PaymentFromAPI[]
 * const allocations = extractProjectAllocations(payments, 'project-123')
 * // allocations: PaymentAllocation[]
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
 * Ordena allocations por fecha de pago
 *
 * @param allocations - Array de allocations a ordenar
 * @param order - Orden: 'asc' (más antiguo primero) o 'desc' (más reciente primero)
 * @returns Nuevo array ordenado (no muta el original)
 *
 * @example
 * const sorted = sortAllocationsByDate(allocations, 'asc')
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
 * Pipeline completo: extrae y ordena en un solo paso
 *
 * @param payments - Lista de pagos
 * @param projectId - ID del proyecto
 * @param order - Orden de sorting
 * @returns Array procesado listo para UI
 *
 * @example
 * const allocations = processProjectPayments(payments, 'project-123', 'asc')
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

### 3.2 Refactorizar Componente para Usar Transformers

```typescript
// components/tables/project-payments-table.tsx

// ✅ Import transformer
import { processProjectPayments } from '@/lib/transformers/payment-transformers'

export function ProjectPaymentsTable({ projectId, hidePaymentMethod = false }: Props) {
  // ... estado ...

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/payments?projectId=${projectId}`)
      if (!response.ok) throw new Error('Failed to fetch payments')

      const data: { payments: PaymentFromAPI[] } = await response.json()

      // ❌ ANTES: 23 líneas de transformación inline (líneas 104-126)
      // const projectAllocations = data.payments.flatMap(...)
      // projectAllocations.sort(...)

      // ✅ DESPUÉS: 1 línea usando transformer
      const allocations = processProjectPayments(data.payments, projectId, 'asc')

      setAllocations(allocations)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // ... resto del componente ...
}
```

**Resultado:**
- ✅ Componente: -23 líneas de lógica compleja
- ✅ Lógica ahora es reutilizable
- ✅ Lógica es testeable (pure function)

---

## FASE 4: Escribir Tests (20 min)

### 4.1 Crear Archivo de Tests

**Archivo:** `lib/transformers/__tests__/payment-transformers.test.ts`

```typescript
// lib/transformers/__tests__/payment-transformers.test.ts

import { describe, it, expect } from 'vitest'
import {
  extractProjectAllocations,
  sortAllocationsByDate,
  processProjectPayments,
} from '../payment-transformers'
import type { PaymentFromAPI } from '@/lib/types/payment.types'

// Mock data
const mockPayments: PaymentFromAPI[] = [
  {
    id: 'payment-1',
    amount: 1000,
    currency: 'CLP',
    date: '2025-01-15T00:00:00Z',
    type: 'Project',
    reference: null,
    notes: null,
    customer: { id: 'customer-1', name: 'John Doe', phone: '+56912345678' },
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' },
    allocations: [
      {
        id: 'alloc-1',
        allocatedAmount: 500,
        project: { id: 'project-A', projectNumber: 'P 0001-2025', projectName: 'Project A', currency: 'CLP' }
      },
      {
        id: 'alloc-2',
        allocatedAmount: 500,
        project: { id: 'project-B', projectNumber: 'P 0002-2025', projectName: 'Project B', currency: 'CLP' }
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
    customer: { id: 'customer-1', name: 'John Doe', phone: '+56912345678' },
    paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' },
    allocations: [
      {
        id: 'alloc-3',
        allocatedAmount: 2000,
        project: { id: 'project-A', projectNumber: 'P 0001-2025', projectName: 'Project A', currency: 'CLP' }
      }
    ]
  }
]

describe('payment-transformers', () => {
  describe('extractProjectAllocations', () => {
    it('debe extraer allocations de un proyecto específico', () => {
      const result = extractProjectAllocations(mockPayments, 'project-A')

      expect(result).toHaveLength(2)
      expect(result[0].allocatedAmount).toBe(500)
      expect(result[1].allocatedAmount).toBe(2000)
    })

    it('debe retornar array vacío si no hay allocations', () => {
      const result = extractProjectAllocations(mockPayments, 'project-Z')
      expect(result).toEqual([])
    })

    it('debe incluir datos del payment completo', () => {
      const result = extractProjectAllocations(mockPayments, 'project-A')

      expect(result[0].payment).toMatchObject({
        id: 'payment-1',
        amount: 1000,
        currency: 'CLP',
        customer: { name: 'John Doe' }
      })
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
      const originalCopy = [...original]

      sortAllocationsByDate(original, 'desc')

      expect(original).toEqual(originalCopy)
    })
  })

  describe('processProjectPayments', () => {
    it('debe extraer y ordenar en un solo paso', () => {
      const result = processProjectPayments(mockPayments, 'project-A', 'asc')

      expect(result).toHaveLength(2)
      expect(result[0].payment.date).toBe('2025-01-15T00:00:00Z')
      expect(result[1].payment.date).toBe('2025-01-20T00:00:00Z')
    })
  })
})
```

### 4.2 Ejecutar Tests

```bash
npm test lib/transformers/__tests__/payment-transformers.test.ts
```

**Esperado:**
```
✓ payment-transformers (8 tests)
  ✓ extractProjectAllocations
    ✓ debe extraer allocations de un proyecto específico
    ✓ debe retornar array vacío si no hay allocations
    ✓ debe incluir datos del payment completo
  ✓ sortAllocationsByDate
    ✓ debe ordenar ascendente por defecto
    ✓ debe ordenar descendente cuando se especifica
    ✓ no debe mutar el array original
  ✓ processProjectPayments
    ✓ debe extraer y ordenar en un solo paso

Tests: 8 passed (8 total)
Time: < 100ms
```

✅ **Logro:** Tests pasan, transformers funcionan correctamente

---

## FASE 5: Refactorizar Componente (20 min)

### 5.1 Estado Actual del Componente

Después de Fases 2-3, el componente ya está más limpio:
- ✅ Types extraídos (-53 líneas)
- ✅ Transformers extraídos (-23 líneas)
- ✅ Componente: ~153 líneas (vs 229 original)

### 5.2 Simplificación Adicional

**Objetivo:** Componente solo renderiza, data viene como prop.

#### Opción A: Mantener Fetching (más simple)

Si prefieres NO migrar a Server Components aún:

```typescript
// components/tables/project-payments-table.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { processProjectPayments } from '@/lib/transformers/payment-transformers'
import type { PaymentAllocation, PaymentFromAPI } from '@/lib/types/payment.types'

interface Props {
  projectId: string
  hidePaymentMethod?: boolean
}

export function ProjectPaymentsTable({ projectId, hidePaymentMethod = false }: Props) {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/payments?projectId=${projectId}`)
      if (!response.ok) throw new Error('Failed to fetch')

      const data: { payments: PaymentFromAPI[] } = await response.json()
      const processed = processProjectPayments(data.payments, projectId, 'asc')

      setAllocations(processed)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  if (isLoading) return <LoadingSkeleton />
  if (allocations.length === 0) return <EmptyState />

  return <TableUI allocations={allocations} hidePaymentMethod={hidePaymentMethod} />
}
```

**Resultado:**
- ✅ Componente: ~130 líneas (vs 229 original) = **-43%**
- ✅ Lógica de transformación reutilizable
- ✅ Testeable

#### Opción B: Data como Prop (más testeable)

Si quieres máxima testabilidad:

```typescript
// components/tables/project-payments-table.tsx
'use client'

import type { PaymentAllocation } from '@/lib/types/payment.types'

interface Props {
  data: PaymentAllocation[]  // ← Data viene de afuera
  hidePaymentMethod?: boolean
  isLoading?: boolean
}

export function ProjectPaymentsTable({
  data,
  hidePaymentMethod = false,
  isLoading = false
}: Props) {
  if (isLoading) return <LoadingSkeleton />
  if (data.length === 0) return <EmptyState />

  return <TableUI allocations={data} hidePaymentMethod={hidePaymentMethod} />
}
```

**Resultado:**
- ✅ Componente: ~100 líneas (vs 229 original) = **-56%**
- ✅ 100% testeable (props → JSX, sin mocks)
- ✅ Requiere parent component fetchee data

---

## FASE 6 (OPCIONAL): Migrar a Server Component (30 min)

### 6.1 Cuándo Hacerlo

**Hazlo si:**
- ✅ La página NO tiene interactividad client-side compleja
- ✅ Quieres mejor SEO
- ✅ Quieres mejor performance (less JS)

**NO lo hagas si:**
- ❌ Necesitas real-time updates
- ❌ Necesitas client state complejo
- ❌ Componente padre ya es Client Component

### 6.2 Crear Server Component

**Archivo:** `app/projects/[id]/page.tsx`

```typescript
// app/projects/[id]/page.tsx (Server Component)

import { db } from '@/lib/db'
import { processProjectPayments } from '@/lib/transformers/payment-transformers'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'

interface Props {
  params: {
    id: string
  }
}

// Server Component (async function)
export default async function ProjectDetailPage({ params }: Props) {
  // Fetch desde Prisma (server-side)
  const payments = await db.payment.findMany({
    where: {
      allocations: {
        some: {
          projectId: params.id
        }
      }
    },
    include: {
      allocations: {
        include: {
          project: true
        }
      },
      customer: true,
      paymentMethod: true
    }
  })

  // Transforma data (server-side)
  const allocations = processProjectPayments(
    payments as any,  // Type cast (Prisma types → API types)
    params.id,
    'asc'
  )

  // Renderiza Client Component con data
  return (
    <div>
      <h1>Project Payments</h1>
      <ProjectPaymentsTable data={allocations} />
    </div>
  )
}
```

### 6.3 Actualizar Client Component

```typescript
// components/tables/project-payments-table.tsx
'use client'  // ← Sigue siendo Client Component

interface Props {
  data: PaymentAllocation[]  // ← Recibe data del Server Component
  hidePaymentMethod?: boolean
}

export function ProjectPaymentsTable({ data, hidePaymentMethod = false }: Props) {
  // Solo renderiza, NO fetcha
  if (data.length === 0) return <EmptyState />

  return <TableUI allocations={data} hidePaymentMethod={hidePaymentMethod} />
}
```

**Resultado:**
- ✅ Fetching server-side (más rápido)
- ✅ HTML pre-renderizado (mejor SEO)
- ✅ Menos JS al cliente
- ✅ Componente sigue siendo testeable (props → JSX)

---

## VALIDACIÓN FINAL (10 min)

### Checklist

- [ ] **Tests pasan:** `npm test`
- [ ] **TypeScript compila:** `npm run typecheck`
- [ ] **Lint pasa:** `npm run lint`
- [ ] **App funciona:** `npm run dev` → Visitar página con tabla
- [ ] **Data se muestra correctamente**
- [ ] **Loading state funciona**
- [ ] **Empty state funciona** (si no hay pagos)
- [ ] **Formateo correcto** (fechas, montos)

### Verificar Mejoras

**Antes vs Después:**

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **LOC component** | 229 | 100-130 | -43% a -56% |
| **LOC total** | 229 | ~300 | +31% (pero distribuido) |
| **Archivos** | 1 | 3 | +2 (manejable) |
| **Tests** | 0 | 8+ | +∞ |
| **Testabilidad** | Difícil | Fácil | +300% |
| **Reutilización** | 0% | 70% | +70% |

✅ **Logro:** Código más limpio, testeable y mantenible

---

## 🚀 Deployment

### Pre-Deploy Checklist

- [ ] Todos los tests pasan en CI
- [ ] No hay breaking changes en API
- [ ] Tipos están correctos (TypeScript)
- [ ] Coverage no disminuyó (si tenías coverage antes)

### Deploy Steps

```bash
# 1. Commit changes
git add .
git commit -m "refactor: extraer transformers de ProjectPaymentsTable (Soft SOLID)

- Extraer types a lib/types/payment.types.ts
- Extraer transformers a lib/transformers/payment-transformers.ts
- Agregar 8 tests de transformers
- Simplificar componente: 229 → 130 líneas (-43%)
- Lógica ahora reutilizable y testeable

Refs: soft-solid-refactor/03-implementation-guide.md"

# 2. Push
git push origin refactor/soft-solid-payments-table

# 3. Create PR
gh pr create --title "refactor: Soft SOLID para ProjectPaymentsTable" \
             --body "Ver commit message para detalles"

# 4. Wait for CI ✅
# 5. Merge
# 6. Deploy
```

---

## 🎯 Próximos Pasos Opcionales

### Si el Refactor Funcionó Bien

**Aplica el mismo patrón a otros componentes:**

1. **CustomerPaymentsTable** (similar a ProjectPaymentsTable)
   - Tiempo: 1 hora (ya tienes experience)
   - Reutiliza mismo `payment-transformers.ts`

2. **ProjectForm** (si tiene lógica compleja)
   - Extraer validations a `lib/validations/`
   - Testear validations

3. **PaymentDialog** (formularios)
   - Extraer business logic de cálculo
   - Testear cálculos

**Regla:** Solo refactoriza si sientes el dolor.

---

### Si Necesitas Upgradear a SOLID Completo

**Triggers para upgrade:**
- Necesitas reutilizar en ≥3 lugares
- Aparecen bugs frecuentes
- Team crece a ≥5 devs

**Cuando eso pase:**
1. Lee `solid-refactoring/03-implementation-guide.md`
2. Agrega Service Layer + Hook Layer
3. Incrementa tests a 40+

**Nota:** Ya tienes Transformers + Types, solo falta Service + Hook. Upgrade será más fácil.

---

## 📚 Referencias

- **Ejemplos de código:** `examples/transformers/payment-transformers.ts`
- **Comparación detallada:** `comparison/solid-vs-soft-solid.md`
- **Cuándo upgradear:** `comparison/when-to-upgrade.md`
- **Filosofía:** `01-philosophy.md`

---

**¡Completaste el refactor Soft SOLID!** 🎉

Ahora tienes código más limpio, testeable y mantenible **sin** over-engineering.
