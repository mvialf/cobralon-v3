# ADR-001: PaymentAllocation Architecture (N:M Intermediate Table)

## Estado

**Aceptado**

**Fecha:** 2025-10-21

## Contexto

El sistema de gestión de proyectos y pagos necesitaba soportar dos casos de uso fundamentales:

1. **Caso común (90%):** Cliente paga a UN proyecto específico
   - Ejemplo: Cliente paga $500,000 como anticipo para Proyecto A

2. **Caso avanzado (10%):** Cliente hace un pago que cubre MÚLTIPLES proyectos
   - Ejemplo: Cliente paga $100,000 para cubrir saldos de 3 proyectos diferentes ($40k, $35k, $25k)

La decisión arquitectural era: **¿Cómo modelar la relación entre Payment y Project?**

Requisitos identificados:

- ✅ Flexibilidad: Soportar 1 pago → 1 proyecto Y 1 pago → N proyectos
- ✅ Auditoría: Saber exactamente cuánto de cada pago fue asignado a cada proyecto
- ✅ Balance calculation: Calcular cuánto debe cada proyecto (`total - SUM(pagos)`)
- ✅ Integridad referencial: Garantizar que no haya pagos apuntando a proyectos inexistentes
- ✅ Type-safety: Queries type-safe con Prisma

## Decisión

Implementar una **tabla intermedia N:M** llamada `PaymentAllocation` que modela la relación entre `Payment` y `Project`, almacenando el monto asignado (`allocatedAmount`) por cada asignación.

### Modelo Prisma

```prisma
model PaymentAllocation {
  id              String  @id @default(cuid())
  paymentId       String
  projectId       String
  allocatedAmount Decimal @db.Decimal(12, 2)

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id])

  @@unique([paymentId, projectId])
  @@index([paymentId])
  @@index([projectId])
  @@map("payment_allocations")
}

model Payment {
  id String @id @default(cuid())
  type String  // "Project" | "Customer"
  amount Decimal @db.Decimal(12, 2)
  currency String
  date DateTime
  customerId String

  allocations PaymentAllocation[]
  // ...
}

model Project {
  id String @id @default(cuid())
  projectNumber String
  total Decimal @db.Decimal(12, 2)
  customerId String

  paymentAllocations PaymentAllocation[]
  // ...
}
```

### Ejemplo de uso

```typescript
// Caso 1: Pago a 1 proyecto
const payment = await prisma.payment.create({
  data: {
    type: 'Project',
    amount: 50000,
    currency: 'CLP',
    customerId: 'abc',
    allocations: {
      create: [
        {
          projectId: 'project-1',
          allocatedAmount: 50000,
        },
      ],
    },
  },
})

// Caso 2: Pago a múltiples proyectos
const payment = await prisma.payment.create({
  data: {
    type: 'Customer',
    amount: 100000,
    currency: 'CLP',
    customerId: 'abc',
    allocations: {
      create: [
        { projectId: 'project-1', allocatedAmount: 40000 },
        { projectId: 'project-2', allocatedAmount: 35000 },
        { projectId: 'project-3', allocatedAmount: 25000 },
      ],
    },
  },
})

// Balance calculation
const project = await prisma.project.findUnique({
  where: { id: 'project-1' },
  include: { paymentAllocations: true },
})

const balance =
  project.total - project.paymentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
```

## Alternativas Consideradas

### Alternativa 1: FK Directo (Payment.projectId)

```prisma
model Payment {
  id String @id
  projectId String  // ❌ FK directo
  amount Decimal

  project Project @relation(fields: [projectId], references: [id])
}
```

**Pros:**

- ✅ Simplicidad máxima (1 campo, 1 JOIN)
- ✅ Performance óptima (menos queries, menos joins)
- ✅ Código más simple (sin validaciones de SUM)

**Contras CRÍTICOS:**

- ❌ **Inflexibilidad total:** 1 pago = 1 proyecto SIEMPRE
- ❌ **No soporta caso real:** Cliente paga $100,000 para 3 proyectos → IMPOSIBLE
- ❌ **Workaround feo:** Crear 3 Payments separados (confunde auditoría: 1 pago bancario = 3 registros)
- ❌ **Balance incalculable:** Si divides manualmente el pago en 3, no sabes cuánto fue para cada proyecto

**Por qué NO:** Casos de uso avanzados (10%) son COMUNES en gestión de proyectos. FK directo no es viable para negocio real.

---

### Alternativa 2: JSON Field (Payment.allocations: JSON[])

```prisma
model Payment {
  id String @id
  amount Decimal
  allocations Json  // ❌ Array JSON
  // Ejemplo: [{"projectId": "abc", "amount": 40000}, ...]
}
```

**Pros:**

- ✅ Sin tabla extra (menos complejidad en schema)
- ✅ Flexible (N proyectos soportados)

