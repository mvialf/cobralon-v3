# Business Logic Layer

Capa de lógica de negocio con validaciones, cálculos puros y configuración global.

---

## Estructura

```
lib/
├── validations/         → Zod schemas
│   ├── customer-validations.ts
│   ├── project-validations.ts
│   ├── payment-validations.ts  (2 schemas: 1:1 y 1:N)
│   ├── rut-validations.ts      (Chilean RUT)
│   └── project-status-validations.ts
├── business-logic/     → Pure functions
│   ├── project-balance.ts     (calc balance)
│   └── payment-fifo.ts        (FIFO allocation)
├── contexts/           → React Context
│   └── configuration-context.tsx (país, región, locale)
└── constants/          → Business constants
    ├── financial-constants.ts (DECIMAL_PRECISION, etc.)
    └── paises-config.ts       (países + regiones)
```

---

## Validaciones (Zod Schemas)

### Pattern Común

Todos los schemas siguen la misma estructura:

```typescript
// lib/validations/entity-validations.ts
import { z } from 'zod'

export const entitySchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido').optional(),
  amount: z.number().positive('Monto debe ser positivo'),
})

// Inferir TypeScript type del schema
export type EntityFormData = z.infer<typeof entitySchema>
```

**Uso en frontend:**

```typescript
// components/forms/entity-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entitySchema } from '@/lib/validations'

const form = useForm({
  resolver: zodResolver(entitySchema)
})
```

**Uso en backend:**

```typescript
// app/api/entity/route.ts
import { entitySchema } from '@/lib/validations'

export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
  const validation = entitySchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Usar validation.data (type-safe)
})
```

### Schemas Especiales

#### Payment Validations (Dual Schema)

```typescript
// lib/validations/payment-validations.ts

// Para pago 1:1 (a un proyecto)
export const paymentToProjectSchema = z.object({
  type: z.literal('Project'),
  allocations: z.array(allocationSchema).length(1), // Exactamente 1
  // ...
})

// Para pago 1:N (a cliente con múltiples proyectos)
export const paymentToCustomerSchema = z.object({
  type: z.literal('Customer'),
  allocations: z.array(allocationSchema).min(1), // 1 o más
  // ...
}).refine(
  (data) => {
    const sum = data.allocations.reduce((acc, a) => acc + a.allocatedAmount, 0)
    return Math.abs(sum - data.amount) <= 0.01 // Tolerancia 1 centavo
  },
  { message: 'Sum of allocations must equal payment amount' }
)
```

#### RUT Validation (Chile)

```typescript
// lib/validations/rut-validations.ts
export const rutSchema = z.string().refine(
  (rut) => validateRutChecksum(rut),
  { message: 'RUT inválido' }
)

function validateRutChecksum(rut: string): boolean {
  // Algoritmo módulo 11
  // ...
}
```

---

## Business Logic (Pure Functions)

### 1. Project Balance Calculator

```typescript
// lib/business-logic/project-balance.ts

export function calculateProjectBalance(
  projectTotal: number,
  allocations: { allocatedAmount: number }[]
): number {
  const totalPaid = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
  return projectTotal - totalPaid
}
```

**Características:**
- ✅ Pure function (sin side effects)
- ✅ Testeable fácilmente
- ✅ Reutilizable en frontend y backend

### 2. FIFO Payment Allocation

```typescript
// lib/business-logic/payment-fifo.ts

export function allocatePaymentFIFO(
  paymentAmount: number,
  projects: Array<{ id: string; balance: number }>
): Array<{ projectId: string; allocatedAmount: number }> {
  const allocations: Array<{ projectId: string; allocatedAmount: number }> = []
  let remaining = paymentAmount

  // Ordenar por fecha ASC (FIFO)
  const sortedProjects = projects.sort((a, b) => a.date - b.date)

  for (const project of sortedProjects) {
    if (remaining <= 0) break

    const amountToAllocate = Math.min(remaining, project.balance)

    allocations.push({
      projectId: project.id,
      allocatedAmount: amountToAllocate
    })

    remaining -= amountToAllocate
  }

  return allocations
}
```

**Uso:**

```typescript
// components/forms/payments/payment-to-customer-form.tsx
const handleFIFO = () => {
  const allocations = allocatePaymentFIFO(paymentAmount, projects)
  setAllocations(allocations)
}
```

---

## Contexts (React Context API)

### Configuration Context

```typescript
// lib/contexts/configuration-context.tsx
export const ConfigurationContext = createContext({
  pais: 'CL',
  region: '',
  ciudad: '',
  comuna: '',
  currency: 'CLP', // Derivado
  locale: 'es-CL', // Derivado
  setPais: () => {},
  // ...
})
```

**Hook:**

```typescript
// hooks/use-configuration.ts
export function useConfiguration() {
  return useContext(ConfigurationContext)
}
```

**Uso:**

```typescript
function CurrencyInput() {
  const { currency } = useConfiguration()
  // Usar currency para formateo
}
```

---

## Constants (Business Constants)

### Financial Constants

```typescript
// lib/constants/financial-constants.ts
export const FINANCIAL = {
  DECIMAL_PRECISION: 0.01, // 2 decimales
  TOLERANCE: 0.01, // Para comparaciones float
  DEFAULT_TAX_RATE: 0.19, // IVA 19%
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 999_999_999_999.99,
}
```

### Regional Config

```typescript
// lib/constants/paises-config.ts
export const PAISES_CONFIG = {
  CL: {
    nombre: 'Chile',
    currency: 'CLP',
    locale: 'es-CL',
    regiones: [
      {
        name: 'Metropolitana (RM)',
        code: 'RM',
        ciudades: ['Santiago'],
        comunas: ['Providencia', 'Las Condes', ...]
      }
    ]
  },
  // AR, MX, etc.
}
```

---

## Principios

### 1. Pure Functions First

Preferir funciones puras siempre que sea posible:

```typescript
// ✅ BIEN: Pure function
export function calculateTotal(subtotal: number, taxRate: number): number {
  return subtotal * (1 + taxRate)
}

// ❌ EVITAR: Side effects
export function calculateTotal(subtotal: number): number {
  globalTotal = subtotal * 1.19 // ❌ Modifica estado global
  return globalTotal
}
```

### 2. Validation Everywhere

- Frontend: UX inmediato
- Backend: Seguridad y consistencia

Mismo schema Zod en ambos lados.

### 3. Business Constants Centralizados

No hardcodear valores:

```typescript
// ❌ EVITAR
const taxRate = 0.19

// ✅ BIEN
import { FINANCIAL } from '@/lib/constants'
const taxRate = FINANCIAL.DEFAULT_TAX_RATE
```

---

## Ver También

- [API Layer](api-layer.md) - Cómo se usan las validaciones
- [05. Decisiones Técnicas](../05-technical-decisions/) - Razones de diseño

**Última actualización:** 2025-10-30
