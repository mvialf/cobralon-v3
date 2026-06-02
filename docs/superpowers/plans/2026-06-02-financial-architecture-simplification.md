# Financial Architecture Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplificar el núcleo cliente-proyecto-pago de Cobralon reduciendo complejidad accidental en balances, crédito y pagos, sin perder invariantes financieras ni auditoría.

**Architecture:** Mantener backend/DB como fuente autoritativa para operaciones financieras, pero mover cálculos deterministas a funciones puras y compartibles. Adelgazar API routes para que sean orquestadores, separar casos de uso de pagos, eliminar compatibilidad legacy innecesaria y decidir con evidencia si `ProjectApplication` sigue aportando valor o debe fusionarse conceptualmente con ledger entries.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma, PostgreSQL/Neon, Zod, Vitest, Playwright, Decimal.js/Prisma Decimal, npm.

---

## Scope And Principles

Este plan no es una optimización de bundle ni una limpieza cosmética. Es una simplificación de dominio financiero.

Prioridad de flujos:

- Cliente
- Proyecto
- Pago

Flujos explícitamente fuera de alcance:

- Import/export Excel, ya eliminado en `0f92214`.
- Rehacer calendario/postventa salvo que aparezcan dependencias financieras directas.
- Cambiar UI visual sin necesidad del dominio.

Decisión de arquitectura:

- El frontend puede calcular previews.
- El backend valida y persiste.
- La DB o una vista SQL puede agregar movimientos.
- Ningún balance final se acepta desde el cliente.

---

## File Structure

- Create: `docs/project/decisions/020-financial-simplification.md`
  - Registra decisiones de fuente de verdad, ledger y compatibilidad legacy.
- Create: `lib/business-logic/project-balance.ts`
  - Funciones puras para balance de proyecto, porcentajes y deuda.
- Create: `lib/business-logic/__tests__/project-balance.test.ts`
  - Tests de cálculo puro de balance.
- Modify: `lib/business-logic/project-financials.ts`
  - Usa `project-balance.ts` para mapear vista SQL a DTO.
- Modify: `lib/business-logic/__tests__/project-financials.test.ts`
  - Mantiene caracterización del mapper con la nueva función pura.
- Modify: `lib/validations/payment-validations.ts`
  - Elimina compatibilidad top-level `creditApplied` del payload API cuando sea seguro.
- Modify: `lib/validations/__tests__/payment-validations.test.ts`
  - Actualiza tests para crédito por allocation.
- Create: `lib/use-cases/payments/types.ts`
  - Tipos internos de casos de uso de pagos.
- Create: `lib/use-cases/payments/create-payment.ts`
  - Caso de uso autoritativo para registrar pagos.
- Create: `lib/use-cases/payments/__tests__/create-payment.test.ts`
  - Tests unitarios con Prisma mockeado para decisiones de pago.
- Modify: `app/api/payments/route.ts`
  - Delega POST a `createPayment`.
- Modify: `app/api/payments/__tests__/route.test.ts`
  - Mantiene cobertura de contrato HTTP.
- Create: `docs/project/financial-model-audit.md`
  - Auditoría de `Project.balance`, `PaymentAllocation`, `ProjectApplication`, `CreditTransaction`.
- Modify: `docs/project/architecture.md`
  - Actualiza modelo financiero simplificado si las tareas terminan.
- Modify: `docs/project/implementation/2025-current.md`
  - Registra hitos implementados.

---

## Task 0: Baseline And Financial Model Audit

**Files:**
- Create: `docs/project/financial-model-audit.md`
- Read: `docs/project/architecture.md`
- Read: `prisma/schema.prisma`
- Read: `app/api/payments/route.ts`
- Read: `lib/business-logic/project-financials.ts`
- Test: `npm test -- --run lib/business-logic/__tests__ app/api/payments/__tests__/route.test.ts app/api/payments/[id]/__tests__/route.test.ts`
- Test: `npm run lint`
- Test: `npm run typecheck`

- [ ] **Step 1: Confirm financial baseline is green**

