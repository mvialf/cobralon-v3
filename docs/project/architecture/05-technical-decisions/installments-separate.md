# Decisión: Tabla Installment Separada

Tabla `Installment` independiente (no campo JSON) para cuotas de pago.

---

## Contexto

Necesitábamos soportar pagos en cuotas sin interés con:

- Historial completo de cada cuota
- Seguimiento individual de estado (pending/paid)
- Marcado automático de cuotas vencidas (cron job)
- Queries específicas por cuota

---

## Decisión

Crear tabla `Installment` separada con relación 1:N a Payment.

```prisma
model Installment {
  id                String   @id @default(uuid())
  paymentId         String
  installmentNumber Int      // 1, 2, 3...
  amount            Decimal  @db.Decimal(12, 2)
  dueDate           DateTime
  paidDate          DateTime?
  status            String   // "pending" | "paid"

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@index([status, dueDate])
}
```

---

## Alternativas Consideradas

### Alternativa 1: JSON Field

```prisma
model Payment {
  installments Json // [{ number, amount, dueDate, status }, ...]
}
```

**Pros:**

- ✅ Más simple (sin JOIN)
- ✅ Menos tablas

**Contras:**

- ❌ **No queryable** (sin WHERE por cuota individual)
- ❌ **No indexable** (no índices en JSON)
- ❌ **Cron job complejo** (parse JSON → update → serialize)
- ❌ **Sin type-safety** (errores en runtime)

**Por qué NO:** Necesitamos queries como `SELECT * WHERE status='pending'`.

---

### Alternativa 2: N Payments Separados

```prisma
model Payment {
  isInstallment Boolean
  installmentOf String? // FK a Payment parent
}
```

**Pros:**

- ✅ Queries individuales posibles
- ✅ Consistente con modelo Payment

**Contras:**

- ❌ **Confunde historial** (1 pago ≠ N pagos)
- ❌ **Duplica datos** (customer, date, reference repetidos)
- ❌ **Complejidad en UI** (mostrar como 1 pago o N?)

**Por qué NO:** Semánticamente incorrecto. Una cuota NO es un pago.

---

## Razones

### 1. ✅ Queries Individuales

Fácil consultar cuotas específicas:

```sql
-- Cuotas pendientes
SELECT * FROM installments
WHERE status = 'pending'
ORDER BY dueDate ASC

-- Cuotas del cliente X
SELECT i.* FROM installments i
JOIN payments p ON p.id = i.payment_id
WHERE p.customer_id = 'abc'

-- Cuotas por vencer (próximos 30 días)
SELECT * FROM installments
WHERE status = 'pending'
  AND dueDate BETWEEN NOW() AND NOW() + INTERVAL '30 days'
```

---

### 2. ✅ Cron Job Simple

Marcado automático de cuotas vencidas:

```sql
-- Batch update diario
UPDATE installments
SET status = 'paid',
    paid_date = NOW()
WHERE status = 'pending'
  AND due_date <= CURRENT_DATE
```

Con JSON field sería:

```javascript
// ❌ Complejo y lento
const payments = await prisma.payment.findMany({
  where: { selectedInstallments: { gt: 1 } },
})

for (const payment of payments) {
  let installments = JSON.parse(payment.installments)
  installments = installments.map((i) =>
    i.status === 'pending' && new Date(i.dueDate) <= today
      ? { ...i, status: 'paid', paidDate: today }
      : i
  )
  await prisma.payment.update({
    where: { id: payment.id },
    data: { installments: JSON.stringify(installments) },
  })
}
```

---

### 3. ✅ Auditoría Completa

Historial detallado por cuota:

```typescript
// Cambio de estado queda registrado
{
  installmentNumber: 2,
  dueDate: "2025-02-15",
  paidDate: "2025-02-15",  // ← Fecha exacta de pago
  status: "paid"
}
```

---

### 4. ✅ Reportes Complejos

