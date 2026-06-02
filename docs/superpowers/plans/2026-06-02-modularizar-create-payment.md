# Modularizar createPayment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modularizar internamente `createPayment` y mover cobertura financiera crítica desde la route hacia el caso de uso, sin cambiar comportamiento, contrato API, DB ni `ProjectApplication`.

**Architecture:** `POST /api/payments` debe seguir siendo un adaptador HTTP delgado. `createPayment` mantiene la autoridad financiera, pero se divide en helpers privados dentro del mismo archivo para separar validación, carga de entidades, creación del pago, crédito aplicado, `ProjectApplication` y sobrepago. FIFO sigue siendo preview/cálculo externo; el use-case solo valida y persiste allocations recibidas.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, Vitest, React Query, Zod, Decimal/money helpers de Cobralon.

---

## Non-Goals

- No modificar `prisma/schema.prisma`.
- No eliminar ni rediseñar `ProjectApplication`.
- No eliminar `Project.balance`.
- No reintroducir `PaymentToProjectDialog`.
- No hacer que `createPayment` calcule FIFO. FIFO se prueba en `lib/business-logic/payment-fifo.ts`; `createPayment` persiste allocations.
- No cambiar el contrato de `POST /api/payments`.

## Files

- Modify: `lib/use-cases/payments/create-payment.ts`
  - Mantener `createPayment(input, logger)` como API pública.
  - Agregar helpers privados en el mismo archivo.
  - No exportar helpers en esta fase.
- Modify: `lib/use-cases/payments/__tests__/create-payment.test.ts`
  - Agregar matriz de tests financieros del caso de uso.
  - Usar mocks de Prisma y de helpers existentes.
- Modify: `app/api/payments/__tests__/route.test.ts`
  - Reducir duplicación financiera después de mover tests al use-case.
  - Mantener tests HTTP de contrato, parsing y traducción de errores.
- Optional modify: `docs/project/implementation/2025-current.md`
  - Actualizar solo si el refactor termina siendo significativo y estable.

## Baseline

- [ ] **Step 1: Confirmar workspace limpio**

Run:

```bash
git status --short
```

Expected: sin archivos modificados o solo cambios intencionales del usuario que no se tocarán.

- [ ] **Step 2: Ejecutar baseline focalizado**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts app/api/payments/__tests__/route.test.ts lib/business-logic/__tests__/payment-fifo.test.ts
```

Expected: todos los tests pasan antes del refactor.

---

### Task 1: Fortalecer tests del caso de uso

**Files:**
- Modify: `lib/use-cases/payments/__tests__/create-payment.test.ts`

- [ ] **Step 1: Agregar helpers de test para múltiples proyectos**

Agregar o reemplazar helpers locales para poder simular pagos 1:N sin repetir mocks:

```ts
function projectFinancials(projectId: string, balance: number, rawBalance = balance) {
  return {
    projectId,
    allocatedTotal: 0,
    appliedCashTotal: 0,
    appliedCreditTotal: 0,
    adjustmentTotal: 0,
    settledTotal: 0,
    rawBalance,
    balance,
    overpayment: Math.max(0, -rawBalance),
    totalPaid: 0,
    percentPaid: 0,
    hasDebt: balance > 0,
  }
}

