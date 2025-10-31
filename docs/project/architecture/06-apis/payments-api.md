# Payments API

API REST compleja para gestión de pagos con allocations a proyectos, installments y validaciones de negocio.

---

## Endpoints

```
GET    /api/payments            → Listar con paginación + filtros + includes
POST   /api/payments            → Crear con allocations + installments
GET    /api/payments/[id]       → Detalle completo
PUT    /api/payments/[id]       → Actualizar (limitado)
DELETE /api/payments/[id]       → Eliminar (CASCADE)

GET    /api/payments/search-projects  → Buscar proyectos con balance > 0
GET    /api/payments/customer-projects → Proyectos de cliente específico
POST   /api/payments/[id]/cancel      → Cancelar pago (DELETE wrapper)
```

---

## GET /api/payments

Listar pagos con paginación, filtros y datos relacionados complejos.

### Query Parameters

| Parámetro    | Tipo   | Default | Descripción                |
| ------------ | ------ | ------- | -------------------------- |
| `page`       | number | 1       | Número de página           |
| `limit`      | number | 20      | Items por página (max:100) |
| `customerId` | UUID   | -       | Filtrar por cliente        |
| `projectId`  | UUID   | -       | Filtrar por proyecto       |
| `startDate`  | string | -       | Fecha inicio (ISO 8601)    |
| `endDate`    | string | -       | Fecha fin (ISO 8601)       |

### Response

