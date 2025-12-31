---
name: cobralon-financial-logic
description: |
  Guía para implementar features relacionadas con pagos FIFO, sistema de créditos y gestión de deudas en Cobralon.

  USAR CUANDO: trabajas con pagos, créditos, balances, deudas, allocations, PaymentAllocation, creditBalance, o modificas lib/business-logic/.

  Esta skill es OBLIGATORIA cuando tocas lógica financiera para evitar bugs críticos.
---

# Lógica Financiera de Cobralon

## Invariantes Críticos (NUNCA VIOLAR)

```
1. Project.balance >= 0           (SIEMPRE)
2. Customer.creditBalance >= 0    (SIEMPRE)
3. FIFO: Deudas antiguas primero  (Ordenar por createdAt ASC)
4. Operaciones de crédito = ATÓMICAS (usar $transaction)
5. Todo movimiento de crédito → CreditTransaction (auditoría)
```

## Módulos de Lógica de Negocio

### `lib/business-logic/payment-fifo.ts`

```typescript
// Distribuye pago FIFO (más antiguo primero)
calculateFIFO(totalAmount: number, projects: ProjectWithBalance[]): FIFOAllocation[]

// Valida que suma de allocations = total (con tolerancia)
validateAllocationsSum(totalAmount: number, allocations: Array<{allocatedAmount: number}>): boolean

// Filtra proyectos con balance > 0
filterProjectsWithBalance(projects: ProjectWithBalance[]): ProjectWithBalance[]
```

### `lib/business-logic/credit-management.ts`

```typescript
// Calcula distribución: cuánto al proyecto, cuánto a crédito
calculatePaymentDistribution(projectBalance, paymentAmount, creditApplied): ProcessPaymentWithCreditResult

// Máximo crédito aplicable = min(creditDisponible, balanceProyecto)
calculateMaxCreditApplication(customerCredit, projectBalance): number

// Valida si puede aplicar crédito
canApplyCredit(requestedAmount, customerCredit, projectBalance): CreditApplicationValidation
```

### `lib/business-logic/project-state.ts`

```typescript
// Estado derivado: "Activo" o "Finalizado"
// Finalizado = (isFinal === true) AND (balance === 0)
calculateProjectState(balance: number, isFinal: boolean): ProjectState
```

### `lib/business-logic/totals.ts`

```typescript
// Total = Subtotal + (Subtotal × taxRate/100)
calculateProjectTotal(subtotal: number, taxRate: number): number

// Valida total contra cálculo esperado (tolerancia: 0.01)
validateProjectTotal(subtotal, taxRate, receivedTotal): boolean
```

## Checklist Antes de Modificar Lógica Financiera

- [ ] Leí el módulo relevante en `lib/business-logic/`
- [ ] Entiendo cómo afecta a balances y créditos
- [ ] Usaré `$transaction` para operaciones atómicas
- [ ] Crearé `CreditTransaction` si hay movimiento de crédito
- [ ] Escribí/actualicé tests en `lib/business-logic/__tests__/`
- [ ] Ejecuté `npm run lint && npm run typecheck`

## Patrón de Transacción DB

```typescript
// SIEMPRE usar transacción para operaciones financieras
await prisma.$transaction(async (tx) => {
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

```typescript
// lib/constants/financial-constants.ts
FINANCIAL.TOLERANCE = 0.01      // Tolerancia para comparaciones
FINANCIAL.DEFAULT_TAX_RATE = 19 // IVA Chile
FINANCIAL.MIN_TAX_RATE = 0
FINANCIAL.MAX_TAX_RATE = 100
```

## Tests Requeridos

Después de cambios en lógica financiera:

```bash
# Tests específicos de business-logic
npm test -- lib/business-logic/__tests__/

# Todos los tests
npm test

# Verificación de tipos (CRÍTICO para evitar NaN)
npm run typecheck
```