Run:

```bash
npm test -- --run lib/business-logic/__tests__ app/api/payments/__tests__/route.test.ts app/api/payments/[id]/__tests__/route.test.ts
```

Expected: all selected financial tests pass. If any fail, stop this plan and fix the failing financial tests first.

- [ ] **Step 2: Inventory financial tables and sources of truth**

Run:

```bash
rg -n "model (Project|Payment|PaymentAllocation|ProjectApplication|CreditTransaction|ProjectAdjustment|Installment)|enum ProjectApplicationSourceType|balance|creditApplied" prisma/schema.prisma app/api lib components hooks --glob '*.{ts,tsx,prisma}'
```

Expected: output shows current usage of:

- `Project.balance`
- `ProjectFinancials`
- `PaymentAllocation`
- `ProjectApplication`
- `CreditTransaction`
- `creditApplied`

- [ ] **Step 3: Write the audit document**

Create `docs/project/financial-model-audit.md` with this content:

```md
# Financial Model Audit

## Current Source Of Truth

- `Project.totalAmount`: total facturado del proyecto.
- `Project.balance`: campo legacy; no debe usarse como fuente principal.
- `ProjectFinancials`: vista SQL usada como lectura autoritativa de deuda visible.
- `Payment`: evento de entrada de dinero.
- `PaymentAllocation`: asignación de dinero nuevo recibido hacia proyectos.
- `ProjectApplication`: aplicación efectiva que salda un proyecto (`CASH`, `CUSTOMER_CREDIT`, `ADJUSTMENT`).
- `CreditTransaction`: ledger del crédito del cliente.
- `ProjectAdjustment`: ajuste administrativo sobre deuda.

## Current Pain

- `POST /api/payments` mezcla validación HTTP, lectura de DB, comisiones, cuotas, crédito, sobrepagos, applications y respuesta.
- `creditApplied` existe como campo top-level legacy y como campo por allocation.
- `Project.balance` sigue existiendo en schema y algunos comentarios/tests, aunque la arquitectura declara `ProjectFinancials` como fuente principal.
- `ProjectApplication` aporta claridad para la vista financiera, pero aumenta el número de entidades necesarias para entender un pago.

## Invariants To Preserve

- Un pago que afecta proyectos debe ser transaccional.
- Todo movimiento de crédito debe tener `CreditTransaction`.
- El crédito disponible de cliente se deriva del ledger.
- La deuda visible de proyecto se lee desde `ProjectFinancials`.
- El frontend puede mostrar previews, pero el backend recalcula antes de persistir.

## Candidate Simplifications

1. Extraer cálculo puro de balance a `lib/business-logic/project-balance.ts`.
2. Eliminar compatibilidad top-level `creditApplied`.
3. Mover creación de pagos a un caso de uso `createPayment`.
4. Mantener `ProjectApplication` inicialmente, pero documentar por qué existe.
5. Evaluar migración futura a una entidad conceptual `ProjectLedgerEntry` solo después de adelgazar `POST /api/payments`.
```

- [ ] **Step 4: Run checks**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add docs/project/financial-model-audit.md
git commit -m "docs: auditar modelo financiero actual"
```

---

## Task 1: Record Architecture Decision

**Files:**
- Create: `docs/project/decisions/020-financial-simplification.md`

- [ ] **Step 1: Create the ADR**

Create `docs/project/decisions/020-financial-simplification.md`:

```md
# ADR 020: Simplificación del modelo financiero

## Estado

Aceptado para implementación incremental.

## Contexto

Los flujos más usados de Cobralon son cliente, proyecto y pago. El sistema ya eliminó import/export Excel porque no aportaba valor operativo. El siguiente cuello de botella es la complejidad accidental del núcleo financiero: balances derivados, crédito de cliente, allocations, applications y validaciones repartidas entre API routes, schemas y formularios.

## Decisión