```json
{
  "data": [
    {
      "id": "uuid-pay-1",
      "type": "Project",
      "amount": 500000.00,
      "currency": "CLP",
      "date": "2025-01-16T00:00:00Z",
      "reference": "TRF-001",
      "notes": "Primer pago",
      "selectedInstallments": null,
      "customerId": "uuid-123",
      "customer": {
        "id": "uuid-123",
        "name": "Juan Pérez",
        "phone": "+56912345678"
      },
      "paymentMethodId": "uuid-method-1",
      "paymentMethod": {
        "id": "uuid-method-1",
        "name": "Transferencia",
        "icon": "CreditCard"
      },
      "allocations": [
        {
          "id": "uuid-alloc-1",
          "projectId": "uuid-proj-1",
          "allocatedAmount": 500000.00,
          "project": {
            "id": "uuid-proj-1",
            "projectNumber": "P 0001-2025",
            "projectName": "Instalación Ventanas",
            "currency": "CLP"
          }
        }
      ],
      "installments": [],
      "createdAt": "2025-01-16T10:30:00Z",
      "updatedAt": "2025-01-16T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

### Implementación

```typescript
// app/api/payments/route.ts
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const customerId = searchParams.get('customerId')
  const projectId = searchParams.get('projectId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  logger.info(
    { page, limit, customerId, projectId, startDate, endDate },
    'Listing payments'
  )

  // Build filters
  const where: any = {}

  if (customerId) where.customerId = customerId
  if (projectId) {
    where.allocations = {
      some: { projectId }
    }
  }
  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      relationLoadStrategy: 'join',
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        paymentMethod: {
          select: { id: true, name: true, icon: true }
        },
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
                currency: true
              }
            }
          }
        },
        installments: {
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            dueDate: true,
            paidDate: true,
            status: true
          },
          orderBy: { installmentNumber: 'asc' }
        }
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.payment.count({ where })
  ])

  logger.info({ count: payments.length, total }, 'Payments retrieved')

  return NextResponse.json({
    data: payments,
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

## POST /api/payments

Crear pago con allocations a proyectos e installments opcionales.

### Request Body

```json
{
  "type": "Project",
  "customerId": "uuid-123",
  "amount": 500000.00,
  "currency": "CLP",
  "date": "2025-01-16T00:00:00Z",
  "paymentMethodId": "uuid-method-1",
  "reference": "TRF-001",
  "notes": "Primer pago",
  "selectedInstallments": null,
  "allocations": [
    {
      "projectId": "uuid-proj-1",
      "allocatedAmount": 500000.00
    }
  ]
}
```

#### Pago con Cuotas (Installments)

```json
{
  "type": "Project",
  "customerId": "uuid-123",
  "amount": 1500000.00,
  "currency": "CLP",
  "date": "2025-01-16T00:00:00Z",
  "paymentMethodId": "uuid-method-1",
  "selectedInstallments": 3,  // ← 3 cuotas sin interés
  "allocations": [
    {
      "projectId": "uuid-proj-1",
      "allocatedAmount": 1500000.00
    }
  ]
}
```

### Validation Schema (Zod)

```typescript
// lib/validations/payment-validations.ts
export const paymentToProjectSchema = z.object({
  type: z.literal("Project"),
  customerId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("CLP"),
  date: z.coerce.date(),
  paymentMethodId: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
  selectedInstallments: z.number().int().min(1).max(12).optional(),
  allocations: z.array(
    z.object({
      projectId: z.string().min(1),
      allocatedAmount: z.number().positive()
    })
  ).length(1, "Pago a proyecto debe tener exactamente 1 allocation")
})

export const paymentToCustomerSchema = z.object({
  type: z.literal("Customer"),
  // ... mismos campos ...
  allocations: z.array(
    z.object({
      projectId: z.string().min(1),
      allocatedAmount: z.number().positive()
    })
  ).min(1, "Pago a cliente debe tener al menos 1 allocation")
})
```

### Validaciones Backend (Más Allá de Zod)

```typescript
// 1. Suma de allocations === amount (tolerancia 0.01)
const totalAllocated = allocations.reduce(
  (sum, a) => sum + a.allocatedAmount,
  0
)

if (Math.abs(totalAllocated - amount) > 0.01) {
  return NextResponse.json(
    { error: 'La suma de allocations debe ser igual al monto del pago' },
    { status: 400 }
  )
}

// 2. Todos los projects pertenecen al mismo customer
const projects = await prisma.project.findMany({
  where: {
    id: { in: allocations.map(a => a.projectId) }
  },
  select: { id: true, customerId: true, currency: true }
})

const uniqueCustomers = new Set(projects.map(p => p.customerId))
if (uniqueCustomers.size > 1) {
  return NextResponse.json(
    { error: 'Todos los proyectos deben pertenecer al mismo cliente' },
    { status: 400 }
  )
}

if (!uniqueCustomers.has(customerId)) {
  return NextResponse.json(
    { error: 'Los proyectos no pertenecen al cliente especificado' },
    { status: 400 }
  )
}

// 3. Todos los projects tienen misma currency
const uniqueCurrencies = new Set(projects.map(p => p.currency))
if (uniqueCurrencies.size > 1) {
  return NextResponse.json(
    { error: 'Todos los proyectos deben tener la misma moneda' },
    { status: 400 }
  )
}

if (![...uniqueCurrencies][0] === currency) {
  return NextResponse.json(
    { error: 'La moneda del pago debe coincidir con la de los proyectos' },
    { status: 400 }
  )
}

// 4. No projectIds duplicados
const projectIds = allocations.map(a => a.projectId)
const uniqueIds = new Set(projectIds)
if (uniqueIds.size !== projectIds.length) {
  return NextResponse.json(
    { error: 'No se permiten proyectos duplicados en allocations' },
    { status: 400 }
  )
}
```

### Response (201 Created)

```json
{
  "id": "uuid-pay-1",
  "type": "Project",
  "amount": 500000.00,
  "currency": "CLP",
  "date": "2025-01-16T00:00:00Z",
  "reference": "TRF-001",
  "selectedInstallments": null,
  "customer": {
    "id": "uuid-123",
    "name": "Juan Pérez"
  },
  "paymentMethod": {
    "id": "uuid-method-1",
    "name": "Transferencia"
  },
  "allocations": [
    {
      "id": "uuid-alloc-1",
      "projectId": "uuid-proj-1",
      "allocatedAmount": 500000.00
    }
  ],
  "installments": [],
  "createdAt": "2025-01-16T10:30:00Z"
}
```

### Implementación Completa

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  logger.info({ type: body.type, customerId: body.customerId, amount: body.amount },
    'Creating payment')

  try {
    // 1. Validar con Zod
    const schema = body.type === 'Project'
      ? paymentToProjectSchema
      : paymentToCustomerSchema

    const validatedData = schema.parse(body)

    // 2. Validaciones business logic (ver arriba)
    // ... validaciones de suma, customer único, currency, etc. ...

    // 3. Generar installments si aplica
    const installments = []
    if (validatedData.selectedInstallments && validatedData.selectedInstallments > 1) {
      const { amount, date, selectedInstallments: count } = validatedData

      const baseAmount = Math.floor((amount * 100) / count) / 100
      let remaining = amount

      for (let i = 1; i <= count; i++) {
        const isLast = i === count
        const installmentAmount = isLast ? remaining : baseAmount

        const dueDate = new Date(date)
        dueDate.setDate(dueDate.getDate() + (i - 1) * 30)

        installments.push({
          installmentNumber: i,
          amount: installmentAmount,
          dueDate,
          status: 'pending'
        })

        remaining -= installmentAmount
      }
    }

    // 4. Crear Payment + Allocations + Installments en transacción
    const payment = await prisma.payment.create({
      data: {
        type: validatedData.type,
        amount: validatedData.amount,
        currency: validatedData.currency,
        date: validatedData.date,
        reference: validatedData.reference,
        notes: validatedData.notes,
        selectedInstallments: validatedData.selectedInstallments,
        customerId: validatedData.customerId,
        paymentMethodId: validatedData.paymentMethodId,
        allocations: {
          create: validatedData.allocations
        },
        installments: {
          create: installments
        }
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        paymentMethod: {
          select: { id: true, name: true, icon: true }
        },
        allocations: {
          select: {
            id: true,
            projectId: true,
            allocatedAmount: true,
            project: {
              select: {
                id: true,
                projectNumber: true,
                projectName: true
              }
            }
          }
        },
        installments: {
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            dueDate: true,
            status: true
          },
          orderBy: { installmentNumber: 'asc' }
        }
      }
    })

    logger.info(
      {
        paymentId: payment.id,
        allocationsCount: payment.allocations.length,
        installmentsCount: payment.installments.length
      },
      'Payment created'
    )

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.errors }, 'Validation failed')
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    logger.error({ err: error }, 'Failed to create payment')
    throw error
  }
})
```

---

## GET /api/payments/[id]

Obtener detalle completo de pago.

### Response

Similar a GET /api/payments pero para un solo pago con todos los includes.

---

## DELETE /api/payments/[id]

Eliminar pago (CASCADE: también elimina allocations e installments).

### Response

```json
{
  "success": true,
  "message": "Payment deleted successfully"
}
```

### ⚠️ Importante: Política CASCADE

```prisma
model PaymentAllocation {
  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
}

