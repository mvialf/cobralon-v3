# Financial Audit, Use Cases and Legacy Warnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear un visor de auditoria financiera por proyecto, migrar las siguientes rutas financieras gordas a use-cases y diagnosticar/cerrar warnings legacy de `Project.balance` sin tocar datos a ciegas.

**Architecture:** La fase 1 agrega una lectura agregada read-only para auditoria por proyecto basada en `ProjectFinancials`, `ProjectApplication`, `PaymentAllocation`, `CreditTransaction` y `ProjectAdjustment`; la UI solo expone trazabilidad y no recalcula saldos autoritativos. Las rutas financieras de escritura se adelgazan hacia use-cases, empezando por ajustes de proyecto porque alimentan directamente el ledger visible. La auditoria legacy se trata como deuda de datos: primero se reproduce, luego se inspeccionan IDs concretos y solo despues se decide si corresponde reconciliar `Project.balance`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma, Vitest, shadcn/ui, Tailwind CSS v4, Pino logger, Decimal/money helpers de Cobralon.

---

## Estado Actual

Estado al 2026-06-03: **pendiente / trabajo futuro**.

Este archivo no esta versionado todavia en Git en el workspace actual y describe una fase
posterior a la simplificacion de pagos ya completada. No se encontraron implementados aun:

- `lib/use-cases/projects/get-project-financial-audit.ts`
- `app/api/projects/[id]/financial-audit/route.ts`
- `components/dialogs/projects/project-financial-audit-dialog.tsx`
- `components/tables/project-financial-audit-table.tsx`
- `lib/use-cases/projects/create-project-adjustment.ts`
- `docs/project/legacy-balance-reconciliation.md`

Dependencias ya satisfechas por la fase anterior:

- `createPayment` ya es caso de uso financiero.
- `POST /api/payments` ya es adaptador HTTP.
- `creditApplied` top-level ya fue eliminado del contrato API.
- `ProjectApplication` sigue vigente y documentado.

Este plan debe ejecutarse como rama/fase nueva, empezando por baseline y auditoria de
datos actual. No asumir que los warnings legacy siguen siendo los mismos sin ejecutar
`npm run audit:important-data`.

---

## Real Scope

Este no es un cambio unico. Son tres lineas conectadas, pero con riesgos distintos:

1. **Visor financiero por proyecto**: viable en fase 1, pero requiere un endpoint agregado nuevo. Componer `GET /api/projects/[id]`, `GET /api/payments?projectId=...` y `GET /api/projects/[id]/adjustments` no alcanza para auditoria real porque no expone `ProjectApplication` ni el vinculo exacto con `CreditTransaction`.
2. **Migrar routes gordas a use-cases**: no conviene empezar por todas. La fase 1 migra rutas financieras acotadas y deja rutas grandes no financieras para una fase posterior.
3. **Cerrar warnings legacy**: no se debe hacer backfill masivo. La fase 1 crea un flujo reproducible de diagnostico y una decision documentada por cada warning actual.

## Non-Goals

- No modificar `prisma/schema.prisma`.
- No eliminar `Project.balance`.
- No eliminar ni redisenar `ProjectApplication`.
- No cambiar el contrato publico de `POST /api/payments`.
- No recalcular balances en frontend.
- No corregir datos legacy sin reporte actual, IDs concretos y validacion de ledger.
- No agregar acciones de edicion al visor de auditoria.
- No migrar todos los endpoints largos en una sola rama.

## Subagent Strategy

- **Subagente A - Audit viewer:** implementar endpoint read-only y tests de `GET /api/projects/[id]/financial-audit`.
- **Subagente B - UI viewer:** implementar dialog/componentes read-only del visor, usando el endpoint del subagente A cuando este listo.
- **Subagente C - Route refactors:** migrar `POST /api/projects/[id]/adjustments` a use-case; luego, si queda estable, migrar `POST /api/customers/[id]/credit/refund`.
- **Subagente D - Legacy audit:** reproducir `npm run audit:important-data`, inspeccionar warnings actuales y documentar decision. No edita datos.
- **Reviewer:** despues de cada commit, revisar invariantes financieras, contrato HTTP y ausencia de usos nuevos de `Project.balance` como fuente de verdad.

No ejecutar B antes de que A defina el DTO. No ejecutar correccion de datos legacy en paralelo con cambios financieros.