function mockPaymentDependenciesForProjects(
  projects = [
    { id: 'project-1', customerId: 'customer-1', currency: 'CLP', projectNumber: '1001' },
  ]
) {
  vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'customer-1' } as never)
  vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
    id: 'method-1',
    commissionTiers: [],
  } as never)
  vi.mocked(prisma.project.findMany).mockResolvedValue(projects as never)
}
```

- [ ] **Step 2: Escribir test rojo para pago manual 1:N**

Agregar test:

```ts
it('crea pago Customer manual con múltiples allocations CASH', async () => {
  mockPaymentDependenciesForProjects([
    { id: 'project-1', customerId: 'customer-1', currency: 'CLP', projectNumber: '1001' },
    { id: 'project-2', customerId: 'customer-1', currency: 'CLP', projectNumber: '1002' },
  ])

  const txProjectApplication = { createMany: vi.fn() }
  const txCreditTransaction = { createMany: vi.fn() }
  const tx = {
    payment: {
      create: vi.fn().mockResolvedValue({
        id: 'payment-1',
        allocations: [
          { id: 'allocation-1', project: { id: 'project-1' }, allocatedAmount: 30000 },
          { id: 'allocation-2', project: { id: 'project-2' }, allocatedAmount: 70000 },
        ],
        installments: [],
      }),
    },
    installment: { update: vi.fn() },
    creditTransaction: txCreditTransaction,
    projectApplication: txProjectApplication,
  }
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never) as never)
  vi.mocked(getProjectsFinancials).mockResolvedValue(
    new Map([
      ['project-1', projectFinancials('project-1', 50000)],
      ['project-2', projectFinancials('project-2', 90000)],
    ])
  )

  await createPayment(
    {
      type: 'Customer',
      customerId: 'customer-1',
      amount: 100000,
      currency: 'CLP',
      date: new Date('2026-06-02T00:00:00.000Z'),
      paymentMethodId: 'method-1',
      reference: null,
      notes: null,
      selectedInstallments: null,
      allocations: [
        { projectId: 'project-1', allocatedAmount: 30000, creditApplied: 0 },
        { projectId: 'project-2', allocatedAmount: 70000, creditApplied: 0 },
      ],
    },
    logger
  )

  expect(tx.payment.create.mock.calls[0][0].data.allocations.create).toEqual([
    { projectId: 'project-1', allocatedAmount: expect.objectContaining({ toString: expect.any(Function) }) },
    { projectId: 'project-2', allocatedAmount: expect.objectContaining({ toString: expect.any(Function) }) },
  ])
  expect(txProjectApplication.createMany).toHaveBeenCalledWith({
    data: [
      expect.objectContaining({ projectId: 'project-1', sourceType: 'CASH' }),
      expect.objectContaining({ projectId: 'project-2', sourceType: 'CASH' }),
    ],
  })
})
```

- [ ] **Step 3: Run para verificar rojo o verde existente**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts
```

Expected: si falla por shape de mocks, ajustar solo el test hasta que pruebe el comportamiento real. Si pasa, conservarlo como cobertura de comportamiento existente.

- [ ] **Step 4: Agregar test de crédito aplicado por allocation**

Agregar test:

```ts
it('registra crédito APPLIED y ProjectApplication CUSTOMER_CREDIT por allocation', async () => {
  mockPaymentDependenciesForProjects()
  const txProjectApplication = { createMany: vi.fn() }
  const txCreditTransaction = { createMany: vi.fn() }
  const tx = {
    payment: {
      create: vi.fn().mockResolvedValue({
        id: 'payment-1',
        allocations: [
          { id: 'allocation-1', project: { id: 'project-1' }, allocatedAmount: 90000 },
        ],
        installments: [],
      }),
    },
    installment: { update: vi.fn() },
    creditTransaction: txCreditTransaction,
    projectApplication: txProjectApplication,
  }
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never) as never)
  vi.mocked(getProjectsFinancials).mockResolvedValue(
    new Map([['project-1', projectFinancials('project-1', 100000)]])
  )
  vi.mocked(lockCustomerCreditBalance).mockResolvedValue(true)
  vi.mocked(getCustomerCreditBalance).mockResolvedValue(50000)

  await createPayment(
    {
      type: 'Project',
      customerId: 'customer-1',
      amount: 90000,
      currency: 'CLP',
      date: new Date('2026-06-02T00:00:00.000Z'),
      paymentMethodId: 'method-1',
      reference: null,
      notes: null,
      selectedInstallments: null,
      allocations: [{ projectId: 'project-1', allocatedAmount: 90000, creditApplied: 10000 }],
    },
    logger
  )

  expect(txCreditTransaction.createMany).toHaveBeenCalledWith({
    data: [
      expect.objectContaining({
        customerId: 'customer-1',
        paymentId: 'payment-1',
        projectId: 'project-1',
        type: 'APPLIED',
      }),
    ],
  })
  expect(Number(txCreditTransaction.createMany.mock.calls[0][0].data[0].amount)).toBe(-10000)
  expect(txProjectApplication.createMany.mock.calls[0][0].data).toEqual([
    expect.objectContaining({ sourceType: 'CASH', amount: expect.anything() }),
    expect.objectContaining({ sourceType: 'CUSTOMER_CREDIT', amount: expect.anything() }),
  ])
})
```

- [ ] **Step 5: Agregar test de sobrepago con crédito aplicado**

Agregar test:

