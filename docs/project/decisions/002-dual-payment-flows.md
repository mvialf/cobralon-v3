# ADR-002: Dual Payment Flows (Project vs Customer)

## Estado

**Aceptado** | **Fecha:** 2025-10-22

## Quick Start (Cómo Usar)

> **💡 TL;DR:** Dos flujos especializados: `PaymentToProjectForm` (simple, 1:1) y `PaymentToCustomerForm` (avanzado, 1:N).

```typescript
// Flow A: Pago a proyecto (caso común 90%)
import { PaymentToProjectForm } from '@/components/forms/payments/payment-to-project-form'

// UI simplificada: [Proyecto dropdown] → [Monto] → [Método] → Submit
<PaymentToProjectForm />

// Flow B: Pago a cliente (caso avanzado 10%)
import { PaymentToCustomerForm } from '@/components/forms/payments/payment-to-customer-form'

// UI avanzada: [Cliente dropdown] → [Tabla asignación multi-proyecto] → Submit
<PaymentToCustomerForm />
```

**Schemas Zod:**
```typescript
// lib/validations/payment-validations.ts
export const paymentToProjectSchema = z.object({
  projectId: z.string().cuid(),
  amount: z.number().positive(),
  // ... campos simplificados
})

export const paymentToCustomerSchema = z.object({
  customerId: z.string().cuid(),
  allocations: z.array(z.object({
    projectId: z.string().cuid(),
    allocatedAmount: z.number().positive()
  }))
  // ... validación SUM(allocations) === amount
})
```

**Archivos clave:**
- `components/forms/payments/payment-to-project-form.tsx` - Flow A (simple)
- `components/forms/payments/payment-to-customer-form.tsx` - Flow B (avanzado)
- `app/api/payments/route.ts:POST` - Maneja ambos tipos

---

## Contexto

El sistema necesitaba soportar dos casos de uso de pagos claramente diferenciados:

**Caso común (90% de pagos):**

- Cliente paga a UN proyecto específico
- Ejemplo: "Cliente paga $500,000 como anticipo para Proyecto A"
- Flujo simple: Seleccionar proyecto → Ingresar monto → Done

**Caso avanzado (10% de pagos):**

- Cliente hace un pago que cubre MÚLTIPLES proyectos simultáneamente
- Ejemplo: "Cliente paga $100,000 para cubrir saldos de 3 proyectos ($40k, $35k, $25k)"
- Flujo complejo: Seleccionar cliente → Distribuir monto entre N proyectos

La decisión de diseño UX era: **¿Implementar UN flujo universal que soporte ambos casos, o DOS flujos especializados optimizados para cada caso?**

### Criterios de decisión

1. **Usabilidad:** ¿Cuántos pasos requiere el caso común (90%)?
2. **Flexibilidad:** ¿Soporta el caso avanzado (10%) sin workarounds?
3. **Mantenibilidad:** ¿Cuánto código duplicado?
4. **Error prevention:** ¿Qué tan fácil es cometer errores?
5. **ROI:** ¿El esfuerzo extra justifica la mejora de UX?

## Decisión

Implementar **DOS flujos de pago especializados** con schemas Zod, componentes React y endpoints API separados:

### Flow A - "Pago a Proyecto" (1:1 simplificado)

**Para:** Caso común (90%) - Pago directo a un proyecto específico

```typescript
// Schema: lib/validations/payment-validations.ts
export const paymentToProjectSchema = z.object({
  projectId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.string(),
  date: z.date(),
  paymentMethodId: z.string().cuid(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  selectedInstallments: z.number().int().min(1).max(12).optional(),
})

// Componente: components/forms/payments/payment-to-project-form.tsx
// UI: [Proyecto dropdown] → [Monto input] → [Método dropdown] → Submit
```

**Características:**