## Files

Create:

- `lib/use-cases/projects/get-project-financial-audit.ts`
- `lib/use-cases/projects/__tests__/get-project-financial-audit.test.ts`
- `app/api/projects/[id]/financial-audit/route.ts`
- `app/api/projects/[id]/financial-audit/__tests__/route.test.ts`
- `components/dialogs/projects/project-financial-audit-dialog.tsx`
- `components/tables/project-financial-audit-table.tsx`
- `lib/use-cases/projects/create-project-adjustment.ts`
- `lib/use-cases/projects/__tests__/create-project-adjustment.test.ts`
- Optional: `lib/use-cases/customers/refund-customer-credit.ts`
- Optional: `lib/use-cases/customers/__tests__/refund-customer-credit.test.ts`
- `docs/project/legacy-balance-reconciliation.md`

Modify:

- `app/projects/components/project-actions-cell.tsx`
- `app/api/projects/[id]/adjustments/route.ts`
- `app/api/projects/[id]/adjustments/__tests__/route.test.ts`
- Optional: `app/api/customers/[id]/credit/refund/route.ts`
- Optional: `app/api/customers/[id]/credit/refund/__tests__/route.test.ts`
- `docs/project/implementation/2025-current.md`

Do not modify:

- `prisma/schema.prisma`
- migrations, unless a later human-approved data reconciliation phase explicitly requires it.

---

## Baseline

- [ ] **Step 1: Confirmar estado del workspace**

Run:

```bash
git status --short
```

Expected: clean, or only intentional user changes that will not be touched.

- [ ] **Step 2: Ejecutar baseline financiero y routes relacionadas**

Run:

```bash
npm test -- --run app/api/projects/[id]/adjustments/__tests__/route.test.ts app/api/customers/[id]/credit/refund/__tests__/route.test.ts app/api/payments/[id]/__tests__/route.test.ts lib/use-cases/payments/__tests__/create-payment.test.ts lib/business-logic/__tests__
```

Expected: all tests pass before refactors.

- [ ] **Step 3: Ejecutar auditoria importante actual**

Run:

```bash
npm run audit:important-data
```

Expected:

- exit code `0` if there are no critical findings.
- generated JSON in `backups/audit-important-data-*.json`.
- do not commit files under `backups/`.

If this fails with DB connection errors, stop and report that the plan cannot diagnose legacy warnings without a reachable `DATABASE_URL`.

---

## Task 1: Use-case read-only para auditoria financiera de proyecto

**Files:**

- Create: `lib/use-cases/projects/get-project-financial-audit.ts`
- Create: `lib/use-cases/projects/__tests__/get-project-financial-audit.test.ts`

- [ ] **Step 1: Escribir test para project inexistente**

Create `lib/use-cases/projects/__tests__/get-project-financial-audit.test.ts` with this initial shape:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BusinessError } from '@/lib/api-handler'
import { prisma } from '@/lib/db'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'
import { getProjectFinancialAudit } from '../get-project-financial-audit'

vi.mock('@/lib/db', () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    projectApplication: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/business-logic/project-financials', () => ({
  getProjectFinancials: vi.fn(),
}))