```ts
it('no genera OVERPAYMENT cuando dinero nuevo más crédito cierran exactamente el balance', async () => {
  mockPaymentDependenciesForProjects()
  const txCreditTransaction = { createMany: vi.fn() }
  const tx = {
    payment: {
      create: vi.fn().mockResolvedValue({
        id: 'payment-1',
        allocations: [
          { id: 'allocation-1', project: { id: 'project-1' }, allocatedAmount: 80000 },
        ],
        installments: [],
      }),
    },
    installment: { update: vi.fn() },
    creditTransaction: txCreditTransaction,
    projectApplication: { createMany: vi.fn() },
  }
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never) as never)
  vi.mocked(getProjectsFinancials).mockResolvedValue(
    new Map([['project-1', projectFinancials('project-1', 100000)]])
  )
  vi.mocked(lockCustomerCreditBalance).mockResolvedValue(true)
  vi.mocked(getCustomerCreditBalance).mockResolvedValue(50000)

  await createPayment(
    {
      type: 'Project',
      customerId: 'customer-1',
      amount: 80000,
      currency: 'CLP',
      date: new Date('2026-06-02T00:00:00.000Z'),
      paymentMethodId: 'method-1',
      reference: null,
      notes: null,
      selectedInstallments: null,
      allocations: [{ projectId: 'project-1', allocatedAmount: 80000, creditApplied: 20000 }],
    },
    logger
  )

  const rows = txCreditTransaction.createMany.mock.calls.flatMap(([args]) => args.data)
  expect(rows.some((row) => row.type === 'OVERPAYMENT')).toBe(false)
})
```

- [ ] **Step 6: Ejecutar tests del use-case**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts
```

Expected: todos los tests de `createPayment` pasan.

- [ ] **Step 7: Commit**

Run:

```bash
git add lib/use-cases/payments/__tests__/create-payment.test.ts
git commit -m "test: cubrir pagos financieros en use case"
```

---

### Task 2: Extraer helpers privados de validación y carga

**Files:**
- Modify: `lib/use-cases/payments/create-payment.ts`

- [ ] **Step 1: Extraer tipos internos**

Mantener o agregar estos tipos cerca de los tipos existentes:

```ts
type LoadedPaymentEntities = {
  customer: NonNullable<Awaited<ReturnType<typeof prisma.customer.findUnique>>>
  paymentMethod: NonNullable<Awaited<ReturnType<typeof prisma.paymentMethod.findUnique>>>
  projects: Awaited<ReturnType<typeof prisma.project.findMany>>
}

type PaymentCommissionResult = ReturnType<typeof computePaymentCommission>
```

If TypeScript rechaza `ReturnType` por inferencia de Prisma mock, definir tipos explícitos mínimos:

```ts
type LoadedPaymentMethod = {
  id: string
  commissionTiers: Array<{
    minInstallments: number | null
    maxInstallments: number | null
    percentageFee: Prisma.Decimal | number
    fixedFee: Prisma.Decimal | number
  }>
}

