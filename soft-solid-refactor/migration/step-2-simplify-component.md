# 🧹 Paso 2: Simplificar Componente

**Duración:** 30 minutos
**Dificultad:** Baja
**Objetivo:** Componente solo renderiza, data viene como prop

---

## ¿Por Qué Este Paso?

**Problema actual:**
- Componente todavía tiene fetching (useState, useEffect, fetch)
- Difícil testear (necesitas mockear fetch)
- No reutilizable (acoplado a API específica)

**Solución:**
- Componente recibe data como prop
- Fetching se hace en parent (Server Component o custom hook)
- 100% testeable (props → JSX)

---

## Pre-requisitos

- [ ] Completaste Paso 1 (transformers extraídos)
- [ ] Tests de transformers pasan
- [ ] Git branch limpio

---

## Dos Opciones

### Opción A: Mantener Client-Side Fetching (más simple)

Si NO quieres cambiar mucho:
- Componente sigue siendo client-only
- Fetching queda en componente (simplificado con transformers)

**Ganancia:** Menor (-30% LOC)
**Esfuerzo:** 15 min

---

### Opción B: Data como Prop (más testeable)

Si quieres máxima testabilidad:
- Componente recibe data procesada
- Parent hace fetching (Server Component o custom hook)

**Ganancia:** Mayor (-56% LOC)
**Esfuerzo:** 30 min

**Recomendado:** Opción B (seguimos esta guía)

---

## Paso 2.1: Refactorizar Componente (15 min)

### Antes

```typescript
// components/tables/project-payments-table.tsx
'use client'

interface Props {
  projectId: string
  hidePaymentMethod?: boolean
}

export function ProjectPaymentsTable({ projectId, hidePaymentMethod }: Props) {
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/payments?projectId=${projectId}`)
      const data = await response.json()
      const allocations = processProjectPayments(data.payments, projectId, 'asc')
      setAllocations(allocations)
    } catch (error) {
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

  return <TableUI allocations={allocations} />
}
```

---

### Después

```typescript
// components/tables/project-payments-table.tsx
'use client'

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
- ✅ -60 líneas (fetching removido)
- ✅ Componente: 153 → 93 líneas
- ✅ 100% testeable (props → JSX)

---

## Paso 2.2: Crear Server Component (15 min)

### Opción B.1: Server Component (Recomendado)

**Archivo:** `app/projects/[id]/payments-section.tsx` (ejemplo)

```typescript
// app/projects/[id]/payments-section.tsx (Server Component)

import { db } from '@/lib/db'
import { processProjectPayments } from '@/lib/transformers/payment-transformers'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'

interface Props {
  projectId: string
}

// Server Component (async function, NO "use client")
export async function PaymentsSection({ projectId }: Props) {
  // Fetch desde Prisma (server-side)
  const payments = await db.payment.findMany({
    where: {
      allocations: {
        some: {
          projectId: projectId
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
    payments as any,  // Type cast
    projectId,
    'asc'
  )

  // Renderiza Client Component con data
  return <ProjectPaymentsTable data={allocations} />
}
```

**Uso:**

```typescript
// app/projects/[id]/page.tsx

import { PaymentsSection } from './payments-section'

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Project Detail</h1>
      {/* Server Component renderiza */}
      <PaymentsSection projectId={params.id} />
    </div>
  )
}
```

**Ventajas:**
- ✅ Fetching server-side (más rápido)
- ✅ HTML pre-renderizado (SEO)
- ✅ Menos JS al cliente

---

### Opción B.2: Custom Hook (Si necesitas client-side)

**Archivo:** `hooks/use-project-payments.ts`

```typescript
// hooks/use-project-payments.ts

import { useState, useEffect, useCallback } from 'react'
import { processProjectPayments } from '@/lib/transformers/payment-transformers'
import type { PaymentAllocation, PaymentFromAPI } from '@/lib/types/payment.types'
import { toast } from 'sonner'

export function useProjectPayments(projectId: string) {
  const [data, setData] = useState<PaymentAllocation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/payments?projectId=${projectId}`)
      if (!response.ok) throw new Error('Failed to fetch')

      const apiData: { payments: PaymentFromAPI[] } = await response.json()
      const allocations = processProjectPayments(apiData.payments, projectId, 'asc')

      setData(allocations)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      toast.error('Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return { data, isLoading, error, refetch: fetchPayments }
}
```

**Uso:**

```typescript
// app/projects/[id]/payments-client-section.tsx
'use client'

import { useProjectPayments } from '@/hooks/use-project-payments'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'