describe('getProjectFinancialAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza proyecto inexistente', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    await expect(getProjectFinancialAudit('project-1')).rejects.toMatchObject({
      message: 'Proyecto no encontrado',
      statusCode: 404,
    })
    expect(getProjectFinancials).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Ejecutar test rojo**

Run:

```bash
npm test -- --run lib/use-cases/projects/__tests__/get-project-financial-audit.test.ts
```

Expected: fails because `get-project-financial-audit.ts` does not exist.

- [ ] **Step 3: Crear implementacion minima**

Create `lib/use-cases/projects/get-project-financial-audit.ts`:

```ts
import { BusinessError } from '@/lib/api-handler'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'
import { moneyToNumber } from '@/lib/business-logic/money'
import { prisma } from '@/lib/db'

export type ProjectFinancialAuditApplication = {
  id: string
  sourceType: 'CASH' | 'CUSTOMER_CREDIT' | 'ADJUSTMENT'
  amount: number
  createdAt: Date
  paymentId: string | null
  paymentAllocationId: string | null
  creditTransactionId: string | null
  projectAdjustmentId: string | null
  payment: {
    id: string
    date: Date
    amount: number
    type: 'Project' | 'Customer'
    reference: string | null
    paymentMethod: { id: string; name: string; icon: string | null } | null
  } | null
  paymentAllocation: {
    id: string
    allocatedAmount: number
  } | null
  creditTransaction: {
    id: string
    amount: number
    type: string
    description: string
    metadata: unknown
  } | null
  projectAdjustment: {
    id: string
    amount: number
    reason: string
    description: string | null
    appliedAt: Date
    adjustmentReason: { name: string; warningLevel: string } | null
  } | null
}

export async function getProjectFinancialAudit(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      projectNumber: true,
      projectName: true,
      totalAmount: true,
      currency: true,
      customer: { select: { id: true, name: true, phone: true } },
    },
  })

  if (!project) {
    throw new BusinessError('Proyecto no encontrado', 404)
  }

  const financials = await getProjectFinancials(projectId)
  if (!financials) {
    throw new BusinessError('Datos financieros del proyecto no encontrados', 404)
  }

  const applications = await prisma.projectApplication.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: {
      payment: {
        select: {
          id: true,
          date: true,
          amount: true,
          type: true,
          reference: true,
          paymentMethod: { select: { id: true, name: true, icon: true } },
        },
      },
      paymentAllocation: {
        select: { id: true, allocatedAmount: true },
      },
      creditTransaction: {
        select: { id: true, amount: true, type: true, description: true, metadata: true },
      },
      projectAdjustment: {
        select: {
          id: true,
          amount: true,
          reason: true,
          description: true,
          appliedAt: true,
          adjustmentReason: { select: { name: true, warningLevel: true } },
        },
      },
    },
  })

  const applicationRows: ProjectFinancialAuditApplication[] = applications.map((application) => ({
    id: application.id,
    sourceType: application.sourceType,
    amount: moneyToNumber(application.amount),
    createdAt: application.createdAt,
    paymentId: application.paymentId,
    paymentAllocationId: application.paymentAllocationId,
    creditTransactionId: application.creditTransactionId,
    projectAdjustmentId: application.projectAdjustmentId,
    payment: application.payment
      ? {
          ...application.payment,
          amount: moneyToNumber(application.payment.amount),
        }
      : null,
    paymentAllocation: application.paymentAllocation
      ? {
          id: application.paymentAllocation.id,
          allocatedAmount: moneyToNumber(application.paymentAllocation.allocatedAmount),
        }
      : null,
    creditTransaction: application.creditTransaction
      ? {
          ...application.creditTransaction,
          amount: moneyToNumber(application.creditTransaction.amount),
        }
      : null,
    projectAdjustment: application.projectAdjustment
      ? {
          ...application.projectAdjustment,
          amount: moneyToNumber(application.projectAdjustment.amount),
        }
      : null,
  }))

  return {
    project: {
      ...project,
      totalAmount: moneyToNumber(project.totalAmount),
    },
    financials,
    applications: applicationRows,
  }
}
```

- [ ] **Step 4: Ejecutar test verde**

Run:

```bash
npm test -- --run lib/use-cases/projects/__tests__/get-project-financial-audit.test.ts
```

Expected: test passes.

- [ ] **Step 5: Agregar test de mapeo completo**

Add a test that mocks:

```ts
vi.mocked(prisma.project.findUnique).mockResolvedValue({
  id: 'project-1',
  projectNumber: '1001',
  projectName: 'Proyecto auditado',
  totalAmount: { toString: () => '100000' },
  currency: 'CLP',
  customer: { id: 'customer-1', name: 'Cliente Uno', phone: '+56911111111' },
} as never)
vi.mocked(getProjectFinancials).mockResolvedValue({
  projectId: 'project-1',
  allocatedTotal: 80000,
  appliedCashTotal: 80000,
  appliedCreditTotal: 10000,
  adjustmentTotal: 5000,
  settledTotal: 95000,
  rawBalance: 5000,
  balance: 5000,
  overpayment: 0,
  totalPaid: 95000,
  percentPaid: 95,
  hasDebt: true,
})
vi.mocked(prisma.projectApplication.findMany).mockResolvedValue([
  {
    id: 'app-1',
    sourceType: 'CASH',
    amount: { toString: () => '80000' },
    createdAt: new Date('2026-06-02T00:00:00.000Z'),
    paymentId: 'payment-1',
    paymentAllocationId: 'allocation-1',
    creditTransactionId: null,
    projectAdjustmentId: null,
    payment: {
      id: 'payment-1',
      date: new Date('2026-06-02T00:00:00.000Z'),
      amount: { toString: () => '80000' },
      type: 'Project',
      reference: null,
      paymentMethod: { id: 'method-1', name: 'Efectivo', icon: null },
    },
    paymentAllocation: { id: 'allocation-1', allocatedAmount: { toString: () => '80000' } },
    creditTransaction: null,
    projectAdjustment: null,
  },
] as never)
```

Assert:

```ts
const audit = await getProjectFinancialAudit('project-1')
expect(audit.project.totalAmount).toBe(100000)
expect(audit.financials.balance).toBe(5000)
expect(audit.applications).toEqual([
  expect.objectContaining({
    id: 'app-1',
    sourceType: 'CASH',
    amount: 80000,
    payment: expect.objectContaining({ amount: 80000 }),
    paymentAllocation: { id: 'allocation-1', allocatedAmount: 80000 },
  }),
])
```

- [ ] **Step 6: Ejecutar use-case tests**

Run:

```bash
npm test -- --run lib/use-cases/projects/__tests__/get-project-financial-audit.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/use-cases/projects/get-project-financial-audit.ts lib/use-cases/projects/__tests__/get-project-financial-audit.test.ts
git commit -m "feat: agregar auditoria financiera de proyecto"
```

---

## Task 2: Endpoint read-only `GET /api/projects/[id]/financial-audit`

**Files:**

- Create: `app/api/projects/[id]/financial-audit/route.ts`
- Create: `app/api/projects/[id]/financial-audit/__tests__/route.test.ts`

- [ ] **Step 1: Escribir route test de contrato**

Create `app/api/projects/[id]/financial-audit/__tests__/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { BusinessError } from '@/lib/api-handler'
import { getProjectFinancialAudit } from '@/lib/use-cases/projects/get-project-financial-audit'
import { GET } from '../route'

vi.mock('@/lib/use-cases/projects/get-project-financial-audit', () => ({
  getProjectFinancialAudit: vi.fn(),
}))

const validProjectId = '00000000-0000-0000-0000-000000000001'

function createRequest() {
  return new NextRequest(
    `http://localhost:3000/api/projects/${validProjectId}/financial-audit`,
    { method: 'GET' }
  )
}