type LoadedProject = {
  id: string
  customerId: string
  currency: string
  projectNumber: string
}
```

- [ ] **Step 2: Extraer `normalizeAllocations`**

Agregar helper privado:

```ts
function normalizeAllocations(rawAllocations: CreatePaymentInput['allocations']): NormalizedAllocation[] {
  return rawAllocations.map((allocation) => ({
    ...allocation,
    creditApplied: allocation.creditApplied ?? 0,
  }))
}
```

Reemplazar el `map` inline al inicio de `createPayment`.

- [ ] **Step 3: Extraer `validatePaymentShape`**

Agregar helper privado:

```ts
function validatePaymentShape(
  type: CreatePaymentInput['type'],
  amount: number,
  allocations: NormalizedAllocation[],
  paymentLogger: LoggerLike
) {
  const typeValidation = validatePaymentType(type, allocations)
  if (!typeValidation.valid) {
    paymentLogger.warn(
      { type, allocationCount: allocations.length },
      'Payment type validation failed'
    )
    throw new BusinessError(typeValidation.error!, 400)
  }

  const duplicatesValidation = validateNoDuplicateProjects(allocations)
  if (!duplicatesValidation.valid) {
    paymentLogger.warn(
      { projectIds: allocations.map((a) => a.projectId) },
      'Duplicate project IDs detected'
    )
    throw new BusinessError(duplicatesValidation.error!, 400)
  }

  const sumValidation = validatePaymentApplicationSum(amount, allocations)
  if (!sumValidation.valid) {
    paymentLogger.warn(
      { expected: amount, actual: allocations.reduce((s, a) => s + a.allocatedAmount, 0) },
      'Allocation sum mismatch'
    )
    throw new BusinessError(sumValidation.error!, 400)
  }
}
```

- [ ] **Step 4: Extraer `loadPaymentEntities`**

Agregar helper privado:

```ts
async function loadPaymentEntities(
  customerId: string,
  paymentMethodId: string,
  projectIds: string[]
) {
  const [customerExists, paymentMethod, projects] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
      include: { commissionTiers: true },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, customerId: true, currency: true, projectNumber: true },
    }),
  ])

  return { customerExists, paymentMethod, projects }
}
```

- [ ] **Step 5: Extraer `validateLoadedEntities`**

Agregar helper privado:

```ts
function validateLoadedEntities(
  loaded: Awaited<ReturnType<typeof loadPaymentEntities>>,
  expected: { customerId: string; currency: string; projectIds: string[] },
  paymentLogger: LoggerLike
) {
  const { customerExists, paymentMethod, projects } = loaded

  if (!customerExists) {
    paymentLogger.warn('Customer not found')
    throw new BusinessError('El cliente no existe', 404)
  }

  if (!paymentMethod) {
    paymentLogger.warn('Payment method not found')
    throw new BusinessError('El método de pago no existe', 404)
  }

  if (projects.length !== expected.projectIds.length) {
    paymentLogger.warn(
      { expected: expected.projectIds.length, found: projects.length },
      'Some projects not found'
    )
    throw new BusinessError('Uno o más proyectos no existen', 404)
  }

  const customerValidation = validateSameCustomer(projects, expected.customerId)
  if (!customerValidation.valid) {
    paymentLogger.warn('Not all projects belong to same customer')
    throw new BusinessError(customerValidation.error!, 400)
  }

  const currencyValidation = validateSameCurrency(projects, expected.currency)
  if (!currencyValidation.valid) {
    paymentLogger.warn(
      { expected: expected.currency, found: projects.map((p) => p.currency) },
      'Currency mismatch'
    )
    throw new BusinessError(currencyValidation.error!, 400)
  }

  return { customer: customerExists, paymentMethod, projects }
}
```

- [ ] **Step 6: Reorganizar inicio de `createPayment`**

La primera mitad de `createPayment` debe quedar conceptualmente así:

```ts
const allocations = normalizeAllocations(rawAllocations)
const totalCreditToApply = getTotalCreditToApply(allocations)
const paymentLogger = logger.child({ type, customerId, amount, currency, allocationCount: allocations.length })
paymentLogger.info('Payment creation requested')

const projectIds = allocations.map((a) => a.projectId)
validatePaymentShape(type, amount, allocations, paymentLogger)

paymentLogger.debug('Validating customer, payment method and projects exist')
const loaded = await loadPaymentEntities(customerId, paymentMethodId, projectIds)
const { paymentMethod, projects } = validateLoadedEntities(
  loaded,
  { customerId, currency, projectIds },
  paymentLogger
)
paymentLogger.debug('All validations passed')
```

- [ ] **Step 7: Ejecutar tests de use-case**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts
```

Expected: pasa sin cambios de comportamiento.

- [ ] **Step 8: Ejecutar typecheck**

Run:

```bash
npm run typecheck
```

Expected: pasa.

- [ ] **Step 9: Commit**

Run:

```bash
git add lib/use-cases/payments/create-payment.ts
git commit -m "refactor: separar validaciones de createPayment"
```

---

### Task 3: Extraer helpers privados transaccionales

**Files:**
- Modify: `lib/use-cases/payments/create-payment.ts`

- [ ] **Step 1: Extraer `buildCommissionResult`**

Agregar helper:

```ts
function buildCommissionResult(
  amount: number,
  paymentMethod: { commissionTiers: Array<{ minInstallments: number | null; maxInstallments: number | null; percentageFee: unknown; fixedFee: unknown }> },
  selectedInstallments: number | null | undefined
) {
  const commissionTiers = paymentMethod.commissionTiers.map((t) => ({
    minInstallments: t.minInstallments,
    maxInstallments: t.maxInstallments,
    percentageFee: Number(t.percentageFee),
    fixedFee: Number(t.fixedFee),
  }))

  return computePaymentCommission(amount, commissionTiers, selectedInstallments)
}
```

- [ ] **Step 2: Extraer `createPaymentRecord`**

