# Patrón de Transacción DB y Constantes Financieras

## Patrón de Transacción para Operaciones Financieras

SIEMPRE usar transacción para operaciones que afectan pagos, créditos o balances.

Tipar el parámetro `tx` con `PrismaTransaction` de `@/lib/db/types`:

```typescript
import type { PrismaTransaction } from '@/lib/db/types'

await prisma.$transaction(async (tx: PrismaTransaction) => {
  // 1. Crear Payment
  const payment = await tx.payment.create({ ... })

  // 2. Crear PaymentAllocations (distribución FIFO)
  await tx.paymentAllocation.createMany({
    data: allocations.map(a => ({
      paymentId: payment.id,
      projectId: a.projectId,
      allocatedAmount: a.allocatedAmount,
    }))
  })

  // 3. Si hay crédito generado/consumido
  if (creditChange !== 0) {
    // Actualizar creditBalance del customer
    await tx.customer.update({
      where: { id: customerId },
      data: { creditBalance: { increment: creditChange } }
    })

    // Crear registro de auditoría
    await tx.creditTransaction.create({
      data: {
        customerId,
        amount: Math.abs(creditChange),
        type: creditChange > 0 ? 'GENERATION' : 'APPLICATION',
        paymentId: payment.id,
      }
    })
  }
})
```

## Constantes Financieras

Definidas en `lib/constants/financial-constants.ts`:

```typescript
FINANCIAL.TOLERANCE = 0.01      // Tolerancia para comparaciones de punto flotante
FINANCIAL.DEFAULT_TAX_RATE = 19 // IVA Chile
FINANCIAL.MIN_TAX_RATE = 0
FINANCIAL.MAX_TAX_RATE = 100
```