function callGET(id = validProjectId) {
  return (GET as unknown as (
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
  ) => Promise<Response>)(createRequest(), { params: Promise.resolve({ id }) })
}

describe('GET /api/projects/[id]/financial-audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza UUID invalido', async () => {
    const response = await callGET('bad-id')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
    expect(getProjectFinancialAudit).not.toHaveBeenCalled()
  })

  it('retorna auditoria financiera del use-case', async () => {
    vi.mocked(getProjectFinancialAudit).mockResolvedValue({
      project: {
        id: validProjectId,
        projectNumber: '1001',
        projectName: null,
        totalAmount: 100000,
        currency: 'CLP',
        customer: { id: 'customer-1', name: 'Cliente Uno', phone: '+56911111111' },
      },
      financials: {
        projectId: validProjectId,
        allocatedTotal: 100000,
        appliedCashTotal: 100000,
        appliedCreditTotal: 0,
        adjustmentTotal: 0,
        settledTotal: 100000,
        rawBalance: 0,
        balance: 0,
        overpayment: 0,
        totalPaid: 100000,
        percentPaid: 100,
        hasDebt: false,
      },
      applications: [],
    })

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.project.projectNumber).toBe('1001')
    expect(data.financials.balance).toBe(0)
    expect(getProjectFinancialAudit).toHaveBeenCalledWith(validProjectId)
  })

  it('traduce BusinessError del use-case', async () => {
    vi.mocked(getProjectFinancialAudit).mockRejectedValue(
      new BusinessError('Proyecto no encontrado', 404)
    )

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Proyecto no encontrado')
  })
})
```

- [ ] **Step 2: Ejecutar test rojo**

Run:

```bash
npm test -- --run app/api/projects/[id]/financial-audit/__tests__/route.test.ts
```

Expected: fails because route does not exist.

- [ ] **Step 3: Crear route**

Create `app/api/projects/[id]/financial-audit/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/api-handler'
import { getProjectFinancialAudit } from '@/lib/use-cases/projects/get-project-financial-audit'