Agregar helper privado dentro del archivo:

```ts
async function createPaymentRecord(
  tx: PrismaTransaction,
  input: CreatePaymentInput,
  allocations: NormalizedAllocation[],
  commissionResult: ReturnType<typeof computePaymentCommission>
) {
  return tx.payment.create({
    data: {
      type: input.type,
      customerId: input.customerId,
      amount: money(input.amount),
      currency: input.currency,
      date: input.date,
      paymentMethodId: input.paymentMethodId,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
      selectedInstallments: input.selectedInstallments || null,
      commissionAmount: commissionResult ? money(commissionResult.commissionAmount) : null,
      netAmount: commissionResult ? money(commissionResult.netAmount) : null,
      commissionRate: commissionResult ? money(commissionResult.percentageFee) : null,
      commissionFixed: commissionResult ? money(commissionResult.fixedFee) : null,
      allocations: {
        create: allocations
          .filter((a) => greaterThanMoney(a.allocatedAmount, 0))
          .map((a) => ({
            projectId: a.projectId,
            allocatedAmount: money(a.allocatedAmount),
          })),
      },
      installments: generatePrismaInstallmentsCreate(
        input.amount,
        input.selectedInstallments,
        input.date,
        Decimal
      ),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      paymentMethod: { select: { id: true, name: true, icon: true } },
      allocations: {
        select: {
          id: true,
          projectId: true,
          allocatedAmount: true,
          project: {
            select: {
              id: true,
              projectNumber: true,
              projectName: true,
              totalAmount: true,
              currency: true,
            },
          },
        },
      },
      installments: {
        select: {
          id: true,
          installmentNumber: true,
          amount: true,
          netAmount: true,
          dueDate: true,
        },
        orderBy: { installmentNumber: 'asc' },
      },
    },
  })
}
```

- [ ] **Step 3: Extraer `updateInstallmentNetAmounts`**

Agregar helper:

```ts
async function updateInstallmentNetAmounts(
  tx: PrismaTransaction,
  payment: Awaited<ReturnType<typeof createPaymentRecord>>,
  commissionResult: ReturnType<typeof computePaymentCommission>,
  paymentLogger: LoggerLike
) {
  if (!commissionResult || payment.installments.length <= 1) return

  const installmentAmounts = payment.installments.map((inst) => moneyToNumber(inst.amount))
  const netAmounts = distributeNetToInstallments(installmentAmounts, commissionResult.netAmount)

  await Promise.all(
    payment.installments.map((inst, idx) =>
      tx.installment.update({
        where: { id: inst.id },
        data: { netAmount: money(netAmounts[idx]) },
      })
    )
  )

  paymentLogger.debug(
    { installmentCount: payment.installments.length },
    'Net amounts distributed to installments'
  )
}
```

- [ ] **Step 4: Extraer `applyCustomerCredit`**

Agregar helper privado:

```ts
async function applyCustomerCredit(params: {
  tx: PrismaTransaction
  customerId: string
  amount: number
  paymentId: string
  paymentDate: Date
  allocations: NormalizedAllocation[]
  initialFinancials: Awaited<ReturnType<typeof getProjectsFinancials>>
  totalCreditToApply: number
  paymentLogger: LoggerLike
}) {
  const appliedCreditTransactionByProject = new Map<string, string>()
  if (!greaterThanMoney(params.totalCreditToApply, 0)) return appliedCreditTransactionByProject

  const locked = await lockCustomerCreditBalance(params.customerId, params.tx)
  if (!locked) {
    throw new BusinessError('Cliente no encontrado durante validación de crédito', 404)
  }

  const customerCreditBalance = await getCustomerCreditBalance(params.customerId, params.tx)

  if (greaterThanMoneyWithTolerance(params.totalCreditToApply, customerCreditBalance)) {
    throw new BusinessError(
      `Crédito insuficiente. Disponible: ${formatCurrency(customerCreditBalance, 'CLP')}`,
      400
    )
  }

  for (const allocation of params.allocations) {
    const creditAmount = allocation.creditApplied
    if (!greaterThanMoney(creditAmount, 0)) continue

    const projectFinancials = params.initialFinancials.get(allocation.projectId)
    if (!projectFinancials) {
      throw new BusinessError('Proyecto no encontrado durante validación de crédito', 404)
    }

    const balanceAfterCash = moneyToNumber(
      maxMoney(0, subtractMoney(projectFinancials.balance, allocation.allocatedAmount))
    )
    const creditValidation = canApplyCredit(creditAmount, customerCreditBalance, balanceAfterCash)
    if (!creditValidation.valid) {
      throw new BusinessError(creditValidation.error!, 400)
    }
  }

  const rows = params.allocations
    .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
    .map((allocation) => {
      const creditTransactionId = randomUUID()
      appliedCreditTransactionByProject.set(allocation.projectId, creditTransactionId)
      return {
        id: creditTransactionId,
        customerId: params.customerId,
        amount: negateMoney(allocation.creditApplied),
        type: 'APPLIED' as const,
        description: `Crédito aplicado al pago ${params.paymentId.slice(0, 8)}`,
        paymentId: params.paymentId,
        projectId: allocation.projectId,
        metadata: {
          paymentAmount: params.amount,
          creditApplied: allocation.creditApplied,
          paymentDate: params.paymentDate.toISOString(),
        },
      }
    })

  if (rows.length > 0) {
    await (params.tx as ProjectApplicationWriter).creditTransaction.createMany({ data: rows })
  }

  params.paymentLogger.info(
    { paymentId: params.paymentId, creditApplied: params.totalCreditToApply, previousCredit: customerCreditBalance },
    'Credit applied successfully in transaction'
  )

  return appliedCreditTransactionByProject
}
```