1. Backend y DB siguen siendo autoridad para persistencia financiera.
2. Frontend puede calcular previews, pero no define balances finales.
3. Los cálculos deterministas deben vivir en funciones puras sin Prisma ni React.
4. `ProjectFinancials` sigue siendo la lectura autoritativa inicial para deuda visible.
5. `Project.balance` se trata como legacy y queda prohibido en código nuevo.
6. `creditApplied` top-level se eliminará del contrato API; crédito debe estar por allocation.
7. `POST /api/payments` se dividirá en un caso de uso interno para reducir complejidad de route.
8. `ProjectApplication` no se elimina en la primera fase; se evalúa después de aislar el caso de uso.

## Consecuencias

- Menos lógica financiera inline en API routes.
- Tests financieros más cerca de funciones puras y casos de uso.
- Menos duplicación entre frontend/backend para previews.
- Cambios de schema grandes quedan para una fase posterior, con datos auditados.

## No Decisiones

- No se migra inmediatamente `ProjectApplication`.
- No se elimina inmediatamente `Project.balance` del schema.
- No se cambia calendario/postventa.
```

- [ ] **Step 2: Verify no conflicting ADR number exists**

Run:

```bash
ls docs/project/decisions
```

Expected: no other ADR `020` exists.

- [ ] **Step 3: Commit**

```bash
git add docs/project/decisions/020-financial-simplification.md
git commit -m "docs: definir simplificacion financiera"
```

---

## Task 2: Extract Pure Project Balance Calculator

**Files:**
- Create: `lib/business-logic/project-balance.ts`
- Create: `lib/business-logic/__tests__/project-balance.test.ts`
- Modify: `lib/business-logic/project-financials.ts`
- Modify: `lib/business-logic/__tests__/project-financials.test.ts`
- Test: `npm test -- --run lib/business-logic/__tests__/project-balance.test.ts lib/business-logic/__tests__/project-financials.test.ts`

- [ ] **Step 1: Write the failing pure balance tests**

Create `lib/business-logic/__tests__/project-balance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { calculateProjectBalanceSnapshot } from '../project-balance'