export const GET = withApiHandler(
  async (_request, logger, { params }) => {
    const audit = await getProjectFinancialAudit(params.id)
    logger.info({ projectId: params.id }, 'Project financial audit fetched successfully')
    return NextResponse.json(audit)
  },
  {
    validateUuidParams: ['id'],
    fallbackError: 'Error al obtener auditoria financiera del proyecto',
  }
)
```

- [ ] **Step 4: Ejecutar route tests**

Run:

```bash
npm test -- --run app/api/projects/[id]/financial-audit/__tests__/route.test.ts
```

Expected: all route tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/[id]/financial-audit/route.ts app/api/projects/[id]/financial-audit/__tests__/route.test.ts
git commit -m "feat: exponer auditoria financiera por proyecto"
```

---

## Task 3: Visor read-only de auditoria financiera en proyectos

**Files:**

- Create: `components/dialogs/projects/project-financial-audit-dialog.tsx`
- Create: `components/tables/project-financial-audit-table.tsx`
- Modify: `app/projects/components/project-actions-cell.tsx`

**Interface design notes:**

- Domain: ledger, applications, source type, reconciliation, derived balance, cash, credit, adjustment.
- Token mapping: use `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-muted`, `bg-success`, `bg-warning`, `bg-destructive`, `shadow-sm`, `rounded-lg`.
- Signature element: a reconciliation strip showing `Total proyecto -> CASH + CREDIT + ADJUSTMENT -> Balance derivado`, always labeling `ProjectFinancials` as fuente autoritativa.
- Avoid defaults: no marketing hero, no decorative cards, no recalculated frontend balance, no hidden financial sources.

- [ ] **Step 1: Crear tabla de applications**

Create `components/tables/project-financial-audit-table.tsx`:

```tsx
'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'

type AuditApplication = {
  id: string
  sourceType: 'CASH' | 'CUSTOMER_CREDIT' | 'ADJUSTMENT'
  amount: number
  createdAt: string
  paymentId: string | null
  paymentAllocationId: string | null
  creditTransactionId: string | null
  projectAdjustmentId: string | null
  payment: {
    id: string
    date: string
    reference: string | null
    paymentMethod: { name: string } | null
  } | null
  creditTransaction: {
    id: string
    type: string
    description: string
  } | null
  projectAdjustment: {
    id: string
    reason: string
    description: string | null
    appliedAt: string
  } | null
}

function sourceLabel(sourceType: AuditApplication['sourceType']) {
  if (sourceType === 'CASH') return 'Efectivo'
  if (sourceType === 'CUSTOMER_CREDIT') return 'Credito cliente'
  return 'Ajuste'
}

function sourceVariant(sourceType: AuditApplication['sourceType']) {
  if (sourceType === 'CASH') return 'default'
  if (sourceType === 'CUSTOMER_CREDIT') return 'secondary'
  return 'outline'
}

function applicationDetail(application: AuditApplication) {
  if (application.payment) {
    return application.payment.paymentMethod?.name ?? application.payment.reference ?? 'Pago'
  }
  if (application.creditTransaction) return application.creditTransaction.description
  if (application.projectAdjustment) return application.projectAdjustment.reason
  return 'Sin detalle asociado'
}

export function ProjectFinancialAuditTable({
  applications,
  currency,
  locale,
}: {
  applications: AuditApplication[]
  currency: string
  locale: string
}) {
  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No hay aplicaciones registradas para este proyecto.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Referencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell>{formatDate(application.createdAt, 'short', locale)}</TableCell>
              <TableCell>
                <Badge variant={sourceVariant(application.sourceType)}>
                  {sourceLabel(application.sourceType)}
                </Badge>
              </TableCell>
              <TableCell>{applicationDetail(application)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(application.amount, currency)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {application.paymentAllocationId ??
                  application.creditTransactionId ??
                  application.projectAdjustmentId ??
                  application.id}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Crear dialog de auditoria**

Create `components/dialogs/projects/project-financial-audit-dialog.tsx` with:

- fetch to `/api/projects/${projectId}/financial-audit`.
- loading skeleton.
- error `Alert`.
- summary strip with `totalAmount`, `appliedCashTotal`, `appliedCreditTotal`, `adjustmentTotal`, `settledTotal`, `balance`, `overpayment`.
- `ProjectFinancialAuditTable`.

Required implementation outline:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, FileSearch } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectFinancialAuditTable } from '@/components/tables/project-financial-audit-table'
import { formatCurrency } from '@/lib/format'
import { useConfiguration } from '@/hooks/use-configuration'

// Define ProjectFinancialAuditResponse matching Task 2 DTO.

export function ProjectFinancialAuditDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // state: audit, isLoading, error
  // fetch when open && projectId
  // render read-only audit
}
```

