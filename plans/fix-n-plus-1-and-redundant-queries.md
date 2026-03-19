# Plan: Corregir N+1 y Queries Redundantes

**Fecha:** 2026-03-17
**Actualizado:** 2026-03-18
**Estado:** ✅ Completado (parcial — items opcionales omitidos)
**Prioridad:** 5 (Baja)
**Implementado en:** branch `dev2`, commit `2f23c51`
**Omitidos:** Opt 1 (batchUpdateProjectBalances — sin consumidor), Opt 2 (payment-list.ts — refactor mayor), Opt 4 (subquery pagos — beneficio marginal)

---

## Contexto

Hay varios patrones de queries ineficientes: loops con queries individuales (N+1), queries dobles que podrían ser una, y cálculos en JS que podrían ser SQL. El impacto real es bajo con el volumen actual (~90 proyectos, <100 clientes) pero son mejoras incrementales.

---

## Optimización 1: N+1 en updateMultipleProjectBalances

**Impacto: Bajo en flujo normal, Medio en cron | Dificultad: Media**

**Archivo:** `lib/business-logic/update-project-balance.ts` (líneas 118-127)

**Problema:** Loop `for...of` que ejecuta `updateProjectBalance()` por cada proyecto. Cada `updateProjectBalance` llama internamente a `_updateBalanceInternal` que hace `findUnique` + `update` (2 queries secuenciales).

```typescript
// Actual — 2N queries secuenciales
export async function updateMultipleProjectBalances(
  projectIds: string[],
  tx?: PrismaTransaction
): Promise<number> {
  for (const projectId of projectIds) {
    await updateProjectBalance(projectId, tx)  // findUnique + update
  }
  return projectIds.length
}
```

**Nota:** Existe también `updateProjectBalanceWithAdjustments(projectId, tx)` que usa `_updateBalanceInternal(id, true, tx)` e incluye la tabla `ProjectAdjustment` (no `Adjustment` — el modelo se llama `ProjectAdjustment`, mapeado a tabla `project_adjustments`).

**Solución:** Query SQL batch que calcula y actualiza en una sola operación:

```sql
UPDATE "Project" p
SET balance = COALESCE(p."totalAmount", 0) - COALESCE((
  SELECT SUM(pa."allocatedAmount")
  FROM "PaymentAllocation" pa
  WHERE pa."projectId" = p.id
), 0) - COALESCE((
  SELECT SUM(a.amount)
  FROM "project_adjustments" a
  WHERE a."projectId" = p.id
), 0)
WHERE p.id = ANY($1::uuid[])
```

**Cuándo vale la pena:**
- Para pagos normales (1-3 proyectos): el loop es más legible y el beneficio es nulo. **Mantener el loop.**
- Para el cron de reconciliación (90+ proyectos): sí vale la pena el batch. **Crear función `batchUpdateProjectBalances()` separada para el cron.**

**Archivos:**
- `lib/business-logic/update-project-balance.ts` — Agregar función batch (no reemplazar la existente)
- `app/api/cron/reconcile-balances/route.ts` — Usar la función batch en Fase 2

---

## Optimización 2: Búsqueda de Pagos en 2 Queries

**Impacto: Medio | Dificultad: Baja**

**Archivo:** `app/api/payments/route.ts` (líneas 90-102)

**Problema:** Cuando hay `?search=`, primero ejecuta `$queryRaw` para obtener IDs que coinciden con `normalize_text()`, luego usa esos IDs en el `findMany` principal. Son 2 roundtrips a la DB.