Fácil generar reportes:

```sql
-- Cuotas por estado
SELECT status, COUNT(*), SUM(amount)
FROM installments
GROUP BY status

-- Cuotas por mes
SELECT DATE_TRUNC('month', due_date) AS month,
       COUNT(*), SUM(amount)
FROM installments
WHERE status = 'pending'
GROUP BY month
```

---

## Trade-offs

### ⚠️ JOIN Adicional

Queries requieren JOIN para obtener info del pago:

```sql
-- Más complejo
SELECT i.*, p.customer_id, p.reference
FROM installments i
JOIN payments p ON p.id = i.payment_id

-- vs JSON (más simple pero menos potente)
SELECT * FROM payments
WHERE selected_installments > 1
```

**Mitigación:**

- Índice optimizado: `[paymentId]`
- Prisma include automático con `relationLoadStrategy: 'join'`
- Denormalizar campos críticos si es necesario (ej: `customerId` en Installment)

---

### ⚠️ Más Tablas

Más complejidad en schema:

- 1 modelo adicional (Installment)
- 1 relación adicional (Payment → Installments)
- Validaciones adicionales (orden de cuotas, suma de amounts)

**Mitigación:**

- Creación automática al crear Payment con cuotas
- Business logic encapsulada en API route
- Validaciones en Zod schema

---

## Implementación

### Creación Automática de Cuotas

```typescript
// app/api/payments/route.ts
export const POST = withLogging(async (request, logger) => {
  const { amount, selectedInstallments, ...data } = await request.json()

  const installments = []
  if (selectedInstallments > 1) {
    const baseAmount = Math.floor((amount * 100) / selectedInstallments) / 100
    let remaining = amount

    for (let i = 1; i <= selectedInstallments; i++) {
      const isLast = i === selectedInstallments
      const installmentAmount = isLast ? remaining : baseAmount

      installments.push({
        installmentNumber: i,
        amount: installmentAmount,
        dueDate: addDays(data.date, (i - 1) * 30),
        status: 'pending',
      })

      remaining -= installmentAmount
    }
  }

  const payment = await prisma.payment.create({
    data: {
      ...data,
      amount,
      selectedInstallments,
      installments: {
        create: installments, // ← Creación transaccional
      },
    },
  })

  logger.info(
    { paymentId: payment.id, installmentsCount: installments.length },
    'Payment with installments created'
  )
})
```

---

### Cron Job: Marcado Automático

```typescript
// app/api/cron/mark-installments-paid/route.ts
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()

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

  logger.info({ updated: result.count, date: today }, 'Installments marked as paid')

  return NextResponse.json({
    success: true,
    updated: result.count,
  })
}
```

**Configuración Vercel:**

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

---

### Página de Vista Global

```typescript
// app/payments/installments/page.tsx
export default async function InstallmentsPage({
  searchParams
}: {
  searchParams: { status?: string, page?: string }
}) {
  const status = searchParams.status || 'all'
  const page = parseInt(searchParams.page || '1')
  const limit = 20

  const where = status !== 'all' ? { status } : {}

  const [installments, total] = await Promise.all([
    prisma.installment.findMany({
      where,
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
      },
      orderBy: [
        { dueDate: 'asc' },
        { installmentNumber: 'asc' }
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.installment.count({ where }),
  ])

  return (
    <AppLayout pageTitle="Cuotas" pageDescription="Vista global de cuotas">
      <DataTable columns={installmentColumns} data={installments} />
      <Pagination total={total} page={page} limit={limit} />
    </AppLayout>
  )
}
```

---

## Ver También

- [Payment Systems](../01-data-model/payment-systems.md) - Modelo completo
- [Business Flows: Installments](../02-business-flows/installments-flow.md) - Flujo de negocio
- [Cron API](../06-apis/cron-api.md) - Implementación del cron job

**Última actualización:** 2025-10-30