- [ ] **Step 5: Extraer `createProjectApplications`**

Agregar helper privado:

```ts
async function createProjectApplications(params: {
  tx: PrismaTransaction
  projects: Array<{ id: string; customerId: string }>
  payment: Awaited<ReturnType<typeof createPaymentRecord>>
  allocations: NormalizedAllocation[]
  initialFinancials: Awaited<ReturnType<typeof getProjectsFinancials>>
  appliedCreditTransactionByProject: Map<string, string>
}) {
  const creditByProject = new Map(
    params.allocations
      .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
      .map((allocation) => [allocation.projectId, allocation.creditApplied])
  )
  const paymentAllocationByProject = new Map(
    params.payment.allocations.map((allocation) => [
      allocation.project.id,
      { id: allocation.id, amount: allocation.allocatedAmount },
    ])
  )
  const rows: ProjectApplicationCreateManyRow[] = []

  for (const project of params.projects) {
    const startingFinancials = params.initialFinancials.get(project.id)
    if (!startingFinancials) {
      throw new BusinessError('Proyecto no encontrado durante aplicación de pago', 404)
    }

    const allocation = paymentAllocationByProject.get(project.id)
    const cashAmount = allocation?.amount ?? 0
    const creditAmount = creditByProject.get(project.id) ?? 0

    if (allocation && greaterThanMoney(cashAmount, 0)) {
      rows.push({
        projectId: project.id,
        customerId: project.customerId,
        paymentId: params.payment.id,
        paymentAllocationId: allocation.id,
        amount: money(cashAmount),
        sourceType: 'CASH',
      })
    }

    if (greaterThanMoney(creditAmount, 0)) {
      const creditTransactionId = params.appliedCreditTransactionByProject.get(project.id)
      if (!creditTransactionId) {
        throw new BusinessError('No se pudo registrar la aplicación de crédito', 500)
      }
      rows.push({
        projectId: project.id,
        customerId: project.customerId,
        paymentId: params.payment.id,
        creditTransactionId,
        amount: money(creditAmount),
        sourceType: 'CUSTOMER_CREDIT',
      })
    }
  }

  if (rows.length > 0) {
    await (params.tx as ProjectApplicationWriter).projectApplication.createMany({ data: rows })
  }
}
```

- [ ] **Step 6: Extraer `createOverpaymentCredits`**

Agregar helper privado:

