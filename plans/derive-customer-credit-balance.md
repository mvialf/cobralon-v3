# Plan: Derivar creditBalance de Customer en Tiempo Real

**Fecha:** 2026-03-17
**Actualizado:** 2026-03-18
**Estado:** ✅ Completado
**Prioridad:** 1 (Alta)
**Implementado en:** branch `dev2`, commits `75dd356`, `6ede8dc`, `4cbf61a`
**DB migrada:** 2026-03-18 (Neon branch de prueba → producción)

---

## Contexto

### Problema

`Customer.creditBalance` (schema línea 85) es un caché de `SUM(CreditTransaction.amount)`. Se recalcula manualmente con `updateCustomerCreditBalance()` después de cada operación de pago. El cron `reconcile-balances` (Fases 3-4) existe específicamente porque este caché puede desincronizarse — evidencia directa de que el problema ocurre en producción.

### Fuente de verdad

La tabla `CreditTransaction` es un **ledger inmutable** con montos positivos (crédito generado) y negativos (crédito consumido). El balance real siempre es:

```sql
SELECT COALESCE(SUM(amount), 0) FROM "CreditTransaction" WHERE "customerId" = ?
```

### Decisión

- Eliminar `Customer.creditBalance` como campo almacenado
- Calcular en tiempo real con `aggregate` de Prisma o query raw
- Eliminar `updateCustomerCreditBalance()` y `verifyCustomerCreditBalance()` y sus llamadas
- Simplificar el cron `reconcile-balances` (eliminar Fases 3 y 4 — reconciliación de créditos)

---

## Inventario Completo de Archivos Afectados

### Puntos de ESCRITURA (donde el valor cambia en DB)

| Archivo | Línea | Mecanismo | Acción |
|---------|-------|-----------|--------|
| `lib/business-logic/update-customer-credit-balance.ts` | 52 | `updateCustomerCreditBalance()` — escritura canónica desde ledger SUM | **Eliminar archivo** |
| `app/api/cron/reconcile-balances/route.ts` | 259-262 | Escritura directa batch `prisma.customer.update` | **Eliminar Fases 3-4** |
| `scripts/fix-overpayment-credit.ts` | 109 | `creditBalance: { increment }` — script one-shot | **Eliminado en limpieza posterior** |

### Callers de `updateCustomerCreditBalance()` (3, no 2)

| Archivo | Línea | Contexto | Acción |
|---------|-------|----------|--------|
| `app/api/payments/route.ts` | 690 | POST — después de crear pago | Eliminar llamada |
| `app/api/payments/[id]/route.ts` | 203 | DELETE — después de revertir pago | Eliminar llamada |
| `app/api/customers/[id]/credit/refund/route.ts` | 57 | POST — después de devolver crédito | Eliminar llamada |

### Lecturas del campo `creditBalance` en API routes

| Archivo | Línea | Uso | Acción |
|---------|-------|-----|--------|
| `app/api/customers/route.ts` | 26 | Sort con `z.enum([..., 'creditBalance'])` — Prisma OrderBy nativo | Reemplazar por subquery en ORDER BY |
| `app/api/customers/route.ts` | 59 | `orderBy: { creditBalance: sortOrder }` | Reemplazar por sort sobre valor calculado |
| `app/api/customers/[id]/credit/route.ts` | 25, 54 | `select: { creditBalance: true }` → retorna en JSON | Reemplazar por `getCustomerCreditBalance()` |
| `app/api/customers/[id]/credit/refund/route.ts` | 22, 30 | Lee para validar con `canRefundCredit()` | Reemplazar por `getCustomerCreditBalance()` |
| `app/api/payments/route.ts` | 551, 566 | Lee dentro de tx para validar crédito disponible | Reemplazar por `getCustomerCreditBalance(id, tx)` |
| `app/api/cron/reconcile-balances/route.ts` | 191, 196, 217 | Fase 3 — compara DB vs ledger | Eliminar toda la fase |

### Lecturas en UI / Hooks / Utilities