- ✅ UI simplificada: Solo 3 campos principales
- ✅ Cliente derivado automáticamente del proyecto
- ✅ Currency derivada del proyecto
- ✅ Balance pre-filled si es pago completo
- ✅ Crea automáticamente 1 `PaymentAllocation` al submitir

### Flow B - "Pago a Cliente" (1:N avanzado)

**Para:** Caso avanzado (10%) - Pago distribuido entre múltiples proyectos

```typescript
// Schema: lib/validations/payment-validations.ts
export const paymentToCustomerSchema = z
  .object({
    customerId: z.string().cuid(),
    amount: z.number().positive(),
    currency: z.string(),
    date: z.date(),
    paymentMethodId: z.string().cuid(),
    reference: z.string().optional(),
    notes: z.string().optional(),
    selectedInstallments: z.number().int().min(1).max(12).optional(),
    allocations: z
      .array(
        z.object({
          projectId: z.string().cuid(),
          allocatedAmount: z.number().positive(),
        })
      )
      .min(1),
  })
  .refine(
    (data) => {
      const sum = data.allocations.reduce((s, a) => s + a.allocatedAmount, 0)
      return Math.abs(sum - data.amount) < 0.01 // Tolerance para floats
    },
    { message: 'Sum of allocations must equal payment amount' }
  )

// Componente: components/forms/payments/payment-to-customer-form.tsx
// UI: [Cliente dropdown] → [Monto total] → [Distribuir: Manual o FIFO] → Submit
```

**Características:**

- ✅ UI avanzada: Tabla de proyectos con inputs de asignación
- ✅ Validación visual: SUM(allocations) === amount
- ✅ **Algoritmo FIFO automático:** Asignación inteligente con 1 click
- ✅ Edición manual: Usuario puede ajustar distribución
- ✅ Crea N `PaymentAllocation` records al submitir

### Algoritmo FIFO (Auto-distribución)

```typescript
// lib/business-logic/payment-fifo.ts
export function distributeFIFO(
  projects: Array<{ id: string; balance: Decimal; date: Date }>,
  totalAmount: Decimal
): Array<{ projectId: string; allocatedAmount: Decimal }> {
  const sorted = projects.sort((a, b) => a.date.getTime() - b.date.getTime())
  const allocations = []
  let remaining = totalAmount

  for (const project of sorted) {
    if (remaining.isZero()) break

    const toAllocate = Decimal.min(remaining, project.balance)
    allocations.push({
      projectId: project.id,
      allocatedAmount: toAllocate,
    })

    remaining = remaining.minus(toAllocate)
  }

  return allocations
}

// Ejemplo:
// Proyectos:
// - P1 (2023-01-01): balance $30k
// - P2 (2023-02-01): balance $50k
// - P3 (2023-03-01): balance $40k
//
// Pago: $100k
//
// FIFO result:
// - P1: $30k (completo)
// - P2: $50k (completo)
// - P3: $20k (parcial, quedan $20k de balance)
```

## Alternativas Consideradas

### Alternativa 1: Flujo Único "Customer" (con allocations manuales SIEMPRE)

```
UI mockup:
┌─────────────────────────────────────┐
│ Cliente: [Juan Pérez ▼]             │
│ Monto total: $50,000                │
│                                     │
│ Distribuir en proyectos:            │
│ ☑ Proyecto A: $______              │  ← Usuario debe llenar SIEMPRE
│ ☐ Proyecto B: $______              │
│ ☐ Proyecto C: $______              │
│                                     │
│ Total asignado: $0 / $50,000       │
│ [Guardar]                           │
└─────────────────────────────────────┘
```

**Pros:**

- ✅ Un solo código path (menos duplicación)
- ✅ Un solo schema Zod
- ✅ Un solo componente React

**Contras CRÍTICOS (por qué NO):**