describe('calculateProjectBalanceSnapshot', () => {
  it('calcula deuda pendiente con efectivo, credito y ajustes', () => {
    const result = calculateProjectBalanceSnapshot({
      projectId: 'project-1',
      totalAmount: 100000,
      appliedCashTotal: 60000,
      appliedCreditTotal: 10000,
      adjustmentTotal: 5000,
      overpayment: 0,
    })

    expect(result).toEqual({
      projectId: 'project-1',
      totalAmount: 100000,
      appliedCashTotal: 60000,
      appliedCreditTotal: 10000,
      adjustmentTotal: 5000,
      settledTotal: 75000,
      rawBalance: 25000,
      balance: 25000,
      overpayment: 0,
      totalPaid: 75000,
      percentPaid: 75,
      hasDebt: true,
    })
  })

  it('normaliza sobrepago dejando balance visible en cero', () => {
    const result = calculateProjectBalanceSnapshot({
      projectId: 'project-2',
      totalAmount: 100000,
      appliedCashTotal: 120000,
      appliedCreditTotal: 0,
      adjustmentTotal: 0,
      overpayment: 20000,
    })

    expect(result.rawBalance).toBe(-20000)
    expect(result.balance).toBe(0)
    expect(result.overpayment).toBe(20000)
    expect(result.percentPaid).toBe(120)
    expect(result.hasDebt).toBe(false)
  })

  it('usa tolerancia para deudas menores o iguales a balanceTolerance', () => {
    const result = calculateProjectBalanceSnapshot({
      projectId: 'project-3',
      totalAmount: 100000,
      appliedCashTotal: 99999.5,
      appliedCreditTotal: 0,
      adjustmentTotal: 0,
      overpayment: 0,
      balanceTolerance: 1,
    })

    expect(result.balance).toBe(0.5)
    expect(result.hasDebt).toBe(false)
  })
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm test -- --run lib/business-logic/__tests__/project-balance.test.ts
```

Expected: fails because `lib/business-logic/project-balance.ts` does not exist.

- [ ] **Step 3: Implement the pure calculator**

Create `lib/business-logic/project-balance.ts`:

```ts
import { FINANCIAL } from '@/lib/constants/financial-constants'
import {
  addMoney,
  greaterThanMoney,
  greaterThanMoneyWithTolerance,
  maxMoney,
  money,
  moneyToNumber,
  subtractMoney,
} from './money'

export interface ProjectBalanceInput {
  projectId: string
  totalAmount: number
  appliedCashTotal: number
  appliedCreditTotal: number
  adjustmentTotal: number
  overpayment?: number
  balanceTolerance?: number
}

export interface ProjectBalanceSnapshot {
  projectId: string
  totalAmount: number
  appliedCashTotal: number
  appliedCreditTotal: number
  adjustmentTotal: number
  settledTotal: number
  rawBalance: number
  balance: number
  overpayment: number
  totalPaid: number
  percentPaid: number
  hasDebt: boolean
}

export function calculateProjectBalanceSnapshot(input: ProjectBalanceInput): ProjectBalanceSnapshot {
  const totalAmount = money(input.totalAmount)
  const appliedCashTotal = money(input.appliedCashTotal)
  const appliedCreditTotal = money(input.appliedCreditTotal)
  const adjustmentTotal = money(input.adjustmentTotal)
  const settledTotal = addMoney(addMoney(appliedCashTotal, appliedCreditTotal), adjustmentTotal)
  const rawBalance = subtractMoney(totalAmount, settledTotal)
  const balance = maxMoney(0, rawBalance)
  const overpayment = money(input.overpayment ?? moneyToNumber(maxMoney(0, subtractMoney(0, rawBalance))))
  const balanceTolerance = input.balanceTolerance ?? FINANCIAL.BALANCE_TOLERANCE

  return {
    projectId: input.projectId,
    totalAmount: moneyToNumber(totalAmount),
    appliedCashTotal: moneyToNumber(appliedCashTotal),
    appliedCreditTotal: moneyToNumber(appliedCreditTotal),
    adjustmentTotal: moneyToNumber(adjustmentTotal),
    settledTotal: moneyToNumber(settledTotal),
    rawBalance: moneyToNumber(rawBalance),
    balance: moneyToNumber(balance),
    overpayment: moneyToNumber(overpayment),
    totalPaid: moneyToNumber(settledTotal),
    percentPaid: greaterThanMoney(totalAmount, 0)
      ? moneyToNumber(settledTotal.dividedBy(totalAmount).times(100))
      : 0,
    hasDebt: greaterThanMoneyWithTolerance(balance, 0, balanceTolerance),
  }
}
```

- [ ] **Step 4: Run pure calculator tests**

Run:

```bash
npm test -- --run lib/business-logic/__tests__/project-balance.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Refactor project-financials mapper to delegate derived fields**

Modify `lib/business-logic/project-financials.ts`:

```ts
import { calculateProjectBalanceSnapshot } from './project-balance'
```

Inside `mapProjectFinancials`, replace manual `totalPaid`, `percentPaid`, and `hasDebt` derivation with:

```ts
const snapshot = calculateProjectBalanceSnapshot({
  projectId: row.projectId,
  totalAmount: moneyToNumber(addMoney(settledTotalMoney, rawBalanceMoney)),
  appliedCashTotal: moneyToNumber(appliedCashTotalMoney),
  appliedCreditTotal: moneyToNumber(appliedCreditTotalMoney),
  adjustmentTotal: moneyToNumber(adjustmentTotalMoney),
  overpayment: moneyToNumber(row.overpayment),
})
```

Return the existing DTO shape:

```ts
return {
  projectId: row.projectId,
  allocatedTotal: moneyToNumber(allocatedTotalMoney),
  appliedCashTotal: snapshot.appliedCashTotal,
  appliedCreditTotal: snapshot.appliedCreditTotal,
  adjustmentTotal: snapshot.adjustmentTotal,
  settledTotal: snapshot.settledTotal,
  rawBalance: moneyToNumber(rawBalanceMoney),
  balance: moneyToNumber(balanceMoney),
  overpayment: snapshot.overpayment,
  totalPaid: snapshot.totalPaid,
  percentPaid: snapshot.percentPaid,
  hasDebt: snapshot.hasDebt,
}
```

Keep `balance: moneyToNumber(balanceMoney)` because the DB view remains authoritative during this phase.

- [ ] **Step 6: Run mapper tests**

Run:

```bash
npm test -- --run lib/business-logic/__tests__/project-financials.test.ts lib/business-logic/__tests__/project-balance.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Run required checks**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add lib/business-logic/project-balance.ts lib/business-logic/__tests__/project-balance.test.ts lib/business-logic/project-financials.ts lib/business-logic/__tests__/project-financials.test.ts
git commit -m "refactor: extraer calculo puro de balance"
```

---

## Task 3: Remove Top-Level CreditApplied Compatibility

**Files:**
- Modify: `lib/validations/payment-validations.ts`
- Modify: `lib/validations/__tests__/payment-validations.test.ts`
- Modify: `app/api/payments/route.ts`
- Modify: `app/api/payments/__tests__/route.test.ts`
- Modify: `components/forms/payments/payment-to-project-form.tsx`
- Modify: `components/forms/payments/payment-to-customer-form.tsx`
- Test: `npm test -- --run lib/validations/__tests__/payment-validations.test.ts app/api/payments/__tests__/route.test.ts`

- [ ] **Step 1: Confirm current top-level credit usage**

Run:

```bash
rg -n "creditApplied|legacyCreditApplied" lib/validations/payment-validations.ts app/api/payments/route.ts components/forms/payments app/api/payments/__tests__/route.test.ts lib/validations/__tests__/payment-validations.test.ts
```

Expected: top-level `creditApplied` exists in schema, payload mapper, forms or tests.

- [ ] **Step 2: Update validation tests first**

In `lib/validations/__tests__/payment-validations.test.ts`, change tests that expect top-level `creditApplied` to assert allocation-level credit only.

Use this valid API body shape:

```ts
const validPayment = {
  type: 'Project',
  customerId: '00000000-0000-0000-0000-000000000001',
  amount: 90000,
  currency: 'CLP',
  date: '2026-06-02T00:00:00.000Z',
  paymentMethodId: '00000000-0000-0000-0000-000000000002',
  reference: null,
  notes: null,
  selectedInstallments: null,
  allocations: [
    {
      projectId: '00000000-0000-0000-0000-000000000003',
      allocatedAmount: 90000,
      creditApplied: 10000,
    },
  ],
}
```

Remove expectations that `result.data.creditApplied` exists at top level. Assert:

```ts
expect(result.data.allocations[0].creditApplied).toBe(10000)
expect('creditApplied' in result.data).toBe(false)
```

- [ ] **Step 3: Run validation tests and verify failure**

Run:

```bash
npm test -- --run lib/validations/__tests__/payment-validations.test.ts
```

Expected: tests fail while schema still includes top-level `creditApplied`.

- [ ] **Step 4: Remove top-level creditApplied from API schema**

In `lib/validations/payment-validations.ts`, remove this field from `createPaymentApiSchema`:

```ts
creditApplied: z.coerce
  .number()
  .min(0)
  .refine(hasMaxTwoDecimalPlaces, maxTwoDecimalsMessage)
  .optional()
  .default(0),
```

Remove the legacy conversion in `.superRefine`:

```ts
const legacyCreditApplied =
  data.type === 'Project' && index === 0 && allocation.creditApplied === 0
    ? data.creditApplied
    : 0
```

Replace:

```ts
const creditToApply = addMoney(allocation.creditApplied, legacyCreditApplied)
```

with:

```ts
const creditToApply = allocation.creditApplied
```

Remove `addMoney` from imports if it becomes unused.

- [ ] **Step 5: Remove legacy normalization from payment route**

In `app/api/payments/route.ts`, remove destructuring of:

```ts
creditApplied: legacyCreditApplied,
```

Replace allocation normalization:

```ts
const parsedAllocationCreditTotal = moneyToNumber(
  sumMoney(rawAllocations.map((allocation) => allocation.creditApplied ?? 0))
)
const allocations: NormalizedAllocation[] = rawAllocations.map((allocation, index) => ({
  ...allocation,
  creditApplied:
    index === 0 &&
    type === 'Project' &&
    parsedAllocationCreditTotal === 0 &&
    legacyCreditApplied > 0
      ? legacyCreditApplied
      : (allocation.creditApplied ?? 0),
}))
```

with:

```ts
const allocations: NormalizedAllocation[] = rawAllocations.map((allocation) => ({
  ...allocation,
  creditApplied: allocation.creditApplied ?? 0,
}))
```

Remove this legacy validation:

```ts
const legacyCreditToApply = legacyCreditApplied || 0
if (legacyCreditToApply > 0 && type !== 'Project') {
  return NextResponse.json(
    { error: 'El crédito top-level solo puede aplicarse a pagos de proyecto' },
    { status: 400 }
  )
}
```

- [ ] **Step 6: Ensure forms send allocation-level credit**

In `components/forms/payments/payment-to-project-form.tsx`, ensure payload is:

```ts
allocations: [
  {
    projectId: selectedProject.id,
    allocatedAmount: values.amount,
    creditApplied: values.creditApplied ?? 0,
  },
],
```

and does not include top-level `creditApplied`.

In `components/forms/payments/payment-to-customer-form.tsx`, ensure each allocation keeps:

```ts
creditApplied: form.getValues(`allocations.${index}.creditApplied`) || 0
```

and the payload does not include top-level `creditApplied`.

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm test -- --run lib/validations/__tests__/payment-validations.test.ts app/api/payments/__tests__/route.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 8: Run required checks**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 9: Commit**

```bash
git add lib/validations/payment-validations.ts lib/validations/__tests__/payment-validations.test.ts app/api/payments/route.ts app/api/payments/__tests__/route.test.ts components/forms/payments/payment-to-project-form.tsx components/forms/payments/payment-to-customer-form.tsx
git commit -m "refactor: eliminar credito legacy en pagos"
```

---

## Task 4: Create Payment Use Case Boundary

**Files:**
- Create: `lib/use-cases/payments/types.ts`
- Create: `lib/use-cases/payments/create-payment.ts`
- Create: `lib/use-cases/payments/__tests__/create-payment.test.ts`
- Modify: `app/api/payments/route.ts`
- Modify: `app/api/payments/__tests__/route.test.ts`
- Test: `npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts app/api/payments/__tests__/route.test.ts`

- [ ] **Step 1: Create use-case types**

Create `lib/use-cases/payments/types.ts`:

```ts
import type { CreatePaymentApiBody } from '@/lib/validations/payment-validations'

export type CreatePaymentInput = CreatePaymentApiBody

export interface CreatePaymentResult {
  id: string
}
```

- [ ] **Step 2: Create a failing use-case test for validation delegation**

Create `lib/use-cases/payments/__tests__/create-payment.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPayment } from '../create-payment'

vi.mock('@/lib/db', () => ({
  prisma: {
    customer: { findUnique: vi.fn() },
    paymentMethod: { findUnique: vi.fn() },
    project: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

describe('createPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza pago Project con multiples allocations antes de abrir transaccion', async () => {
    await expect(
      createPayment({
        type: 'Project',
        customerId: 'customer-1',
        amount: 100000,
        currency: 'CLP',
        date: '2026-06-02T00:00:00.000Z',
        paymentMethodId: 'method-1',
        reference: null,
        notes: null,
        selectedInstallments: null,
        allocations: [
          { projectId: 'project-1', allocatedAmount: 50000, creditApplied: 0 },
          { projectId: 'project-2', allocatedAmount: 50000, creditApplied: 0 },
        ],
      })
    ).rejects.toMatchObject({
      message: 'Pago tipo "Project" debe tener exactamente 1 asignación',
      statusCode: 400,
    })
  })
})
```

- [ ] **Step 3: Run the use-case test and verify it fails**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts
```

Expected: fails because `create-payment.ts` does not exist.

- [ ] **Step 4: Create the initial use-case wrapper**

Create `lib/use-cases/payments/create-payment.ts`:

```ts
import { NextResponse } from 'next/server'

import { BusinessError } from '@/lib/api-handler'
import { validatePaymentType } from '@/lib/validations/payment-business-rules'
import type { CreatePaymentInput, CreatePaymentResult } from './types'

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const typeValidation = validatePaymentType(input.type, input.allocations)
  if (!typeValidation.valid) {
    throw new BusinessError(typeValidation.error!, 400)
  }

  throw new BusinessError('createPayment use case is not fully wired yet', 501)
}

export function paymentResultToResponse(result: CreatePaymentResult) {
  return NextResponse.json(result, { status: 201 })
}
```

This is intentionally minimal. It establishes the boundary and passes the first failing test without moving the full payment route yet.

- [ ] **Step 5: Run use-case test**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts
```

Expected: test passes.

- [ ] **Step 6: Move payment route logic in one controlled block**

In `app/api/payments/route.ts`, move the current POST body logic into `createPayment` incrementally:

1. Move helper types near the POST path from `route.ts` to `lib/use-cases/payments/create-payment.ts`.
2. Move DB validation and transaction code unchanged.
3. Keep HTTP response creation in `route.ts`.
4. Keep `withApiHandler<CreatePaymentApiBody>` in `route.ts`.

The final POST shape in `app/api/payments/route.ts` should be:

```ts
export const POST = withApiHandler<CreatePaymentApiBody>(
  async (_request, logger, { body }) => {
    const payment = await createPayment(body, logger)
    return NextResponse.json(payment, { status: 201 })
  },
  {
    bodySchema: createPaymentApiSchema,
    fallbackError: 'Error al crear pago',
  }
)
```

Update `createPayment` signature to:

```ts
export async function createPayment(
  input: CreatePaymentInput,
  logger: LoggerLike
): Promise<PaymentCreateResult> {
```

Define `LoggerLike` locally:

```ts
interface LoggerLike {
  child: (context: Record<string, unknown>) => LoggerLike
  info: (contextOrMessage?: unknown, message?: string) => void
  debug: (contextOrMessage?: unknown, message?: string) => void
  warn: (contextOrMessage?: unknown, message?: string) => void
}
```

- [ ] **Step 7: Run payment route tests**

Run:

```bash
npm test -- --run app/api/payments/__tests__/route.test.ts lib/use-cases/payments/__tests__/create-payment.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 8: Run required checks**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 9: Commit**

```bash
git add lib/use-cases/payments/types.ts lib/use-cases/payments/create-payment.ts lib/use-cases/payments/__tests__/create-payment.test.ts app/api/payments/route.ts app/api/payments/__tests__/route.test.ts
git commit -m "refactor: extraer caso de uso de creacion de pagos"
```

---

## Task 5: Decide ProjectApplication Future With Evidence

**Files:**
- Modify: `docs/project/financial-model-audit.md`
- Read: `prisma/schema.prisma`
- Read: `lib/queries/project-list.ts`
- Read: `lib/business-logic/project-financials.ts`
- Read: `app/api/payments/route.ts`
- Read: `app/api/projects/[id]/adjustments/route.ts`

- [ ] **Step 1: Inventory ProjectApplication write paths**

Run:

```bash
rg -n "projectApplication\\.(create|createMany)|ProjectApplication|sourceType" app lib prisma --glob '*.{ts,tsx,prisma}'
```

Expected: write paths include payment creation and project adjustment creation.

- [ ] **Step 2: Inventory ProjectApplication read paths**

Run:

```bash
rg -n "ProjectApplication|projectApplication|appliedCashTotal|appliedCreditTotal|settledTotal" app lib prisma --glob '*.{ts,tsx,prisma,sql}'
```

Expected: read paths mainly go through `ProjectFinancials` view and financial DTOs.

- [ ] **Step 3: Append decision matrix to audit**

Append to `docs/project/financial-model-audit.md`:

```md
## ProjectApplication Decision Matrix

### Keep For Now

Keep `ProjectApplication` in the current implementation if all are true:

- `ProjectFinancials` needs to distinguish `CASH`, `CUSTOMER_CREDIT`, and `ADJUSTMENT`.
- Existing reports/UI use those categories or tests assert them.
- Removing it would require a schema migration touching payments, credits and adjustments in the same release.

### Future Simplification Candidate

Consider replacing `ProjectApplication` with a more explicit `ProjectLedgerEntry` only if:

- payment creation has already moved to a use case;
- tests cover cash, credit, adjustment, overpayment and deletion reversal;
- the migration can preserve existing historical rows;
- `PaymentAllocation` and `CreditTransaction` semantics are not enough to derive the same view without ambiguity.

### Current Decision

Do not remove `ProjectApplication` in this phase. The simplification target is route/use-case boundaries and pure calculations first.
```

- [ ] **Step 4: Commit**

```bash
git add docs/project/financial-model-audit.md
git commit -m "docs: decidir futuro de project application"
```

---

## Task 6: Update Architecture And Implementation Docs

**Files:**
- Modify: `docs/project/architecture.md`
- Modify: `docs/project/implementation/2025-current.md`
- Test: `npm run lint`
- Test: `npm run typecheck`

- [ ] **Step 1: Update architecture financial section**

In `docs/project/architecture.md`, update "Modelo financiero vigente" to include:

```md
### Cálculos puros y previews

Los cálculos deterministas de balance viven en `lib/business-logic/project-balance.ts`. El frontend puede usar cálculos equivalentes para previews, pero el backend recalcula desde datos autoritativos antes de persistir.

### Compatibilidad legacy

`Project.balance` sigue existiendo en schema como campo legacy, pero no es fuente de verdad. `creditApplied` top-level fue eliminado del contrato API de pagos; el crédito aplicado se declara por allocation.
```

Only include the `creditApplied` sentence if Task 3 was completed.

- [ ] **Step 2: Add implementation log**

Append to `docs/project/implementation/2025-current.md`:

```md
### 2026-06-02 - Simplificación del núcleo financiero

- Auditado el modelo financiero cliente-proyecto-pago.
- Registrada ADR de simplificación financiera.
- Extraído cálculo puro de balance de proyecto.
- Eliminada compatibilidad legacy de `creditApplied` top-level en pagos.
- Extraído `POST /api/payments` hacia un caso de uso interno.
- Documentada decisión de mantener `ProjectApplication` en esta fase.
- Verificación: tests financieros focalizados, `npm run lint`, `npm run typecheck`.
```

Remove bullets for tasks not completed.

- [ ] **Step 3: Run final checks**

Run:

```bash
npm test -- --run lib/business-logic/__tests__ lib/validations/__tests__/payment-validations.test.ts app/api/payments/__tests__/route.test.ts app/api/payments/[id]/__tests__/route.test.ts
npm run lint
npm run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add docs/project/architecture.md docs/project/implementation/2025-current.md
git commit -m "docs: registrar simplificacion financiera"
```

---

## Execution Notes

- Do not remove `ProjectApplication` during this plan. It is too large a schema change for the first simplification pass.
- Do not remove `Project.balance` from Prisma schema during this plan. First prove there are no runtime dependencies and migrate historical data strategy separately.
- Do not move authoritative balances to frontend.
- Do not add import/export back.
- Treat payment deletion/reversal tests as critical.

## Self-Review

- Spec coverage: covers the user's priority flows: clientes, proyectos, pagos.
- Simplification coverage: removes one explicit legacy path, extracts pure calculations, slims payment route, and documents whether `ProjectApplication` is necessary.
- Risk control: each task has focused tests and commits.
- Business safety: backend remains authoritative for financial persistence.
- Known gap: full schema migration from `ProjectApplication` to a different ledger model is intentionally deferred until after use-case extraction and audit.