```ts
async function createOverpaymentCredits(params: {
  tx: PrismaTransaction
  projects: Array<{ id: string; customerId: string; projectNumber: string }>
  allocations: NormalizedAllocation[]
  initialFinancials: Awaited<ReturnType<typeof getProjectsFinancials>>
  paymentId: string
  amount: number
  paymentDate: Date
  paymentLogger: LoggerLike
}) {
  const creditByProject = new Map(
    params.allocations
      .filter((allocation) => greaterThanMoney(allocation.creditApplied, 0))
      .map((allocation) => [allocation.projectId, allocation.creditApplied])
  )
  const allocationByProject = new Map(
    params.allocations.map((allocation) => [allocation.projectId, allocation.allocatedAmount])
  )
  const rows: CreditTransactionCreateManyRow[] = []

  for (const project of params.projects) {
    const startingFinancials = params.initialFinancials.get(project.id)
    if (!startingFinancials) {
      throw new BusinessError('Proyecto no encontrado durante validación de sobrepago', 404)
    }

    const allocatedAmount = allocationByProject.get(project.id) ?? 0
    const creditAppliedToProject = creditByProject.get(project.id) ?? 0
    const cashCapacityAfterCredit = maxMoney(
      0,
      subtractMoney(startingFinancials.balance, creditAppliedToProject)
    )
    const overpaymentAmount = maxMoney(0, subtractMoney(allocatedAmount, cashCapacityAfterCredit))

    if (!greaterThanMoney(overpaymentAmount, 0)) continue

    const rawBalanceAfterPayment = subtractMoney(
      subtractMoney(startingFinancials.rawBalance, allocatedAmount),
      creditAppliedToProject
    )
    const rawBalanceAfterPaymentNumber = moneyToNumber(rawBalanceAfterPayment)
    const overpaymentAmountNumber = moneyToNumber(overpaymentAmount)

    params.paymentLogger.info(
      {
        projectId: project.id,
        projectNumber: project.projectNumber,
        previousBalance: startingFinancials.balance,
        rawBalanceAfterPayment: rawBalanceAfterPaymentNumber,
        overpaymentAmount: overpaymentAmountNumber,
      },
      'Overpayment detected - converting to customer credit'
    )

    rows.push({
      id: randomUUID(),
      customerId: project.customerId,
      amount: money(overpaymentAmount),
      type: 'OVERPAYMENT',
      description: `Sobrepago generado en proyecto P-${project.projectNumber}`,
      paymentId: params.paymentId,
      projectId: project.id,
      metadata: {
        paymentAmount: params.amount,
        creditApplied: creditAppliedToProject,
        projectBalance: rawBalanceAfterPaymentNumber,
        overpaymentAmount: overpaymentAmountNumber,
        paymentDate: params.paymentDate.toISOString(),
      },
    })
  }

  if (rows.length > 0) {
    await (params.tx as ProjectApplicationWriter).creditTransaction.createMany({ data: rows })
  }
}
```

- [ ] **Step 7: Reescribir bloque transaccional usando helpers**

El cuerpo de `$transaction` debe quedar con esta forma:

```ts
const payment = await prisma.$transaction(async (tx: PrismaTransaction) => {
  const initialFinancials = await getProjectsFinancials(projectIds, tx)
  const newPayment = await createPaymentRecord(tx, input, allocations, commissionResult)

  paymentLogger.debug({ paymentId: newPayment.id }, 'Payment created in transaction')

  await updateInstallmentNetAmounts(tx, newPayment, commissionResult, paymentLogger)

  const appliedCreditTransactionByProject = await applyCustomerCredit({
    tx,
    customerId,
    amount,
    paymentId: newPayment.id,
    paymentDate,
    allocations,
    initialFinancials,
    totalCreditToApply,
    paymentLogger,
  })

  await createProjectApplications({
    tx,
    projects,
    payment: newPayment,
    allocations,
    initialFinancials,
    appliedCreditTransactionByProject,
  })

  paymentLogger.debug({ projectIds }, 'Checking for overpayments in transaction')

  await createOverpaymentCredits({
    tx,
    projects,
    allocations,
    initialFinancials,
    paymentId: newPayment.id,
    amount,
    paymentDate,
    paymentLogger,
  })

  return newPayment
})
```