```typescript
// Actual — 2 queries
if (search) {
  const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT DISTINCT pm.id
    FROM "Payment" pm
    JOIN "Customer" c ON c.id = pm."customerId"
    LEFT JOIN "PaymentAllocation" pa ON pa."paymentId" = pm.id
    LEFT JOIN "Project" p ON p.id = pa."projectId"
    WHERE normalize_text(c.name) LIKE normalize_text(${`%${search}%`})
       OR normalize_text(p."projectNumber") LIKE normalize_text(${`%${search}%`})
       OR normalize_text(COALESCE(p."projectName", '')) LIKE normalize_text(${`%${search}%`})
  `
  where.id = { in: matchingIds.map((r) => r.id) }
}
// Luego:
const payments = await prisma.payment.findMany({ where, ... })
```

**Solución:** Migrar todo el GET de pagos al patrón SQL raw de `project-list.ts`. Incorporar la búsqueda, filtros, orden y paginación en una sola query. La dependencia de `normalize_text()` **requiere** SQL raw, así que el `findMany` de Prisma no puede reemplazar la búsqueda — mejor consolidar todo en SQL.

**Alternativa mínima:** Usar subquery con `WHERE id IN (SELECT ...)` en vez de 2 roundtrips. Esto es más simple pero no elimina la mezcla Prisma + raw.

**Archivos:**
- `app/api/payments/route.ts` — Refactorizar GET
- `lib/queries/payment-list.ts` — **Crear** (opcional, si se migra completamente al patrón SQL)

---

## Optimización 3: N+1 en Reverso de Credit Transactions

**Impacto: Bajo | Dificultad: Baja**

**Archivo:** `app/api/payments/[id]/route.ts` (líneas 166-189)

**Problema:** Loop creando una `CreditTransaction` por cada transacción a revertir.

```typescript
// Actual — N inserts secuenciales
for (const ct of creditTransactions) {
  const ctAmount = Number(ct.amount)
  await tx.creditTransaction.create({
    data: {
      customerId: ct.customerId,
      amount: new Decimal(-ctAmount),
      type: 'ADJUSTMENT',
      description: `Reversión por eliminación de pago ${id.slice(0, 8)}`,
      paymentId: null,
      metadata: {
        reversedTransactionId: ct.id,
        reversedAmount: ctAmount,
      },
    },
  })
}
```

**Solución:** Usar `createMany`. Nota: el campo `metadata` tiene valores únicos por registro (`reversedTransactionId`, `reversedAmount`), pero `createMany` soporta arrays de objetos distintos.

```typescript
// Propuesto — 1 insert batch
const reversals = creditTransactions.map(ct => ({
  customerId: ct.customerId,
  amount: new Decimal(-Number(ct.amount)),
  type: 'ADJUSTMENT',
  description: `Reversión por eliminación de pago ${id.slice(0, 8)}`,
  paymentId: null,
  metadata: {
    reversedTransactionId: ct.id,
    reversedAmount: Number(ct.amount),
  },
}))
await tx.creditTransaction.createMany({ data: reversals })
```

**⚠️ Limitación de Prisma:** `createMany` no soporta campos `Json` en algunos adaptadores. Verificar que funciona con el adaptador PostgreSQL + campos `metadata: Json?`. Si no funciona, mantener el loop (el impacto es bajo de todos modos).

**Archivos:**
- `app/api/payments/[id]/route.ts` — Refactorizar a `createMany`

---

## Optimización 4: Cron Reconciliación — Detección JS → SQL

**Impacto: Bajo | Dificultad: Media**

**Archivo:** `app/api/cron/reconcile-balances/route.ts`

**Problema (Fase 1 del cron, líneas 91-163):** Trae todos los proyectos con sus allocations a JS, calcula balance en JS con `calculateProjectBalance()`, compara con el balance almacenado, y acumula un array `toFix[]` de inconsistencias.

**Fase 2 del cron (líneas 166-183) ya está optimizada:** Usa `prisma.$transaction([...updates])` en batch. No necesita cambio.

**Solución para Fase 1:** Detectar inconsistencias directamente en SQL:

```sql
SELECT p.id, p."projectNumber",
       p.balance as "stored",
       (COALESCE(p."totalAmount", 0)
        - COALESCE((SELECT SUM(pa."allocatedAmount") FROM "PaymentAllocation" pa WHERE pa."projectId" = p.id), 0)
        - COALESCE((SELECT SUM(a.amount) FROM "project_adjustments" a WHERE a."projectId" = p.id), 0)
       ) as "calculated"
FROM "Project" p
HAVING ABS(p.balance - (
  COALESCE(p."totalAmount", 0)
  - COALESCE((SELECT SUM(pa."allocatedAmount") FROM "PaymentAllocation" pa WHERE pa."projectId" = p.id), 0)
  - COALESCE((SELECT SUM(a.amount) FROM "project_adjustments" a WHERE a."projectId" = p.id), 0)
)) > 0.01
```

Esto elimina cargar todas las allocations a memoria y reduce a 1 query de detección + 1 batch update.

**Nota:** Si se implementa el plan `derive-customer-credit-balance`, las Fases 3-4 del cron (reconciliación de creditBalance) desaparecen, y el cron solo queda con la parte de proyectos.

**Archivos:**
- `app/api/cron/reconcile-balances/route.ts` — Refactorizar Fase 1 (detección) a SQL

---

## Orden de Implementación Recomendado

### Quick Wins (bajo riesgo, bajo esfuerzo)

1. **Optimización 3** — `createMany` en reverso de créditos (1 archivo, cambio mecánico)

### Mejoras Moderadas

2. **Optimización 2** — Unificar búsqueda de pagos (1-2 archivos, requiere SQL)
3. **Optimización 4** — Detección SQL en cron (1 archivo, requiere SQL cuidadoso)

### Solo si hay necesidad de performance

4. **Optimización 1** — `batchUpdateProjectBalances` para el cron (no para flujo normal)

### Verificación

```bash
npm run lint
npm run typecheck
npx vitest run
```

---

## Notas

- Las optimizaciones 1 y 4 se benefician mutuamente: si se crea `batchUpdateProjectBalances`, el cron puede usarlo para el update (Fase 2) y la detección SQL (Fase 1) determina qué actualizar.
- Si se implementa el plan `derive-customer-credit-balance`, la optimización 4 se simplifica (solo queda la parte de proyectos en el cron, eliminando Fases 3-4).
- El volumen actual (~90 proyectos, <100 clientes) hace que ninguna de estas optimizaciones sea urgente. Son mejoras de higiene de código más que de performance.
- **Prioridad bajada de 4 a 5** respecto al plan original, dado que el impacto real es menor que los otros refactorings.