Do not add editing actions.

- [ ] **Step 3: Agregar accion en `project-actions-cell`**

Modify `app/projects/components/project-actions-cell.tsx`:

- import `FileSearch` from `lucide-react` if not present.
- import `ProjectFinancialAuditDialog`.
- add local state `isFinancialAuditOpen`.
- add a dropdown/menu action labeled `Auditoria financiera`.
- render the dialog next to existing project dialogs.

Keep existing actions unchanged.

- [ ] **Step 4: Ejecutar lint/typecheck para UI**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add components/dialogs/projects/project-financial-audit-dialog.tsx components/tables/project-financial-audit-table.tsx app/projects/components/project-actions-cell.tsx
git commit -m "feat: agregar visor de auditoria financiera"
```

---

## Task 4: Migrar ajuste de proyecto a use-case

**Files:**

- Create: `lib/use-cases/projects/create-project-adjustment.ts`
- Create: `lib/use-cases/projects/__tests__/create-project-adjustment.test.ts`
- Modify: `app/api/projects/[id]/adjustments/route.ts`
- Modify: `app/api/projects/[id]/adjustments/__tests__/route.test.ts`

- [ ] **Step 1: Escribir tests del use-case**

Create tests for:

1. proyecto inexistente -> `BusinessError('Proyecto no encontrado', 404)`.
2. balance financiero inexistente dentro de transaccion -> 404.
3. ajuste que excede `ProjectFinancials.balance` -> 400.
4. crea `ProjectAdjustment` y `ProjectApplication` tipo `ADJUSTMENT`.
5. respeta `reasonId` opcional y `appliedAt` personalizado.

Use the same mock style from `app/api/projects/[id]/adjustments/__tests__/route.test.ts`.

- [ ] **Step 2: Crear use-case**

Create `lib/use-cases/projects/create-project-adjustment.ts`:

```ts
import { BusinessError } from '@/lib/api-handler'
import { getProjectFinancials } from '@/lib/business-logic/project-financials'
import {
  greaterThanMoneyWithTolerance,
  money,
  moneyToFixed,
  moneyToNumber,
  subtractMoney,
} from '@/lib/business-logic/money'
import { prisma } from '@/lib/db'
import type { PrismaTransaction } from '@/lib/db/types'
import type { CreateProjectAdjustmentInput } from '@/lib/validations/project-adjustment-validations'