- [ ] **Step 8: Ejecutar tests financieros focalizados**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts app/api/payments/__tests__/route.test.ts
```

Expected: pasan.

- [ ] **Step 9: Ejecutar lint y typecheck**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: ambos pasan.

- [ ] **Step 10: Commit**

Run:

```bash
git add lib/use-cases/payments/create-payment.ts
git commit -m "refactor: modularizar createPayment"
```

---

### Task 4: Adelgazar tests HTTP de pagos

**Files:**
- Modify: `app/api/payments/__tests__/route.test.ts`

- [ ] **Step 1: Identificar tests financieros duplicados**

En `app/api/payments/__tests__/route.test.ts`, marcar para eliminación o simplificación tests POST que verifican internals ya cubiertos por `createPayment`, especialmente:

```txt
debe aplicar crédito manual distribuido en pago tipo Customer
debe rechazar cuando el crédito total excede el disponible
debe validar crédito por proyecto contra balance restante después de cash
debe aceptar crédito en pago tipo Project con 1 allocation
debe generar crédito cuando proyecto tiene balance negativo
no debe generar sobrepago cuando dinero nuevo más crédito cierran el balance
debe generar créditos para múltiples proyectos con sobrepago
no debe generar crédito cuando balance >= 0
debe generar crédito solo para proyectos con balance negativo
```

No borrar tests GET.

- [ ] **Step 2: Mantener tests POST de contrato HTTP**

La route debe seguir cubriendo:

```txt
rechaza tipo inválido
rechaza campos requeridos faltantes
rechaza amount <= 0
rechaza creditApplied top-level por schema strict
acepta payload válido y responde 201
traduce BusinessError a status HTTP
traduce error inesperado a fallback 500
```

- [ ] **Step 3: Si hace falta, mockear `createPayment` solo en tests de contrato**

Si simplificar route test requiere aislar HTTP del use-case, usar:

```ts
vi.mock('@/lib/use-cases/payments/create-payment', () => ({
  createPayment: vi.fn(),
}))
```

Y en tests HTTP válidos:

```ts
vi.mocked(createPayment).mockResolvedValue({
  id: 'payment-1',
  allocations: [],
  installments: [],
} as never)
```

No mezclar mocks profundos de Prisma con tests cuyo objetivo es contrato HTTP.

- [ ] **Step 4: Ejecutar route tests**

Run:

```bash
npm test -- --run app/api/payments/__tests__/route.test.ts
```

Expected: pasan.

- [ ] **Step 5: Ejecutar use-case tests**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts
```

Expected: pasan.

- [ ] **Step 6: Commit**

Run:

```bash
git add app/api/payments/__tests__/route.test.ts
git commit -m "test: separar contrato HTTP de lógica financiera"
```

---

### Task 5: Verificación final y documentación

**Files:**
- Optional modify: `docs/project/implementation/2025-current.md`

- [ ] **Step 1: Ejecutar suite financiera focalizada**

Run:

```bash
npm test -- --run lib/use-cases/payments/__tests__/create-payment.test.ts app/api/payments/__tests__/route.test.ts app/api/payments/[id]/__tests__/route.test.ts lib/business-logic/__tests__
```

Expected: todos los tests pasan.

- [ ] **Step 2: Ejecutar verificación obligatoria del repo**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: ambos pasan.

- [ ] **Step 3: Actualizar implementación actual si el refactor fue significativo**

Si los commits anteriores cambiaron la estructura de `createPayment`, agregar una nota breve en `docs/project/implementation/2025-current.md`:

```md
### 2026-06-02 - Modularización interna de createPayment

- `POST /api/payments` se mantiene como adaptador HTTP.
- `lib/use-cases/payments/create-payment.ts` separa validación, carga de entidades,
  creación de pago, aplicación de crédito, `ProjectApplication` y sobrepagos en helpers privados.
- Tests financieros críticos viven en `lib/use-cases/payments/__tests__/create-payment.test.ts`;
  la route conserva tests de contrato HTTP.
- No se modificó DB, `ProjectApplication` ni `Project.balance`.
```

- [ ] **Step 4: Commit de docs si aplica**

Run:

```bash
git add docs/project/implementation/2025-current.md
git commit -m "docs: documentar modularizacion de pagos"
```

Si no hubo cambio documental, no crear commit vacío.

- [ ] **Step 5: Estado final**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: working tree limpio y commits de la fase visibles.

## Review Checklist

- [ ] `createPayment` conserva la firma pública.
- [ ] `POST /api/payments` conserva el contrato externo.
- [ ] `Payment.amount` sigue representando solo dinero nuevo.
- [ ] `allocations[].creditApplied` sigue siendo el único lugar para crédito aplicado.
- [ ] No se usa `Project.balance` como fuente de verdad nueva.
- [ ] `ProjectFinancials` sigue siendo lectura autoritativa dentro de la transacción.
- [ ] Todo crédito aplicado crea `CreditTransaction` tipo `APPLIED`.
- [ ] Todo sobrepago crea `CreditTransaction` tipo `OVERPAYMENT`.
- [ ] `ProjectApplication` sigue registrando `CASH` y `CUSTOMER_CREDIT`.
- [ ] No hay migraciones DB.
- [ ] `npm run lint` y `npm run typecheck` pasan.