export function PaymentsClientSection({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useProjectPayments(projectId)

  if (error) return <ErrorState error={error} />

  return <ProjectPaymentsTable data={data} isLoading={isLoading} />
}
```

**Ventajas:**
- ✅ Hook reutilizable
- ✅ Separa fetching de rendering
- ⚠️ Client-side (más lento que Server Component)

---

## Validación

### Checklist

- [ ] Componente recibe data como prop
- [ ] Componente NO tiene useState/useEffect/fetch
- [ ] Parent (Server Component o Hook) hace fetching
- [ ] App funciona correctamente
- [ ] Data se muestra igual que antes

### Verificar Mejoras

**Antes (Paso 1):**
- Componente: 153 líneas
- Fetching: Inline en componente
- Testeable: Parcial (necesita mock fetch)

**Después (Paso 2):**
- Componente: 93 líneas (-39%)
- Fetching: En parent (Server Component o Hook)
- Testeable: 100% (props → JSX)

**Ganancia total vs original:**
- Componente: 229 → 93 líneas (**-59%**)
- Reutilización: 0% → 70%
- Testabilidad: 2/10 → 8/10

---

## Tests del Componente

### Test Simple (Props → JSX)

```typescript
// components/tables/__tests__/project-payments-table.test.tsx

import { render, screen } from '@testing-library/react'
import { ProjectPaymentsTable } from '../project-payments-table'
import type { PaymentAllocation } from '@/lib/types/payment.types'

const mockData: PaymentAllocation[] = [
  {
    id: 'alloc-1',
    allocatedAmount: 1000,
    payment: {
      id: 'payment-1',
      amount: 1000,
      currency: 'CLP',
      date: '2025-01-15T00:00:00Z',
      type: 'Project',
      notes: null,
      customer: { id: 'customer-1', name: 'John Doe', phone: '+56912345678' },
      paymentMethod: { id: 'method-1', name: 'Efectivo', icon: 'banknote' }
    }
  }
]

describe('ProjectPaymentsTable', () => {
  it('debe renderizar tabla con data', () => {
    render(<ProjectPaymentsTable data={mockData} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
  })

  it('debe mostrar empty state cuando no hay data', () => {
    render(<ProjectPaymentsTable data={[]} />)

    expect(screen.getByText(/no payments/i)).toBeInTheDocument()
  })

  it('debe mostrar loading state', () => {
    render(<ProjectPaymentsTable data={[]} isLoading={true} />)

    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })
})
```

**Ejecutar:**
```bash
npm test components/tables/__tests__/project-payments-table.test.tsx
```

**Esperado:**
```
✓ ProjectPaymentsTable (3 tests)

Tests: 3 passed
Time: <50ms
```

---

## Troubleshooting

### Error: "Cannot use async function in client component"

**Solución:**
```typescript
// ❌ INCORRECTO: async en Client Component
'use client'
export default async function MyComponent() { ... }

// ✅ CORRECTO: async solo en Server Component
// (no tiene "use client")
export default async function MyComponent() { ... }
```

---

### Data no se muestra

**Solución:**
```typescript
// Verificar que parent pasa data correctamente
<ProjectPaymentsTable data={allocations} />
//                    ^^^^^^^^^^^^^^^^^^^^
// Debe ser array de PaymentAllocation
```

---

### Tests fallan: "data is undefined"

**Solución:**
```typescript
// Siempre pasa data en tests (no undefined)
render(<ProjectPaymentsTable data={mockData || []} />)
```

---

## Resultado Final

### Componente Refactorizado

**LOC:**
- Original: 229 líneas
- Después Paso 1: 153 líneas (-33%)
- Después Paso 2: 93 líneas (-59%)

**Responsabilidades:**
- Original: 6 (fetching, transformación, estado, rendering, error handling, loading)
- Después: 1 (rendering)

**Testabilidad:**
- Original: 2/10 (necesita mockear 5 cosas)
- Después: 8/10 (solo props → JSX)

---

## Próximos Pasos

✅ **Completaste Paso 2: Simplificar Componente**

**Has terminado el refactor Soft SOLID básico.**

### Opcionales

1. **Aplicar mismo patrón a otros componentes**
   - CustomerPaymentsTable
   - Otros componentes con fetching inline

2. **Agregar más tests**
   - Tests de edge cases
   - Tests de formatting

3. **Upgradear a SOLID completo** (solo si necesitas)
   - Ver `comparison/when-to-upgrade.md`
   - Triggers: reutilización ≥5 lugares, team ≥5 devs, etc.

---

**¡Felicidades! 🎉**

Tienes código más limpio, testeable y mantenible sin over-engineering.
