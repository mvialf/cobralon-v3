# Anti-Patrón: Lógica de Negocio en Componentes

## El Problema

Mezclar lógica de negocio compleja directamente en componentes hace el código difícil de testear, reutilizar y mantener.

## ❌ Incorrecto

```tsx
// components/project-card.tsx
export function ProjectCard({ project }) {
  // ❌ Lógica de negocio inline en componente
  const balance =
    project.total -
    project.payments.reduce((sum, p) => {
      if (p.allocations) {
        return (
          sum +
          p.allocations
            .filter((a) => a.projectId === project.id)
            .reduce((allocSum, alloc) => allocSum + alloc.allocatedAmount, 0)
        )
      }
      return sum
    }, 0)

  const status =
    balance === 0
      ? 'Pagado'
      : balance > project.total * 0.5
        ? 'Poco Pagado'
        : balance > 0
          ? 'En Proceso'
          : 'Completado'

  const priorityColor =
    project.windowsCount > 20
      ? 'red'
      : project.windowsCount > 10
        ? 'yellow'
        : project.squareMeters > 100
          ? 'orange'
          : 'green'

  return (
    <div>
      <h3>{project.name}</h3>
      <p>Balance: ${balance}</p>
      <p>Status: {status}</p>
      <span className={`badge-${priorityColor}`}>Prioridad</span>
    </div>
  )
}
```

**Problemas:**

- ❌ Lógica compleja mezclada con UI
- ❌ Imposible testear la lógica sin renderizar el componente
- ❌ No reutilizable (duplicarías en otros componentes)
- ❌ Difícil entender qué hace el componente

## ✅ Correcto: Extraer a Funciones Puras

```tsx
// lib/business-logic/project-calculations.ts

export function calculateProjectBalance(project: Project): number {
  const totalPaid = project.payments.reduce((sum, payment) => {
    if (!payment.allocations) return sum

    const projectAllocation = payment.allocations
      .filter((a) => a.projectId === project.id)
      .reduce((allocSum, alloc) => allocSum + alloc.allocatedAmount, 0)

    return sum + projectAllocation
  }, 0)

  return project.total - totalPaid
}

export function getProjectPaymentStatus(balance: number, total: number): string {
  if (balance === 0) return 'Pagado'
  if (balance > total * 0.5) return 'Poco Pagado'
  if (balance > 0) return 'En Proceso'
  return 'Completado'
}

export function getProjectPriority(project: Project): 'high' | 'medium' | 'low' {
  if (project.windowsCount > 20) return 'high'
  if (project.windowsCount > 10) return 'medium'
  if (project.squareMeters > 100) return 'medium'
  return 'low'
}

const PRIORITY_COLORS = {
  high: 'red',
  medium: 'yellow',
  low: 'green',
} as const

export function getPriorityColor(priority: ReturnType<typeof getProjectPriority>): string {
  return PRIORITY_COLORS[priority]
}

// components/project-card.tsx
import {
  calculateProjectBalance,
  getProjectPaymentStatus,
  getProjectPriority,
  getPriorityColor,
} from '@/lib/business-logic/project-calculations'

export function ProjectCard({ project }) {
  // ✅ Componente limpio, solo llama a funciones puras
  const balance = calculateProjectBalance(project)
  const status = getProjectPaymentStatus(balance, project.total)
  const priority = getProjectPriority(project)
  const priorityColor = getPriorityColor(priority)

  return (
    <div>
      <h3>{project.name}</h3>
      <p>Balance: ${balance}</p>
      <p>Status: {status}</p>
      <span className={`badge-${priorityColor}`}>Prioridad</span>
    </div>
  )
}
```

**Ventajas:**

- ✅ Lógica testeable de forma aislada
- ✅ Reutilizable en múltiples componentes
- ✅ Componente simple y legible
- ✅ Fácil cambiar lógica sin tocar UI

## Ejemplo: Tests de Funciones Puras

```typescript
// lib/business-logic/__tests__/project-calculations.test.ts
import { describe, it, expect } from 'vitest'
import {
  calculateProjectBalance,
  getProjectPaymentStatus,
  getProjectPriority,
} from '../project-calculations'

describe('calculateProjectBalance', () => {
  it('should calculate correct balance', () => {
    const project = {
      id: '1',
      total: 1000,
      payments: [
        {
          allocations: [{ projectId: '1', allocatedAmount: 400 }],
        },
        {
          allocations: [{ projectId: '1', allocatedAmount: 300 }],
        },
      ],
    }

    const balance = calculateProjectBalance(project)
    expect(balance).toBe(300) // 1000 - 700
  })

  it('should handle zero payments', () => {
    const project = { id: '1', total: 1000, payments: [] }
    const balance = calculateProjectBalance(project)
    expect(balance).toBe(1000)
  })
})

describe('getProjectPaymentStatus', () => {
  it('should return "Pagado" when balance is 0', () => {
    expect(getProjectPaymentStatus(0, 1000)).toBe('Pagado')
  })

  it('should return "Poco Pagado" when >50% pending', () => {
    expect(getProjectPaymentStatus(600, 1000)).toBe('Poco Pagado')
  })
})
```

## Cuándo Extraer Lógica

### ✅ Extrae cuando:

- La lógica es >10 líneas
- Se usa en 2+ componentes
- Es transformación pura (input → output, sin side effects)
- Quieres testearla fácilmente

### ❌ No extraigas cuando:

- Es simple map/filter (<5 líneas)
- Se usa solo 1 vez
- Es solo formateo (fechas, montos)

## Ejemplo: Custom Hook para Lógica con State

Si la lógica necesita state/effects, usa un custom hook:

```tsx
// hooks/use-project-search.ts
export function useProjectSearch(projects: Project[]) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: 'all', priority: 'all' })

  const filtered = useMemo(() => {
    return projects
      .filter((p) => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
          return false
        }
        if (filters.status !== 'all' && p.status !== filters.status) {
          return false
        }
        if (filters.priority !== 'all' && getProjectPriority(p) !== filters.priority) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const priorityA = getProjectPriority(a)
        const priorityB = getProjectPriority(b)
        return priorityA === 'high' ? -1 : priorityB === 'high' ? 1 : 0
      })
  }, [projects, search, filters])

  return { search, setSearch, filters, setFilters, filtered }
}

// components/projects-list.tsx
;('use client')

export function ProjectsList({ projects }) {
  const { search, setSearch, filters, setFilters, filtered } = useProjectSearch(projects)

  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {/* filters UI */}
      {filtered.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </>
  )
}
```

## Regla de Oro

> **Componentes presentan UI. Funciones/hooks manejan lógica de negocio.**

## Referencias

- [Pure Functions](https://react.dev/learn/keeping-components-pure)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Building Features Guide - Extract When It Hurts](../../../guides/building-features/core-principles/2-extract-when-it-hurts.md)

---

[← Anterior: Props Drilling](props-drilling.md) | [Volver al índice](README.md) | [Siguiente: Estilos Inline Complejos →](inline-complex-styles.md)
