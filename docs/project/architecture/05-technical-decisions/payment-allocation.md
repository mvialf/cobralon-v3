# Decisión: PaymentAllocation Table

Tabla intermedia N:M entre Payment y Project.

---

## Contexto

Necesitábamos soportar dos tipos de pagos:

1. **Pago a Proyecto (1:1)** - Todo el monto a un proyecto
2. **Pago a Cliente (1:N)** - Distribuir monto entre múltiples proyectos

---

## Decisión

Crear tabla intermedia `PaymentAllocation` con relación N:M.

```prisma
model PaymentAllocation {
  id              String  @id @default(uuid())
  paymentId       String
  projectId       String
  allocatedAmount Decimal @db.Decimal(12, 2)

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id])

  @@unique([paymentId, projectId])
  @@index([paymentId])
  @@index([projectId])
}
```

---

## Alternativas Consideradas

### Alternativa 1: FK Directo

```prisma
model Payment {
  projectId String // FK directo
  project   Project @relation(fields: [projectId], references: [id])
}
```

**Pros:**

- ✅ Más simple
- ✅ Menos JOINs

**Contras:**

- ❌ **No soporta pago a múltiples proyectos**
- ❌ Limitado a 1:1

**Por qué NO:** Requisito de negocio es pagar a múltiples proyectos.

---

### Alternativa 2: Embedded JSON

```prisma
model Payment {
  allocations Json // [{ projectId, amount }, ...]
}
```

**Pros:**

- ✅ Flexible
- ✅ Sin JOIN

**Contras:**

- ❌ **No queryable** (sin WHERE en allocation específica)
- ❌ **Pierde normalización**
- ❌ Sin type-safety

**Por qué NO:** Necesitamos queries por proyecto (`WHERE projectId=X`).

---

## Razones

### 1. ✅ Flexibilidad

Un pago puede asignarse a 1 o N proyectos sin cambiar estructura.

```typescript
// Pago 1:1
allocations: [{ projectId: 'A', allocatedAmount: 1000 }]

// Pago 1:N
allocations: [
  { projectId: 'A', allocatedAmount: 600 },
  { projectId: 'B', allocatedAmount: 400 },
]
```

### 2. ✅ Auditoría Completa

Historial completo de asignaciones:

```sql
SELECT * FROM payment_allocations
WHERE payment_id = 'abc'
ORDER BY created_at
```

### 3. ✅ Balance Calculado

Fácil calcular balance pendiente por proyecto:

```sql
SELECT
  p.total,
  COALESCE(SUM(pa.allocated_amount), 0) AS paid,
  p.total - COALESCE(SUM(pa.allocated_amount), 0) AS balance
FROM projects p
LEFT JOIN payment_allocations pa ON pa.project_id = p.id
GROUP BY p.id
```

### 4. ✅ Tipos de Pago

Soporta ambos tipos con misma estructura:

```typescript
type: "Project" → allocations.length === 1
type: "Customer" → allocations.length >= 1
```

---

## Trade-offs

### ⚠️ Complejidad

Requiere validación: `SUM(allocations) === payment.amount`

**Mitigación:**

- Validación en frontend (Zod schema)
- Validación en backend (API route)
- Business logic centralizada: `lib/validations/payment-validations.ts`

---

### ⚠️ JOINs Adicionales

Queries requieren JOIN para obtener balance:

```sql
-- Más complejo
SELECT p.*, SUM(pa.allocated_amount) AS paid
FROM projects p
LEFT JOIN payment_allocations pa ON pa.project_id = p.id
GROUP BY p.id

-- vs FK directo (más simple)
SELECT p.*, payment.amount AS paid
FROM projects p
LEFT JOIN payments ON payments.project_id = p.id
```

**Mitigación:**

- Índices optimizados en `paymentId` y `projectId`
- `relationLoadStrategy: 'join'` en Prisma (previene N+1)
- Considerar campo denormalizado `project.balance` si escala

---

## Implementación

### Validación Backend

```typescript
// app/api/payments/route.ts
const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)

if (Math.abs(totalAllocated - amount) > 0.01) {
  return NextResponse.json(
    { error: 'Sum of allocations must equal payment amount' },
    { status: 400 }
  )
}
```

### Business Logic

```typescript
// lib/business-logic/payment-fifo.ts
export function allocatePaymentFIFO(
  amount: number,
  projects: Array<{ id: string; balance: number }>
): Array<{ projectId: string; allocatedAmount: number }> {
  // FIFO allocation logic
}
```

---

## Ver También

- [Payment Systems](../01-data-model/payment-systems.md) - Modelo completo
- [Payment API](../06-apis/payments-api.md) - Validaciones en API

**Última actualización:** 2025-10-30
