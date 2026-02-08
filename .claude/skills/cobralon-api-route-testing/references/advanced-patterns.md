# Patrones Avanzados de API Route Testing

## Tabla de contenidos

1. [Transaction Verification](#transaction-verification)
2. [Side-Effect Verification](#side-effect-verification)
3. [Business Rule Blocking](#business-rule-blocking)
4. [Credit Reversal Testing](#credit-reversal-testing)
5. [Decimal Handling](#decimal-handling)
6. [Sorting y Pagination Avanzada](#sorting-y-pagination)

---

## Transaction Verification

Patrón para capturar y verificar operaciones dentro de `$transaction`:

```typescript
it('debe crear registro dentro de transacción', async () => {
  let txMock: Record<string, Record<string, ReturnType<typeof vi.fn>>>

  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
    txMock = {
      payment: {
        create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [] }),
        update: vi.fn().mockResolvedValue({ id: 'p1' }),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      creditTransaction: { create: vi.fn() },
      customer: { update: vi.fn() },
    }
    return fn(txMock as never)
  })

  const request = createRequest('POST', validPayload)
  await callPOST(request)

  // Verificar operaciones dentro de la transacción
  expect(txMock!.payment.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ amount: 100000 }),
  })
})
```

**Clave:** Declarar `let txMock` fuera del `mockImplementation` para poder acceder
después de la ejecución. Usar `txMock!` (non-null assertion) en las verificaciones.

### Verificar rollback en error

```typescript
it('debe hacer rollback si operación interna falla', async () => {
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
    const txMock = {
      payment: { delete: vi.fn().mockResolvedValue({ id: 'p1' }) },
      // updateMultipleProjectBalances lanza error → Prisma hace rollback
    }
    return fn(txMock as never)
  })

  // El side-effect mockeado lanza error
  vi.mocked(updateMultipleProjectBalances).mockRejectedValue(new Error('Not found'))

  const response = await DELETE(createRequest('DELETE'), createParams('p1'))
  expect(response.status).toBe(500)
})
```

---

## Side-Effect Verification

Verificar que funciones de business logic se llaman (o NO se llaman) según contexto:

```typescript
// SE LLAMA cuando cambia amount (hay allocations afectadas)
it('debe recalcular balance si cambia amount', async () => {
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
    return fn({
      payment: {
        update: vi.fn().mockResolvedValue({
          ...mockPayment,
          allocations: [{ projectId: 'p1' }, { projectId: 'p2' }],
        }),
      },
    } as never)
  })

  await PUT(createRequest('PUT', { amount: 200000 }), createParams('p1'))
  expect(updateMultipleProjectBalances).toHaveBeenCalledWith(['p1', 'p2'], expect.anything())
})

// NO SE LLAMA cuando solo cambia fecha
it('no debe recalcular si solo cambia fecha', async () => {
  await PUT(createRequest('PUT', { date: '2025-03-15' }), createParams('p1'))
  expect(updateMultipleProjectBalances).not.toHaveBeenCalled()
})

// NO SE LLAMA cuando no hay allocations
it('no debe recalcular si no hay allocations', async () => {
  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
    return fn({
      payment: { update: vi.fn().mockResolvedValue({ ...mockPayment, allocations: [] }) },
    } as never)
  })

  await PUT(createRequest('PUT', { amount: 200000 }), createParams('p1'))
  expect(updateMultipleProjectBalances).not.toHaveBeenCalled()
})
```

**Patrón general:** Siempre testear pares: "se llama cuando X" + "NO se llama cuando Y".

---

## Business Rule Blocking

Testear condiciones que bloquean una operación. Siempre incluir el boundary case:

```typescript
describe('bloqueo de pagos con cuotas', () => {
  // BLOQUEADO: selectedInstallments > 1
  it('debe rechazar edición si tiene cuotas', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'p1', selectedInstallments: 3, _count: { creditTransactions: 0 },
    } as never)

    const response = await PUT(createRequest('PUT', { amount: 200000 }), createParams('p1'))
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('cuotas')
  })

  // BOUNDARY: selectedInstallments = 1 (contado, permitido)
  it('debe permitir edición si es contado (installments=1)', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'p1', selectedInstallments: 1, _count: { creditTransactions: 0 },
    } as never)

    const response = await PUT(createRequest('PUT', { amount: 200000 }), createParams('p1'))
    expect(response.status).toBe(200)
  })

  // BOUNDARY: selectedInstallments = null (sin cuotas, permitido)
  it('debe permitir edición si no tiene cuotas (null)', async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'p1', selectedInstallments: null, _count: { creditTransactions: 0 },
    } as never)

    const response = await PUT(createRequest('PUT', { amount: 200000 }), createParams('p1'))
    expect(response.status).toBe(200)
  })
})
```

---

## Credit Reversal Testing

Para DELETE de pagos que tienen CreditTransactions asociadas:

```typescript
describe('reversión de créditos en DELETE', () => {
  it('debe crear ADJUSTMENT de reversión para APPLIED', async () => {
    let txMock: Record<string, Record<string, ReturnType<typeof vi.fn>>>

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      txMock = {
        creditTransaction: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'ct-1', type: 'APPLIED', amount: new Decimal(-5000), customerId: 'c1' },
          ]),
          create: vi.fn().mockResolvedValue({}),
        },
        customer: { update: vi.fn() },
        payment: { delete: vi.fn().mockResolvedValue({ id: 'p1' }) },
      }
      return fn(txMock as never)
    })

    await DELETE(createRequest('DELETE'), createParams('p1'))

    // ADJUSTMENT con monto inverso
    expect(txMock!.creditTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: new Decimal(5000),  // Inverso de -5000
        type: 'ADJUSTMENT',
        metadata: expect.objectContaining({
          reversedTransactionId: 'ct-1',
          reversedType: 'APPLIED',
        }),
      }),
    })

    // Recálculo desde ledger
    expect(updateCustomerCreditBalance).toHaveBeenCalledWith('c1', expect.anything())
  })

  it('debe crear ADJUSTMENT para OVERPAYMENT', async () => {
    // Mismo patrón pero con amount inverso:
    // OVERPAYMENT +10000 → ADJUSTMENT -10000
  })

  it('debe manejar escenario mixto (APPLIED + OVERPAYMENT)', async () => {
    // findMany retorna ambos tipos
    // Verificar: creditTransaction.create llamado 2 veces
    // Verificar: updateCustomerCreditBalance llamado 1 sola vez
  })

  it('sin credit_transactions no crea ADJUSTMENTs', async () => {
    // findMany retorna []
    // Verificar: creditTransaction.create NO llamado
  })
})
```

**Regla del inverso:** `APPLIED` (negativo) → `ADJUSTMENT` (positivo). `OVERPAYMENT` (positivo) → `ADJUSTMENT` (negativo).

---

## Decimal Handling

Prisma retorna `Decimal` para campos monetarios. Importar y usar en mocks:

```typescript
import { Decimal } from '@prisma/client/runtime/library'

// En mocks
const mockProject = {
  id: 'p1',
  total: new Decimal(1000000),
  balance: new Decimal(500000),
}

// En verificaciones
expect(prisma.project.update).toHaveBeenCalledWith({
  where: { id: 'p1' },
  data: { balance: new Decimal(500000) },
})
```

Para tolerancia financiera:

```typescript
import { FINANCIAL } from '@/lib/business-logic/constants'

expect(Math.abs(result - expected)).toBeLessThan(FINANCIAL.TOLERANCE) // 0.01
```

---

## Sorting y Pagination

Testear parámetros de sorting server-side:

```typescript
it('debe ordenar por campo especificado', async () => {
  vi.mocked(prisma.ENTITY.count).mockResolvedValue(10)
  vi.mocked(prisma.ENTITY.findMany).mockResolvedValue([] as never)

  await callGET(createGetRequest({ sortBy: 'name', sortOrder: 'desc' }))

  expect(prisma.ENTITY.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: expect.objectContaining({ name: 'desc' }),
    })
  )
})

it('debe usar sorting default si no se especifica', async () => {
  vi.mocked(prisma.ENTITY.count).mockResolvedValue(10)
  vi.mocked(prisma.ENTITY.findMany).mockResolvedValue([] as never)

  await callGET(createGetRequest())

  expect(prisma.ENTITY.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      orderBy: expect.any(Object), // El default del endpoint
    })
  )
})

it('debe ignorar sortBy inválido', async () => {
  await callGET(createGetRequest({ sortBy: 'DROP TABLE', sortOrder: 'asc' }))
  // No debe fallar, usa default
  expect(prisma.ENTITY.findMany).toHaveBeenCalled()
})
```