- ❌ **UX POBRE para caso común (90%):**
  - Caso: Usuario quiere pagar $50k a Proyecto A
  - Pasos requeridos:
    1. Seleccionar cliente
    2. Ver lista de todos los proyectos del cliente
    3. Checkear solo Proyecto A
    4. Escribir manualmente $50,000 en el input
  - **4 pasos** cuando debería ser **2 pasos** (proyecto + monto)

- ❌ **Frustración del usuario:**
  - "¿Por qué me muestra TODOS los proyectos si solo quiero pagar UNO?"
  - "¿Por qué tengo que escribir el monto 2 veces?" (total + allocation)

- ❌ **Más propenso a errores:**
  - Olvidar checkear el proyecto correcto
  - Escribir mal el monto en el input de allocation
  - Total ≠ SUM(allocations) → Error de validación → Frustración

**Cuantificación del impacto:**

- Caso común (90%): **+2 pasos extras** → +30 segundos por pago
- Si hay 20 pagos/día: 30s × 20 × 0.9 = **540 segundos** = **9 minutos/día perdidos**
- En 1 mes (20 días): **180 minutos** = **3 horas/mes**

---

### Alternativa 2: Flujo Único "Project" (1:1 SIEMPRE)

```
UI mockup:
┌─────────────────────────────────────┐
│ Proyecto: [Proyecto A ▼]            │
│ Monto: $50,000                      │
│ Método de pago: [Transferencia ▼]  │
│ [Guardar]                           │
└─────────────────────────────────────┘
```

**Pros:**

- ✅ **UX perfecta para caso común:** 2 dropdowns + 1 input = done
- ✅ Muy simple
- ✅ Difícil cometer errores

**Contras CRÍTICOS (por qué NO):**

- ❌ **NO SOPORTA caso avanzado (10%):**
  - Caso: Cliente paga $100k para 3 proyectos
  - Workaround forzado: Crear 3 pagos separados manualmente
  - Problemas:
    - Confuso: **1 pago bancario real** = **3 registros en sistema**
    - Sin forma de linkear que son el MISMO pago
    - No puedes hacer query "dame todos los payments del pago bancario X"

- ❌ **Auditoría confusa:**
  - Reporte de pagos muestra 3 filas en lugar de 1
  - Balance total incorrecto (cuenta el mismo pago 3 veces)

---

### Alternativa 3: DUAL FLOW (SELECCIONADO)

**Ver sección "Decisión" arriba para detalles completos.**

**Pros FUNDAMENTALES:**

- ✅ **UX optimizada para AMBOS casos:**
  - Caso común (90%): 2 clicks + 1 input = done (Flow A)
  - Caso complejo (10%): UI avanzada con validación visual (Flow B)

- ✅ **Cada flujo tiene exactamente los campos que necesita:**
  - Flow A: No muestra campos irrelevantes (allocations table)
  - Flow B: No pide proyecto (derivado de cliente)

- ✅ **Algoritmo FIFO opcional:**
  - Botón "Auto-distribuir" en Flow B
  - Usuario puede override si quiere

- ✅ **Code clarity:**
  - Schema name indica uso claro: `paymentToProjectSchema` vs `paymentToCustomerSchema`
  - Form name indica uso: `PaymentToProjectForm` vs `PaymentToCustomerForm`

**Contras ACEPTABLES:**

- ⚠️ **Duplicación de código:**
  - 2 componentes React (~200 líneas cada uno)
  - 2 schemas Zod (~50 líneas cada uno)
  - 2 dialogs separados

  **Mitigación:** Helpers compartidos reducen duplicación real

  ```typescript
  // lib/validations/payment-validations.ts
  export function paymentToProjectToPayload(data: PaymentToProjectForm): PaymentCreatePayload {
    // Convierte form 1:1 a payload API con 1 allocation automática
  }

  export function paymentToCustomerToPayload(data: PaymentToCustomerForm): PaymentCreatePayload {
    // Convierte form 1:N a payload API con N allocations
  }
  ```