export async function createProjectAdjustment(
  projectId: string,
  input: CreateProjectAdjustmentInput
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, customerId: true },
  })

  if (!project) {
    throw new BusinessError('Proyecto no encontrado', 404)
  }

  const adjustment = await prisma.$transaction(async (tx: PrismaTransaction) => {
    const financials = await getProjectFinancials(projectId, tx)
    if (!financials) {
      throw new BusinessError('Proyecto no encontrado', 404)
    }

    if (greaterThanMoneyWithTolerance(subtractMoney(input.amount, financials.balance), 0)) {
      throw new BusinessError(
        `El ajuste excede el balance. Máximo ajuste permitido: ${moneyToFixed(financials.balance)}`,
        400
      )
    }

    const adjustment = await tx.projectAdjustment.create({
      data: {
        projectId,
        amount: money(input.amount),
        reason: input.reason,
        reasonId: input.reasonId || null,
        description: input.description || null,
        appliedAt: input.appliedAt || new Date(),
      },
    })

    await tx.projectApplication.create({
      data: {
        projectId,
        customerId: project.customerId,
        amount: money(input.amount),
        sourceType: 'ADJUSTMENT',
        projectAdjustmentId: adjustment.id,
        createdAt: adjustment.createdAt,
      },
    })

    return adjustment
  })

  return {
    ...adjustment,
    amount: moneyToNumber(adjustment.amount),
  }
}
```

- [ ] **Step 3: Adelgazar route POST**

Modify `app/api/projects/[id]/adjustments/route.ts`:

- keep GET as-is.
- replace POST internals with:

```ts
const adjustment = await createProjectAdjustment(params.id, body)
return NextResponse.json(adjustment, { status: 201 })
```

- remove unused financial imports from the route.

- [ ] **Step 4: Separar route tests de use-case tests**

In `app/api/projects/[id]/adjustments/__tests__/route.test.ts`:

- mock `createProjectAdjustment`.
- keep route tests for UUID, Zod invalid body, 201 response and BusinessError translation.
- remove duplicated Prisma transaction assertions from route tests because they are now covered in use-case tests.

- [ ] **Step 5: Ejecutar tests**

Run:

```bash
npm test -- --run lib/use-cases/projects/__tests__/create-project-adjustment.test.ts app/api/projects/[id]/adjustments/__tests__/route.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add lib/use-cases/projects/create-project-adjustment.ts lib/use-cases/projects/__tests__/create-project-adjustment.test.ts app/api/projects/[id]/adjustments/route.ts app/api/projects/[id]/adjustments/__tests__/route.test.ts
git commit -m "refactor: extraer use case de ajustes de proyecto"
```

---

## Task 5: Diagnosticar y cerrar warnings legacy actuales

**Files:**

- Create: `docs/project/legacy-balance-reconciliation.md`
- Modify: `docs/project/implementation/2025-current.md`

- [ ] **Step 1: Ejecutar auditoria**

Run:

```bash
npm run audit:important-data
```

Expected: report under `backups/`. Do not commit it.

- [ ] **Step 2: Identificar warnings actuales**

Open the newest report:

```bash
ls -t backups/audit-important-data-*.json | head -1
```

Then inspect:

```bash
node -e "const fs=require('fs'); const p=process.argv[1]; const r=JSON.parse(fs.readFileSync(p,'utf8')); const c=r.checks.find(c=>c.id==='legacy-project-balance-differs-from-financials'); console.log(JSON.stringify(c,null,2));" "$(ls -t backups/audit-important-data-*.json | head -1)"
```

Expected: exact `totalCount` and rows.

- [ ] **Step 3: Si `totalCount === 0`, documentar cierre**

Create `docs/project/legacy-balance-reconciliation.md`:

```md
# Legacy Project Balance Reconciliation

Fecha: 2026-06-02

## Resultado

`npm run audit:important-data` no reporta filas actuales en
`legacy-project-balance-differs-from-financials`.

## Decision

No se ejecuta correccion de datos. `ProjectFinancials` sigue siendo la fuente autoritativa
y `Project.balance` permanece como campo legacy/compatibilidad.

## Seguimiento

Si el warning reaparece, revisar los IDs reportados contra:

- `ProjectFinancials`
- `PaymentAllocation`
- `project_applications`
- `project_adjustments`
- `credit_transactions`
```

Update `docs/project/implementation/2025-current.md` with the new current result.

- [ ] **Step 4: Si `totalCount > 0`, documentar IDs y no corregir todavia**

Create `docs/project/legacy-balance-reconciliation.md`:

```md
# Legacy Project Balance Reconciliation

Fecha: 2026-06-02

## Warning actual

`legacy-project-balance-differs-from-financials` reporta N filas.

| projectId | projectNumber | legacyBalance | derivedBalance | difference | decision |
| --- | --- | ---: | ---: | ---: | --- |
| ... | ... | ... | ... | ... | Pendiente de inspeccion |

## Regla de decision

- Si `ProjectFinancials`, `PaymentAllocation`, `project_applications`,
  `project_adjustments` y `credit_transactions` son consistentes, reconciliar
  solo `Project.balance` para esos IDs concretos en una fase aprobada.