**Contras CRÍTICOS:**

- ❌ **No type-safe:** Prisma trata JSON como `any` (sin IntelliSense)
- ❌ **No hay FKs:** Integridad referencial perdida (puedes tener projectIds huérfanos)
- ❌ **No queries relacionales:** No puedes hacer `SELECT * FROM payments WHERE projectId IN allocations`
- ❌ **No agregaciones:** `SUM(allocations)` requiere deserializar JSON en application layer
- ❌ **Pierde normalización:** Duplicación de projectId en múltiples registros

**Por qué NO:** Pierde las ventajas de una base de datos relacional. JSON fields son anti-pattern para datos estructurados.

---

### Alternativa 3: Tabla Intermedia PaymentAllocation (SELECCIONADA)

**Ver sección "Decisión" arriba para detalles completos.**

**Pros FUNDAMENTALES:**

- ✅ **Flexibilidad total:** 1 pago → 1 o N proyectos (soporta ambos casos)
- ✅ **allocatedAmount por proyecto:** Auditoría precisa (sabes exactamente cuánto fue para cada proyecto)
- ✅ **Queries relacionales:** `SELECT SUM(allocatedAmount) FROM PaymentAllocation WHERE projectId = X`
- ✅ **Balance calculado:** `project.total - SUM(allocations)` con SQL puro
- ✅ **Type-safety completo:** Prisma types generados automáticamente
- ✅ **FKs garantizan integridad:** No hay projectIds huérfanos (constraint a nivel DB)

**Contras ACEPTABLES:**

- ⚠️ **Complejidad:** Requiere validación `SUM(allocations) === payment.amount` (15+ validaciones backend)
- ⚠️ **JOINs adicionales:** `Payment → PaymentAllocation → Project` (mitigado con `relationLoadStrategy: 'join'`)
- ⚠️ **Código extra:** ~400 líneas de validaciones + schemas + helpers

**Por qué SÍ:** Complejidad justificada por flexibilidad y correctness. Soporta 100% de casos de uso reales sin workarounds.

## Consecuencias

### Positivas ✅

1. **Balance Calculation Preciso**

   Cálculo de balance por proyecto:

   ```typescript
   // lib/business-logic/project-balance.ts
   export function calculateProjectBalance(
     project: { total: Decimal },
     allocations: { allocatedAmount: Decimal }[]
   ): Decimal {
     const totalPaid = allocations.reduce((sum, a) => sum + a.allocatedAmount, new Decimal(0))
     return project.total.minus(totalPaid)
   }
   ```

2. **Auditoría Completa**

   Historial detallado de qué pago cubrió qué proyecto:

   ```sql
   -- Ver todos los pagos de un proyecto
   SELECT p.date, p.amount, pa.allocatedAmount, p.reference
   FROM PaymentAllocation pa
   JOIN Payment p ON p.id = pa.paymentId
   WHERE pa.projectId = 'project-123'
   ORDER BY p.date DESC
   ```

3. **Soporte Dual de Flujos de Pago**
   - **type="Project":** 1 allocation automática (flujo simplificado)
   - **type="Customer":** N allocations manuales (flujo avanzado)

   Ver [ADR-002: Dual Payment Flows](002-dual-payment-flows.md) para detalles.

4. **Extensibilidad Futura**

   Fácil agregar features sin breaking changes:
   - Descuentos por allocation (`discount: Decimal`)
   - Notas por allocation (`notes: String`)
   - Fecha de aplicación (`appliedAt: DateTime`)

### Negativas / Trade-offs ⚠️

1. **Validación Compleja en Backend**

   **Trade-off:** Validación estricta de business logic requerida.

   **Mitigación:** Business logic centralizada en `lib/validations/payment-validations.ts`

   Validaciones implementadas (app/api/payments/route.ts:183-276):

   ```typescript
   // 1. Type validation
   if (type === 'Project' && allocations.length !== 1) {
     return error('Project payment must have exactly 1 allocation')
   }

   // 2. Sum validation (tolerance para floats)
   const sum = allocations.reduce((s, a) => s + a.allocatedAmount, 0)
   if (Math.abs(sum - amount) > 0.01) {
     return error(`Sum ${sum} !== amount ${amount}`)
   }

   // 3. Mismo customer
   const projects = await prisma.project.findMany({
     where: { id: { in: allocationProjectIds } },
     select: { customerId: true },
   })
   if (new Set(projects.map((p) => p.customerId)).size > 1) {
     return error('All projects must belong to same customer')
   }

   // 4. Misma currency
   const currencies = new Set(projects.map((p) => p.currency))
   if (currencies.size > 1 || ![...currencies][0] !== payment.currency) {
     return error('Currency mismatch')
   }

   // 5. No duplicados
   if (new Set(allocationProjectIds).size !== allocationProjectIds.length) {
     return error('Duplicate projectIds in allocations')
   }

   // ... 10+ validaciones más
   ```

