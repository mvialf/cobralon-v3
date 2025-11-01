# Flujo: Gestión de Cuotas (Installments)

Sistema de cuotas sin interés con creación automática y marcado programado vía cron job.

---

## Creación Automática de Cuotas

### Trigger

Cuotas se crean automáticamente al crear un Payment con `selectedInstallments > 1`.

### Algoritmo

```typescript
// app/api/payments/route.ts
if (selectedInstallments && selectedInstallments > 1) {
  const installmentAmount = Math.floor((amount / selectedInstallments) * 100) / 100
  const installments = []

  for (let i = 1; i <= selectedInstallments; i++) {
    const isLast = i === selectedInstallments

    // Última cuota absorbe centavos residuales
    const cuotaAmount = isLast
      ? amount - installmentAmount * (selectedInstallments - 1)
      : installmentAmount

    installments.push({
      installmentNumber: i,
      amount: cuotaAmount,
      dueDate: addDays(date, (i - 1) * 30), // Cada 30 días
      status: 'pending',
    })
  }

  await prisma.payment.create({
    data: {
      ...paymentData,
      installments: { create: installments },
    },
  })
}
```

### Ejemplo

**Payment:**

```
amount: $900,000
selectedInstallments: 3
date: 2025-10-30
```

**Installments creados:**

```
Cuota 1: $300,000, vence: 2025-10-30, status: pending
Cuota 2: $300,000, vence: 2025-11-29, status: pending
Cuota 3: $300,000, vence: 2025-12-29, status: pending

SUM = $900,000 ✅
```

---

## Cron Job: Marcado Automático

### Configuración Vercel

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/mark-installments-paid",
      "schedule": "0 0 * * *" // Diario a medianoche UTC
    }
  ]
}
```

### Implementación

```typescript
// app/api/cron/mark-installments-paid/route.ts
export async function POST(request: Request) {
  // Autenticación
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const logger = parentLogger.child({ job: 'mark-installments-paid', runId: generateRunId() })

  logger.info('Cron job started')

  const result = await prisma.installment.updateMany({
    where: {
      status: 'pending',
      dueDate: { lte: today },
    },
    data: {
      status: 'paid',
      paidDate: today,
    },
  })

  logger.info({ updated: result.count }, 'Cron job completed')

  return NextResponse.json({ updated: result.count })
}
```

### Business Logic

1. **Buscar cuotas pendientes vencidas:**

   ```sql
   WHERE status = 'pending' AND dueDate <= CURRENT_DATE
   ```

2. **Batch update:**

   ```sql
   UPDATE installments
   SET status = 'paid', paidDate = NOW()
   ```

3. **Log resultado:**
   - Total de cuotas marcadas
   - RunId para tracking

---

## Vista Global de Cuotas

### Endpoint

```
GET /api/installments?status=pending&customerId=abc&page=1&limit=10
```

### Query Params

- `status`: "pending" | "paid"
- `paymentId`: Filtrar por pago
- `customerId`: Filtrar por cliente
- `startDate`, `endDate`: Rango de vencimiento

### Includes

```typescript
include: {
  payment: {
    select: {
      id, amount, currency, date, reference,
      customer: { select: { id, name, phone } },
      paymentMethod: { select: { id, name, icon } },
      allocations: {
        select: {
          allocatedAmount,
          project: { select: { id, projectNumber, projectName } }
        }
      }
    }
  }
}
```

---

## Ver También

- [Installment Model](../01-data-model/payment-systems.md#installment-cuotas)
- [Cron API](../06-apis/cron-api.md)
- [Installments API](../06-apis/installments-api.md)
- [Decisión: ¿Por qué tabla separada?](../05-technical-decisions/installments-separate.md)

---

**Última actualización:** 2025-10-30