- Si falta una application, adjustment o credit transaction, corregir primero la fuente.
- No ejecutar backfill masivo.
```

Populate the table with real rows from the report.

- [ ] **Step 5: Commit de diagnostico**

```bash
git add docs/project/legacy-balance-reconciliation.md docs/project/implementation/2025-current.md
git commit -m "docs: documentar conciliacion de balances legacy"
```

---

## Task 6: Optional Wave - Migrar refund de credito de cliente

Do this only after Tasks 1-5 pass. This is high-risk financial logic and should be its own commit.

**Files:**

- Create: `lib/use-cases/customers/refund-customer-credit.ts`
- Create: `lib/use-cases/customers/__tests__/refund-customer-credit.test.ts`
- Modify: `app/api/customers/[id]/credit/refund/route.ts`
- Modify: `app/api/customers/[id]/credit/refund/__tests__/route.test.ts`

Use-case public signature:

```ts
export async function refundCustomerCredit(
  customerId: string,
  input: RefundCreditFormData,
  logger: LoggerLike
)
```

Must preserve:

- lock via `lockCustomerCreditBalance(customerId, tx)`.
- recalculation via `getCustomerCreditBalanceDetails(customerId, tx)`.
- validation via `canRefundCredit(input.amount, currentBalance.availableBalance)`.
- `CreditTransaction` type `WITHDRAWAL` with negative amount.
- returned customer includes `creditBalance`, `rawBalance` and `availableBalance`.

Required tests:

- customer missing -> 404 before transaction.
- lock failure -> 404 inside transaction.
- insufficient credit -> 400.
- creates `WITHDRAWAL` with `negateMoney(input.amount)`.
- reads final balance after ledger write.
- route test mocks use-case and keeps only HTTP contract.

Commit:

```bash
git commit -m "refactor: extraer use case de devolucion de credito"
```

---

## Task 7: Optional Wave - Migrar DELETE de pago a use-case

Do this only after refund use-case is stable. This touches reversal accounting.

**Files:**

- Create: `lib/use-cases/payments/delete-payment.ts`
- Create: `lib/use-cases/payments/__tests__/delete-payment.test.ts`
- Modify: `app/api/payments/[id]/route.ts`
- Modify: `app/api/payments/[id]/__tests__/route.test.ts`

Use-case public signature:

```ts
export async function deletePayment(paymentId: string, logger: LoggerLike)
```

Must preserve:

- 404 if payment missing.
- find linked `CreditTransaction` rows by `paymentId`.
- reversal matrix:
  - `OVERPAYMENT` positive -> negative `ADJUSTMENT`.
  - `APPLIED` negative -> positive `ADJUSTMENT`.
- metadata fields:
  - `reversedTransactionId`
  - `reversedType`
  - `reversedAmount`
  - `deletedPaymentId`
- hard delete of `Payment`, relying on cascade for allocations/installments.

Required tests:

- no credit transactions -> deletes payment without `createMany`.
- one `OVERPAYMENT` -> creates negative adjustment.
- one `APPLIED` -> creates positive adjustment.
- mixed transactions -> creates both reversals.
- route test mocks use-case and keeps only HTTP contract.

Commit:

```bash
git commit -m "refactor: extraer use case de eliminacion de pagos"
```

---

## Final Verification

- [ ] **Step 1: Suite focalizada**

Run:

```bash
npm test -- --run lib/use-cases/projects/__tests__ app/api/projects/[id]/financial-audit/__tests__/route.test.ts app/api/projects/[id]/adjustments/__tests__/route.test.ts app/api/customers/[id]/credit/refund/__tests__/route.test.ts app/api/payments/[id]/__tests__/route.test.ts lib/business-logic/__tests__
```

Expected: all pass.

- [ ] **Step 2: Verificacion obligatoria**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both pass.

- [ ] **Step 3: Estado final**

Run:

```bash
git status --short
git log --oneline -8
```

Expected: working tree clean and phase commits visible.

## Review Checklist

- [ ] El visor no usa `Project.balance` como fuente de verdad.
- [ ] El visor muestra `ProjectFinancials` como resumen autoritativo.
- [ ] El visor expone `ProjectApplication` y sus relaciones sin crear datos.
- [ ] `POST /api/projects/[id]/adjustments` queda como adaptador HTTP.
- [ ] La creacion de ajustes sigue creando `ProjectApplication` tipo `ADJUSTMENT`.
- [ ] No hay migraciones DB.
- [ ] No se commitean reportes en `backups/`.
- [ ] No se ejecuta reconciliacion de datos sin aprobacion explicita.
- [ ] `npm run lint` y `npm run typecheck` pasan.