| Archivo | Línea(s) | Uso | Acción |
|---------|----------|-----|--------|
| `app/customer/page.tsx` | 24 | `select: { creditBalance: true }` — Server Component | Reemplazar por cálculo o subquery |
| `app/customer/columns.tsx` | 28, 50, 107, 135, 219, 222, 228 | Tipo `CustomerRow`, badges, columna de tabla | Adaptar tipo — el dato vendrá del API igual |
| `hooks/queries/use-customers.ts` | 30 | Tipo `Customer { creditBalance: number }` | Mantener tipo (el API seguirá devolviendo el campo calculado) |
| `components/ui/customer-credit-badge.tsx` | 6, 32, 40 | Props y render de badge | Sin cambios (recibe `creditBalance` como prop) |
| `components/dialogs/customers/credit-history-dialog.tsx` | 44, 120 | Tipo y render | Sin cambios (recibe como prop) |
| `components/forms/payments/payment-to-project-form.tsx` | 107-110 | `useEffect` consume `creditBalance` del endpoint | Sin cambios (el endpoint seguirá devolviendo el valor) |
| `lib/utils/serialize.ts` | 50 | `Number(project.customer.creditBalance)` | Reemplazar — el campo ya no existirá en la relación |
| `lib/excel/customer-exporter.ts` | 27 | Columna "Saldo a Favor" en export | Adaptar — recibir creditBalance precalculado |
| `lib/business-logic/credit-eligibility.ts` | 101-106 | `shouldShowRefundOption(creditBalance)` — función pura | Sin cambios (recibe como parámetro) |

### Tests (11 archivos)

| Archivo | Acción |
|---------|--------|
| `lib/business-logic/__tests__/update-customer-credit-balance.test.ts` | **Eliminar archivo** |
| `lib/business-logic/__tests__/credit-eligibility.test.ts` | Sin cambios (funciones puras) |
| `app/api/customers/__tests__/route.test.ts` | Actualizar mocks |
| `app/api/customers/[id]/__tests__/route.test.ts` | Actualizar mocks |
| `app/api/customers/[id]/credit/__tests__/route.test.ts` | Actualizar — mock de aggregate en vez de campo |
| `app/api/customers/[id]/credit/refund/__tests__/route.test.ts` | Actualizar mocks |
| `app/api/payments/__tests__/route.test.ts` | Eliminar asserts sobre `updateCustomerCreditBalance` |
| `app/api/payments/[id]/__tests__/route.test.ts` | Eliminar asserts sobre `updateCustomerCreditBalance` |
| `lib/excel/__tests__/exporters.test.ts` | Actualizar datos mock |
| `hooks/queries/__tests__/use-customers.test.tsx` | Actualizar mocks |
| `tests/e2e/customers.spec.ts` | Verificar — referencia condicional |

---

## Fases de Implementación

### Fase 1: Crear helper de cálculo en tiempo real

**Archivo:** `lib/business-logic/credit-management.ts`

**Cambios:**
1. Agregar función para calcular creditBalance desde el ledger:
```typescript
export async function getCustomerCreditBalance(
  customerId: string,
  db: PrismaClient | PrismaTransaction = prisma
): Promise<Decimal> {
  const result = await db.creditTransaction.aggregate({
    where: { customerId },
    _sum: { amount: true },
  })
  const balance = result._sum.amount ?? new Decimal(0)
  // Invariante: creditBalance >= 0 (mismo que updateCustomerCreditBalance)
  return Decimal.max(balance, new Decimal(0))
}
```

2. Esta función reemplaza a `updateCustomerCreditBalance()` en todos los sitios de escritura
3. También reemplaza lecturas directas de `customer.creditBalance` en API routes

**Verificación:**
```bash
npm run typecheck
```

### Fase 2: Migración de Base de Datos

**Archivo:** `prisma/schema.prisma`

**Cambios:**
1. Eliminar `creditBalance Decimal @default(0) @db.Decimal(12, 2)` del modelo Customer (línea 85)
2. Ejecutar `npx prisma migrate dev --name remove-customer-credit-balance`

**Verificación:**
```bash
npm run typecheck  # Mostrará errores en ~15 archivos
```

### Fase 3: Adaptar APIs de Pagos

**Archivos:**
- `app/api/payments/route.ts` (líneas 551, 566, 690)
- `app/api/payments/[id]/route.ts` (línea 203)

**Cambios:**
1. Eliminar import de `updateCustomerCreditBalance`
2. En POST (línea 566): reemplazar `Number(customer.creditBalance)` por `Number(await getCustomerCreditBalance(customerId, tx))`
3. En POST (línea 690): eliminar la llamada `await updateCustomerCreditBalance(customerId, tx)`
4. En DELETE (línea 203): eliminar la llamada `await updateCustomerCreditBalance(existingPayment.customerId, tx)`