2. **JOINs Adicionales en Queries**

   **Trade-off:** Queries requieren JOIN adicional vs FK directo.

   **Mitigación 1:** `relationLoadStrategy: 'join'` (fix N+1 queries)

   ```typescript
   // app/api/payments/route.ts:67
   const payments = await prisma.payment.findMany({
     relationLoadStrategy: 'join', // ← Evita N+1
     include: {
       allocations: {
         include: { project: true },
       },
     },
   })
   ```

   **Mitigación 2:** Índices compuestos en PaymentAllocation

   ```prisma
   @@index([paymentId])  // Para queries por pago
   @@index([projectId])  // Para queries por proyecto
   ```

3. **Costo de Complejidad**

   **Trade-off:** ~400 líneas de código extra vs alternativas simples.

   **Justificación:** Valor ganado vs costo
   - Complejidad agregada:
     - 400 líneas de validaciones + schemas + helpers
     - 15+ validaciones backend
     - 2 schemas Zod diferentes (ver ADR-002)
   - Valor ganado:
     - Soporta 100% de casos de uso reales (sin workarounds)
     - Extensible a futuro (descuentos, notas por allocation)
     - No requiere refactor cuando reglas de negocio cambien

   **ROI estimado:**
   - Tiempo invertido: ~8 horas implementación + tests
   - Tiempo ahorrado: ~20 horas de debug de workarounds con FK directo
   - Evita: Reescritura completa si necesitas multi-project payments después

## Referencias

### Código

- **Prisma Schema:** [prisma/schema.prisma:155-163](../../../prisma/schema.prisma#L155-L163) - Modelo PaymentAllocation
- **API Endpoints:** [app/api/payments/route.ts](../../../app/api/payments/route.ts) - CRUD de Payments con allocations
- **Validaciones:** [app/api/payments/route.ts:183-276](../../../app/api/payments/route.ts#L183-L276) - 15+ validaciones de allocations
- **Schemas Zod:** [lib/validations/payment-validations.ts:191-207](../../../lib/validations/payment-validations.ts#L191-L207) - 2 schemas especializados
- **Business Logic:**
  - [lib/business-logic/payment-fifo.ts](../../../lib/business-logic/payment-fifo.ts) - Algoritmo FIFO de asignación automática
  - [lib/business-logic/project-balance.ts](../../../lib/business-logic/project-balance.ts) - Cálculo de balance

### Documentación

- [ADR-002: Dual Payment Flows](002-dual-payment-flows.md) - Flujos de pago que dependen de esta arquitectura
- [docs/project/architecture.md](../architecture.md#migración-paymentallocation-architecture) - Sección de arquitectura N:M
- [docs/project/implementation.md](../implementation.md) - Implementación #24: Migración PaymentAllocation Architecture

### External References

- [Prisma Relations Guide](https://www.prisma.io/docs/concepts/components/prisma-schema/relations) - Many-to-many relations
- [PostgreSQL Decimal Precision](https://www.postgresql.org/docs/current/datatype-numeric.html) - `DECIMAL(12,2)` rationale

## Notas Adicionales

### Constraint UNIQUE([paymentId, projectId])

```prisma
@@unique([paymentId, projectId])
```

**Razón:** Previene duplicados accidentales (mismo proyecto asignado 2 veces al mismo pago).

**Ejemplo de error prevenido:**

```typescript
// ❌ Sin constraint: Se crea silenciosamente
allocations: [
  { projectId: 'abc', allocatedAmount: 50000 },
  { projectId: 'abc', allocatedAmount: 30000 }, // Duplicado
]

// ✅ Con constraint: Error en DB
// PostgreSQL: duplicate key value violates unique constraint "payment_allocations_paymentId_projectId_key"
```

### onDelete: Cascade

```prisma
payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
```

**Razón:** Si eliminas un Payment, debe eliminar TODAS sus allocations (coherencia).

**Sin CASCADE:** Allocations huérfanas quedarían en DB (rompe integridad).

### Precisión Decimal

`Decimal(12,2)` permite:

- **12 dígitos totales:** Máximo $999,999,999,999.99
- **2 decimales:** Centavos (CLP, USD, EUR)
- **Sin errores de redondeo:** Decimal es exacto (no Float)

**Ejemplo:**

```typescript
// ❌ Float (mal)
0.1 + 0.2 = 0.30000000000000004

// ✅ Decimal (bien)
new Decimal(0.1).plus(0.2).toString() // "0.3"
```

Ver [lib/constants/financial-constants.ts](../../../lib/constants/financial-constants.ts) para constantes de precisión.

---

**Última actualización:** 2025-10-25