model Installment {
  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
}
```

**Eliminar payment automáticamente elimina:**
- Todas las allocations
- Todos los installments

**Impacto en Project Balance:**

Balance del proyecto aumenta (menos pago registrado).

---

## GET /api/payments/search-projects

Buscar proyectos con balance > 0 para asignar pagos.

### Query Parameters

| Parámetro | Tipo   | Descripción                |
| --------- | ------ | -------------------------- |
| `search`  | string | Buscar en projectNumber, projectName |
| `limit`   | number | Max resultados (default: 10) |

### Request Example

```bash
GET /api/payments/search-projects?search=P 0001&limit=5
```

### Response

```json
[
  {
    "id": "uuid-proj-1",
    "projectNumber": "P 0001-2025",
    "projectName": "Instalación Ventanas",
    "customerId": "uuid-123",
    "customer": {
      "id": "uuid-123",
      "name": "Juan Pérez"
    },
    "total": 1785000.00,
    "currency": "CLP",
    "balance": 1285000.00  // Calculado
  }
]
```

### Implementación

```typescript
// app/api/payments/search-projects/route.ts
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)

  const search = searchParams.get('search') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  logger.info({ search, limit }, 'Searching projects')

  const projects = await prisma.project.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { projectNumber: { contains: search, mode: 'insensitive' } },
            { projectName: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        // Opcional: Filtrar solo proyectos con balance > 0
        // Requiere consulta más compleja con aggregation
      ]
    },
    include: {
      customer: {
        select: { id: true, name: true }
      },
      paymentAllocations: {
        select: { allocatedAmount: true }
      }
    },
    orderBy: { projectNumber: 'desc' },
    take: limit
  })

  // Calcular balance y filtrar
  const projectsWithBalance = projects
    .map(project => {
      const totalPaid = project.paymentAllocations.reduce(
        (sum, a) => sum + Number(a.allocatedAmount),
        0
      )
      const balance = Number(project.total) - totalPaid

      return {
        id: project.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        customerId: project.customerId,
        customer: project.customer,
        total: Number(project.total),
        currency: project.currency,
        balance
      }
    })
    .filter(p => p.balance > 0.01)  // Solo con balance pendiente

  logger.info({ found: projectsWithBalance.length }, 'Projects found')

  return NextResponse.json(projectsWithBalance)
})
```

---

## GET /api/payments/customer-projects

Obtener proyectos de un cliente específico (para pago a cliente).

### Query Parameters

| Parámetro    | Tipo | Descripción         |
| ------------ | ---- | ------------------- |
| `customerId` | UUID | ID del cliente (required) |

### Response

Similar a `search-projects` pero sin filtro de búsqueda y todos los proyectos del cliente.

---

## POST /api/payments/[id]/cancel

Wrapper para DELETE (endpoint de conveniencia).

### Response

```json
{
  "success": true,
  "message": "Payment cancelled successfully"
}
```

### Implementación

```typescript
// app/api/payments/[id]/cancel/route.ts
export const POST = withLogging(async (request, logger, context) => {
  const { id } = context?.params || {}

  logger.info({ paymentId: id }, 'Cancelling payment')

  try {
    await prisma.payment.delete({
      where: { id }
    })

    logger.info({ paymentId: id }, 'Payment cancelled')

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully'
    })
  } catch (error) {
    if (error.code === 'P2025') {
      logger.warn({ paymentId: id }, 'Payment not found')
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    logger.error({ err: error }, 'Failed to cancel payment')
    throw error
  }
})
```

---

## Flujos de Negocio

### Flujo 1: Pago a Proyecto (1:1)

```
Usuario → Selecciona proyecto
   ↓