- ⚠️ **Mantenimiento:**
  - Cambios en Payment model requieren actualizar ambos flows

  **Mitigación:** Tests e2e validan ambos flujos (detectan inconsistencias)

## Consecuencias

### Positivas ✅

1. **UX Premium: Tiempo ahorrado cuantificado**

   **Baseline (Flujo único "Customer"):**
   - Caso común (90%): 4 pasos
   - Tiempo promedio: 60 segundos

   **Con Dual Flow:**
   - Caso común (90%): 2 pasos
   - Tiempo promedio: 30 segundos
   - **Ahorro: 30 segundos por pago**

   **ROI anual:**
   - Pagos/día: 20
   - Días/año: 240 (20 días/mes × 12 meses)
   - Total pagos/año: 4,800
   - Pagos caso común (90%): 4,320
   - Tiempo ahorrado: 4,320 × 30s = **129,600 segundos** = **36 horas/año**

   **Costo de implementación:**
   - Desarrollo inicial: ~2 horas
   - Mantenimiento extra/año: ~30 min

   **ROI:** 36 horas ahorradas / 2.5 horas invertidas = **14.4x retorno**

2. **Menos Errores de Usuario**

   Flow A (Project):
   - ✅ Cliente derivado automáticamente → No puede equivocarse
   - ✅ Currency derivada automáticamente → No hay mismatch
   - ✅ Balance sugerido → Menos typos en monto

   Flow B (Customer):
   - ✅ Validación visual en tiempo real → `SUM(allocations) === amount`
   - ✅ Algoritmo FIFO → Elimina cálculos manuales erróneos

3. **Extensible**

   Fácil agregar Flow C si surge nuevo caso:
   - Ejemplo futuro: "Pago recurrente" (subscription-style)
   - Solo agregar: `paymentRecurringSchema` + `PaymentRecurringForm`

4. **Code Clarity**

   Nombres auto-documentan propósito:

   ```typescript
   // Lees el schema y sabes EXACTAMENTE qué hace
   paymentToProjectSchema // → Pago a 1 proyecto
   paymentToCustomerSchema // → Pago a cliente (N proyectos)
   ```

### Negativas / Trade-offs ⚠️

1. **Code Duplication**

   **Trade-off:** ~400 líneas de código duplicado.

   **Análisis de duplicación real:**

   ```
   Componentes:
   - PaymentToProjectForm.tsx: 187 líneas
   - PaymentToCustomerForm.tsx: 214 líneas
   Total: 401 líneas

   Duplicación real:
   - Campos comunes (amount, date, method): ~80 líneas (20%)
   - Lógica específica (allocations, FIFO): ~320 líneas (80% único)
   ```

   **Mitigación:** Helpers compartidos

   ```typescript
   // Compartido entre ambos flows
   const commonFields = {
     amount: z.number().positive(),
     currency: z.string(),
     date: z.date(),
     paymentMethodId: z.string().cuid(),
     // ...
   }

   // Reutilizado
   export const paymentToProjectSchema = z.object({
     ...commonFields,
     projectId: z.string().cuid(),
   })

   export const paymentToCustomerSchema = z.object({
     ...commonFields,
     customerId: z.string().cuid(),
     allocations: z.array(/* ... */),
   })
   ```

2. **Decisión de Routing**

   **Trade-off:** Usuario debe elegir qué flujo usar.

   **Mitigación:** Botones claros con iconos y descripciones

   ```tsx
   // app/payments/page.tsx
   <div className="flex gap-4">
     <Button onClick={openProjectDialog}>
       <FileText className="mr-2 h-4 w-4" />
       Pago a Proyecto
       <span className="text-xs text-muted-foreground">Pago directo a un proyecto</span>
     </Button>

     <Button onClick={openCustomerDialog}>
       <Users className="mr-2 h-4 w-4" />
       Pago a Cliente
       <span className="text-xs text-muted-foreground">Distribuir entre múltiples proyectos</span>
     </Button>
   </div>
   ```

