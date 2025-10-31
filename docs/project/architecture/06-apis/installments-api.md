# Installments API

API REST para vista global de cuotas de pagos con filtros avanzados.

---

## Endpoints

```
GET    /api/installments        → Vista global con filtros
```

**Nota:** Las cuotas se crean automáticamente al crear un Payment con `selectedInstallments > 1`. No hay endpoint POST/PUT/DELETE para installments individuales.

---

## GET /api/installments

Listar todas las cuotas del sistema con paginación y filtros.

### Query Parameters

| Parámetro    | Tipo   | Default | Descripción                                   |
| ------------ | ------ | ------- | --------------------------------------------- |
| `page`       | number | 1       | Número de página                              |
| `limit`      | number | 20      | Items por página (max: 100)                   |
| `status`     | string | -       | Filtrar por status ("pending" \| "paid")      |
| `paymentId`  | UUID   | -       | Filtrar por pago específico                   |
| `customerId` | UUID   | -       | Filtrar por cliente (via payment)             |
| `startDate`  | string | -       | Fecha inicio vencimiento (dueDate, ISO 8601)  |
| `endDate`    | string | -       | Fecha fin vencimiento (dueDate, ISO 8601)     |

### Request Example

```bash
GET /api/installments?status=pending&page=1&limit=20
```

### Response