**Nota:** Las operaciones de `CreditTransaction.create` dentro de la transacción siguen igual. Solo se elimina el paso de "actualizar el caché".

### Fase 4: Adaptar API de Refund

**Archivo:** `app/api/customers/[id]/credit/refund/route.ts` (líneas 22, 30, 57)

**Cambios:**
1. Eliminar import de `updateCustomerCreditBalance`
2. Reemplazar `Number(customer.creditBalance)` por `Number(await getCustomerCreditBalance(customerId))`
3. Eliminar llamada `await updateCustomerCreditBalance(customerId, tx)` (línea 57)

### Fase 5: Adaptar APIs de Clientes

**Archivos:**
- `app/api/customers/[id]/credit/route.ts` (líneas 25, 54)
- `app/api/customers/route.ts` (líneas 26, 59)
- `app/customer/page.tsx` (línea 24)

**Cambios en GET individual (`/credit/route.ts`):**
1. Eliminar `select: { creditBalance: true }` del findUnique
2. Calcular con `await getCustomerCreditBalance(customerId)`
3. Retornar `creditBalance` como campo virtual en JSON (la interfaz del API no cambia)

**Cambios en GET listado (`customers/route.ts`):**
1. Eliminar `creditBalance` del enum de sort (línea 26) — **o** reemplazar por subquery sort
2. Para el listado, usar query raw con subquery para evitar N+1:
```sql
SELECT c.*, COALESCE((
  SELECT SUM(ct.amount) FROM "CreditTransaction" ct WHERE ct."customerId" = c.id
), 0) as "creditBalance"
FROM "Customer" c
ORDER BY "creditBalance" DESC  -- si sort=creditBalance
```

**Cambios en Server Component (`page.tsx`):**
1. Eliminar `creditBalance: true` del select
2. Opción A: Calcular in-page con una query agregada por cliente
3. Opción B: Migrar a usar el endpoint `/api/customers` que ya incluirá el valor calculado

### Fase 6: Adaptar Utilities

**Archivos:**
- `lib/utils/serialize.ts` (línea 50)
- `lib/excel/customer-exporter.ts` (línea 27)

**Cambios en `serialize.ts`:**
1. `Number(project.customer.creditBalance)` ya no existirá en la relación de Prisma
2. Opciones: (a) eliminar del serializer si no se usa en la vista, (b) precalcular antes de serializar

**Cambios en `customer-exporter.ts`:**
1. El caller debe pasar `creditBalance` ya calculado en los datos de exportación
2. La interfaz `CustomerExportData` mantiene `creditBalance: number`

### Fase 7: Simplificar Cron de Reconciliación

**Archivo:** `app/api/cron/reconcile-balances/route.ts`

**Cambios:**
1. Eliminar Fase 3 (líneas 188-250): fetch de customers y comparación de creditBalance vs ledger
2. Eliminar Fase 4 (líneas 254-270): batch update de creditBalance
3. El cron solo queda con Fases 1-2: reconciliación de `Project.balance`

### Fase 8: Limpieza

**Cambios:**
1. Eliminar archivo `lib/business-logic/update-customer-credit-balance.ts`
2. Eliminar test `lib/business-logic/__tests__/update-customer-credit-balance.test.ts`
3. `scripts/fix-overpayment-credit.ts` fue eliminado en limpieza posterior (usaba `creditBalance: { increment }`)
4. Eliminar imports huérfanos en todos los archivos
5. Actualizar los 9 archivos de test restantes (mocks y asserts)

**Verificación final:**
```bash
npm run lint
npm run typecheck
npx vitest run
```

---

## Riesgos

- **Performance en listado de clientes:** La subquery `SUM(credit_transactions)` por cliente en el ORDER BY podría ser lenta. Mitigación: volumen actual bajo (<100 clientes), `SUM` con índice en `customerId` es O(log n).
- **Sort por creditBalance:** El sort Prisma nativo `{ creditBalance: 'desc' }` ya no funciona. Requiere migrar el listado de clientes a query raw o agregar un computed field. Este es el cambio más invasivo.
- **Transacciones concurrentes:** `getCustomerCreditBalance()` dentro de una transacción Prisma lee el estado consistente de la transacción, igual que antes. No hay cambio de comportamiento.
- **serialize.ts:** Usa `project.customer.creditBalance` — la relación Prisma ya no tendrá este campo. Requiere un cambio en cómo se obtienen los datos del customer en ese contexto.