Sistema deriva:
   - customer (del proyecto)
   - currency (del proyecto)
   - balance pendiente
   ↓
Usuario ingresa:
   - amount (≤ balance)
   - paymentMethodId
   - date
   - [opcional] cuotas
   ↓
POST /api/payments
   {
     type: "Project",
     allocations: [{ projectId, allocatedAmount: amount }]
   }
   ↓
Sistema crea:
   Payment + 1 Allocation + [N Installments]
```

---

### Flujo 2: Pago a Cliente (1:N)

```
Usuario → Selecciona cliente
   ↓
Sistema carga proyectos del cliente con balance > 0
   ↓
Usuario ingresa amount total
   ↓
Usuario distribuye:
   Opción A: Botón "FIFO" → Asignación automática
   Opción B: Manual → Asigna monto por proyecto
   ↓
Validación: SUM(allocations) === amount
   ↓
POST /api/payments
   {
     type: "Customer",
     allocations: [
       { projectId: "A", allocatedAmount: 600 },
       { projectId: "B", allocatedAmount: 400 }
     ]
   }
   ↓
Sistema crea:
   Payment + N Allocations + [M Installments]
```

---

## Business Logic Helper: FIFO Allocation

```typescript
// lib/business-logic/payment-fifo.ts
export function allocatePaymentFIFO(
  amount: number,
  projects: Array<{ id: string; balance: number; date: Date }>
): Array<{ projectId: string; allocatedAmount: number }> {
  // Ordenar proyectos por fecha (más viejos primero)
  const sorted = [...projects].sort((a, b) => a.date.getTime() - b.date.getTime())

  const allocations: Array<{ projectId: string; allocatedAmount: number }> = []
  let remaining = amount

  for (const project of sorted) {
    if (remaining <= 0.01) break

    const toAllocate = Math.min(remaining, project.balance)

    if (toAllocate > 0.01) {
      allocations.push({
        projectId: project.id,
        allocatedAmount: toAllocate
      })
      remaining -= toAllocate
    }
  }

  return allocations
}
```

---

## Ver También

- [Payment Model](../01-data-model/payment-systems.md) - Modelo completo
- [PaymentAllocation Decision](../05-technical-decisions/payment-allocation.md) - Por qué N:M table
- [Installments](installments-api.md) - API de cuotas
- [FIFO Logic](../03-layers/business-logic.md#payment-fifo) - Lógica de asignación

**Última actualización:** 2025-10-30