3. **Testing Overhead**

   **Trade-off:** Doble de tests (Flow A + Flow B).

   **Justificación:** Tests previenen bugs costosos
   - Bug en Flow A: Afecta 90% de pagos → **Alto impacto**
   - Bug en Flow B: Rompe distribución multi-proyecto → **Datos incorrectos**

## Referencias

### Código

- **Schemas Zod:**
  - [lib/validations/payment-validations.ts:151-189](../../../lib/validations/payment-validations.ts#L151-L189) - `paymentToProjectSchema`
  - [lib/validations/payment-validations.ts:191-207](../../../lib/validations/payment-validations.ts#L191-L207) - `paymentToCustomerSchema`

- **Forms:**
  - [components/forms/payments/payment-to-project-form.tsx](../../../components/forms/payments/payment-to-project-form.tsx) - Flow A
  - [components/forms/payments/payment-to-customer-form.tsx](../../../components/forms/payments/payment-to-customer-form.tsx) - Flow B

- **Dialogs:**
  - [components/dialogs/payments/payment-to-project-dialog.tsx](../../../components/dialogs/payments/payment-to-project-dialog.tsx)
  - [components/dialogs/payments/payment-to-customer-dialog.tsx](../../../components/dialogs/payments/payment-to-customer-dialog.tsx)

- **Business Logic:**
  - [lib/business-logic/payment-fifo.ts](../../../lib/business-logic/payment-fifo.ts) - Algoritmo FIFO de asignación automática

- **API Validations:**
  - [app/api/payments/route.ts:183-194](../../../app/api/payments/route.ts#L183-L194) - Validación de tipo vs allocations count

### Documentación

- [ADR-001: PaymentAllocation Architecture](001-payment-allocation-architecture.md) - Arquitectura N:M que soporta dual flows
- [docs/project/architecture.md](../architecture.md#flujos-de-negocio) - Diagramas de flujos de pago
- [docs/project/implementation/2025-current.md](../implementation/2025-current.md) - Implementación #20: Sistema Completo de Payments

### External References

- [React Hook Form - Dynamic Forms](https://react-hook-form.com/advanced-usage#DynamicForm) - Manejo de allocations dinámicas
- [Zod - Refine](https://zod.dev/?id=refine) - Validación custom `SUM(allocations) === amount`

## Notas Adicionales

### Backend Validation (Defense in Depth)

Aunque los schemas Zod validan en frontend, **backend TAMBIÉN valida** para seguridad:

```typescript
// app/api/payments/route.ts:183-194
const { type, allocations } = validatedData

// Validación 1: Type vs count
if (type === 'Project' && allocations.length !== 1) {
  return NextResponse.json(
    { error: 'Project payment must have exactly 1 allocation' },
    { status: 400 }
  )
}

if (type === 'Customer' && allocations.length < 1) {
  return NextResponse.json(
    { error: 'Customer payment must have at least 1 allocation' },
    { status: 400 }
  )
}

// Validación 2: Sum matching (con tolerance para floats)
const sum = allocations.reduce((s, a) => s + a.allocatedAmount, 0)
if (Math.abs(sum - amount) > 0.01) {
  return NextResponse.json(
    { error: `Allocations sum (${sum}) must equal payment amount (${amount})` },
    { status: 400 }
  )
}
```

**Razón:** Frontend puede ser bypasseado (curl, Postman). Backend es source of truth.

### Future Enhancement: Flow C - Recurring Payments

Si en el futuro se necesita pagos recurrentes:

```typescript
export const paymentRecurringSchema = z.object({
  projectId: z.string().cuid(),
  amount: z.number().positive(),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  startDate: z.date(),
  endDate: z.date().optional(),
  // ...
})
```

Migración sería incremental (no breaking change). Dual flow permite agregar N flows sin refactor.

---

**Última actualización:** 2025-10-25