```json
{
  "data": [
    {
      "id": "uuid-inst-1",
      "paymentId": "uuid-pay-1",
      "installmentNumber": 1,
      "amount": 500000.00,
      "dueDate": "2025-01-16T00:00:00Z",
      "paidDate": null,
      "status": "pending",
      "payment": {
        "id": "uuid-pay-1",
        "amount": 1500000.00,
        "currency": "CLP",
        "date": "2025-01-16T00:00:00Z",
        "reference": "TRF-001",
        "customer": {
          "id": "uuid-123",
          "name": "Juan Pérez",
          "phone": "+56912345678"
        },
        "paymentMethod": {
          "id": "uuid-method-1",
          "name": "Transferencia",
          "icon": "CreditCard"
        },
        "allocations": [
          {
            "allocatedAmount": 1500000.00,
            "project": {
              "id": "uuid-proj-1",
              "projectNumber": "P 0001-2025",
              "projectName": "Instalación Ventanas",
              "currency": "CLP"
            }
          }
        ]
      },
      "createdAt": "2025-01-16T10:30:00Z",
      "updatedAt": "2025-01-16T10:30:00Z"
    },
    {
      "id": "uuid-inst-2",
      "paymentId": "uuid-pay-1",
      "installmentNumber": 2,
      "amount": 500000.00,
      "dueDate": "2025-02-15T00:00:00Z",
      "paidDate": null,
      "status": "pending",
      "payment": { /* ... mismo payment ... */ }
    },
    {
      "id": "uuid-inst-3",
      "paymentId": "uuid-pay-1",
      "installmentNumber": 3,
      "amount": 500000.00,
      "dueDate": "2025-03-17T00:00:00Z",
      "paidDate": null,
      "status": "pending",
      "payment": { /* ... mismo payment ... */ }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Implementación

```typescript
// app/api/installments/route.ts
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const status = searchParams.get('status') as 'pending' | 'paid' | null
  const paymentId = searchParams.get('paymentId')
  const customerId = searchParams.get('customerId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  logger.info(
    { page, limit, status, paymentId, customerId, startDate, endDate },
    'Listing installments'
  )

  // Build filters
  const where: any = {}

  if (status) where.status = status
  if (paymentId) where.paymentId = paymentId
  if (customerId) {
    where.payment = {
      customerId
    }
  }
  if (startDate || endDate) {
    where.dueDate = {}
    if (startDate) where.dueDate.gte = new Date(startDate)
    if (endDate) where.dueDate.lte = new Date(endDate)
  }

  const [installments, total] = await Promise.all([
    prisma.installment.findMany({
      where,
      relationLoadStrategy: 'join',
      include: {
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            date: true,
            reference: true,
            notes: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            },
            paymentMethod: {
              select: {
                id: true,
                name: true,
                icon: true
              }
            },
            allocations: {
              select: {
                id: true,
                allocatedAmount: true,
                project: {
                  select: {
                    id: true,
                    projectNumber: true,
                    projectName: true,
                    currency: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { dueDate: 'asc' },           // Vencimientos próximos primero
        { installmentNumber: 'asc' }  // Número de cuota
      ],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.installment.count({ where })
  ])

  logger.info({ count: installments.length, total }, 'Installments retrieved')

  return NextResponse.json({
    data: installments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  })
})
```

---

## Casos de Uso

### 1. Cuotas Pendientes

```bash
GET /api/installments?status=pending&page=1&limit=20
```

**Uso:** Ver todas las cuotas que aún no han vencido.

---

### 2. Cuotas por Vencer (Próximos 30 días)

```bash
GET /api/installments?status=pending&startDate=2025-01-20&endDate=2025-02-20
```

**Uso:** Dashboard con alertas de cuotas próximas a vencer.

---

### 3. Cuotas de un Cliente

```bash
GET /api/installments?customerId=uuid-123
```

**Uso:** Ver historial completo de cuotas de un cliente (pendientes + pagadas).

---

### 4. Cuotas de un Pago Específico

```bash
GET /api/installments?paymentId=uuid-pay-1
```

**Uso:** Ver desglose de cuotas al revisar detalle de un pago.

---

## Características Especiales

### 1. Ordenamiento por Vencimiento

```typescript
orderBy: [
  { dueDate: 'asc' },           // ← Más urgentes primero
  { installmentNumber: 'asc' }
]
```

**Beneficio:** Las cuotas próximas a vencer aparecen primero en la lista.

---

### 2. Includes Profundos

Cada installment incluye:

- Payment completo
  - Customer info
  - PaymentMethod info
  - Allocations con Project info

**Beneficio:** Una sola query obtiene toda la información contextual.

---

### 3. Filtro por Cliente (via Payment)

```typescript
if (customerId) {
  where.payment = {
    customerId
  }
}
```

**Beneficio:** Filtrar cuotas por cliente sin JOIN manual.

---

## Índices Relevantes

```prisma
model Installment {
  @@index([paymentId])
  @@index([status, dueDate])
}
```

**Beneficios:**

- Query por payment: rápida (index único)
- Query por status + rango de fechas: optimizada (index compuesto)

---

## Actualización de Estado

Las cuotas **NO se actualizan manualmente** vía API. El estado se actualiza automáticamente:

### Cron Job Diario

```
POST /api/cron/mark-installments-paid
```

Ejecuta automáticamente cada día (ver [Cron API](cron-api.md)).

---

## Modelo de Datos

```prisma
model Installment {
  id                String   @id @default(uuid())
  paymentId         String
  installmentNumber Int      // 1, 2, 3...
  amount            Decimal  @db.Decimal(12, 2)
  dueDate           DateTime
  paidDate          DateTime?
  status            String   // "pending" | "paid"
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@index([status, dueDate])
}
```

---

## Reportes Útiles

### Cuotas Vencidas (Overdue)

```bash
GET /api/installments?status=pending&endDate=2025-01-19
```

**Filtro:** `dueDate <= hoy` + `status='pending'`

**Nota:** El cron job debería marcarlas como "paid" automáticamente, pero si hay desfase en el cron, este query las detecta.

---

### Total Pendiente por Cliente

Requiere agregación manual en frontend:

```typescript
const installments = await fetch(`/api/installments?customerId=${id}`)
const { data } = await installments.json()

const totalPending = data
  .filter(i => i.status === 'pending')
  .reduce((sum, i) => sum + Number(i.amount), 0)
```

---

## Ver También

- [Installment Model](../01-data-model/payment-systems.md#installment) - Modelo de datos
- [Payments API](payments-api.md) - Creación de installments
- [Cron API](cron-api.md) - Marcado automático de cuotas
- [Installments Decision](../05-technical-decisions/installments-separate.md) - Por qué tabla separada

**Última actualización:** 2025-10-30
