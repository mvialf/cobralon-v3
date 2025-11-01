# Payment Systems

Documentación detallada del sistema de pagos, asignaciones, cuotas y métodos de pago.

---

## Payment (Pagos)

### Modelo

```typescript
model Payment {
  id                   String   @id @default(uuid())
  type                 String   // "Project" | "Customer"
  amount               Decimal  @db.Decimal(12, 2)
  currency             String
  date                 DateTime
  reference            String?
  notes                String?
  customerId           String
  paymentMethodId      String
  selectedInstallments Int?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // Relationships
  customer       Customer            @relation(fields: [customerId], references: [id])
  paymentMethod  PaymentMethod       @relation(fields: [paymentMethodId], references: [id])
  allocations    PaymentAllocation[]
  installments   Installment[]

  // Indexes
  @@index([customerId])
  @@index([paymentMethodId])
  @@index([date])
  @@index([type])
  @@index([type, date(sort: Desc)])
}
```

### Campos

| Campo                  | Tipo          | Obligatorio | Descripción                                |
| ---------------------- | ------------- | ----------- | ------------------------------------------ |
| `type`                 | String        | ✅          | "Project" (1:1) o "Customer" (1:N)         |
| `amount`               | Decimal(12,2) | ✅          | Monto total del pago                       |
| `currency`             | String        | ✅          | Moneda (ej: "CLP", "USD")                  |
| `date`                 | DateTime      | ✅          | Fecha del pago                             |
| `reference`            | String        | ❌          | Número de referencia (ej: voucher, boleta) |
| `notes`                | String        | ❌          | Notas adicionales                          |
| `customerId`           | UUID (FK)     | ✅          | Referencia a Customer                      |
| `paymentMethodId`      | UUID (FK)     | ✅          | Referencia a PaymentMethod                 |
| `selectedInstallments` | Int           | ❌          | Número de cuotas (null = pago único)       |

### Tipos de Pago

#### 1. Payment tipo "Project" (1:1)

- Un pago se asigna a **UN SOLO** proyecto
- `allocations.length === 1` (validación backend)
- Caso de uso: Pago específico a un proyecto

**Ejemplo:**

```typescript
{
  type: "Project",
  amount: 1500000,
  allocations: [
    { projectId: "project-abc", allocatedAmount: 1500000 }
  ]
}
```

#### 2. Payment tipo "Customer" (1:N)

- Un pago se asigna a **MÚLTIPLES** proyectos del mismo cliente
- `allocations.length >= 1` (validación backend)
- Caso de uso: Pago global de cliente (FIFO o manual)

**Ejemplo:**

```typescript
{
  type: "Customer",
  amount: 2000000,
  allocations: [
    { projectId: "project-abc", allocatedAmount: 800000 },
    { projectId: "project-def", allocatedAmount: 700000 },
    { projectId: "project-ghi", allocatedAmount: 500000 }
  ]
}
```

### Validaciones Backend

```typescript
// app/api/payments/route.ts (POST)

// 1. Validar type vs allocations
if (type === 'Project' && allocations.length !== 1) {
  throw new Error('Payment tipo "Project" debe tener exactamente 1 allocation')
}

if (type === 'Customer' && allocations.length < 1) {
  throw new Error('Payment tipo "Customer" debe tener al menos 1 allocation')
}

// 2. Validar suma de allocations
const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
const tolerance = 0.01

if (Math.abs(totalAllocated - amount) > tolerance) {
  throw new Error(
    `La suma de allocations (${totalAllocated}) no coincide con el monto del pago (${amount})`
  )
}

// 3. Validar mismo cliente
const projects = await prisma.project.findMany({
  where: { id: { in: allocations.map((a) => a.projectId) } },
  select: { id: true, customerId: true, currency: true },
})

const uniqueCustomers = new Set(projects.map((p) => p.customerId))
if (uniqueCustomers.size > 1) {
  throw new Error('Todos los proyectos deben pertenecer al mismo cliente')
}

// 4. Validar misma currency
const uniqueCurrencies = new Set(projects.map((p) => p.currency))
if (uniqueCurrencies.size > 1) {
  throw new Error('Todos los proyectos deben tener la misma moneda')
}

// 5. Validar no duplicados
const uniqueProjectIds = new Set(allocations.map((a) => a.projectId))
if (uniqueProjectIds.size !== allocations.length) {
  throw new Error('No puede haber projectIds duplicados en allocations')
}
```

### Relaciones

- **N:1 con Customer** (FK `customerId`)
- **N:1 con PaymentMethod** (FK `paymentMethodId`)
- **1:N con PaymentAllocation** - Asignaciones a proyectos
  - `onDelete: CASCADE` - Eliminar pago elimina asignaciones
- **1:N con Installment** - Cuotas si `selectedInstallments > 1`
  - `onDelete: CASCADE` - Eliminar pago elimina cuotas

### Componentes

- **Form (1:1)**: `components/forms/payments/payment-to-project-form.tsx`
- **Form (1:N)**: `components/forms/payments/payment-to-customer-form.tsx`
- **Dialog (1:1)**: `components/dialogs/payments/payment-to-project-dialog.tsx`
- **Dialog (1:N)**: `components/dialogs/payments/payment-to-customer-dialog.tsx`
- **DataTable**: `app/payments/page.tsx`
- **Columns**: `app/payments/columns.tsx`

---

## PaymentAllocation (Asignaciones)

### Modelo

```typescript
model PaymentAllocation {
  id              String   @id @default(uuid())
  paymentId       String
  projectId       String
  allocatedAmount Decimal  @db.Decimal(12, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relationships
  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id])

  // Constraints
  @@unique([paymentId, projectId])

  // Indexes
  @@index([paymentId])
  @@index([projectId])
}
```

### Propósito

**Tabla intermedia N:M** entre Payment y Project que permite:

1. ✅ **Flexibilidad:** Un pago puede asignarse a 1 o múltiples proyectos
2. ✅ **Auditoría:** Historial completo de asignaciones
3. ✅ **Balance calculado:** `SUM(allocatedAmount) GROUP BY projectId`
4. ✅ **Soporta ambos tipos:** "Project" (1:1) y "Customer" (1:N)

### Constraint Único

```typescript
@@unique([paymentId, projectId])
```

**Propósito:** Un pago no puede asignarse dos veces al mismo proyecto.

### Validación Crítica

```typescript
// Business rule (validado en backend)
SUM(payment.allocations.allocatedAmount) === payment.amount
```

Si esta suma no coincide (tolerancia: 0.01), el sistema rechaza el pago.

### FIFO Allocation (Automática)

Para pagos tipo "Customer", el sistema puede asignar automáticamente usando algoritmo FIFO:

```typescript
// lib/business-logic/payment-fifo.ts
export function calculateFIFOAllocation(
  projects: ProjectWithBalance[],
  paymentAmount: number
): PaymentAllocation[] {
  const allocations: PaymentAllocation[] = []
  let remainingAmount = paymentAmount

  // Ordenar proyectos por fecha (más antiguos primero)
  const sortedProjects = [...projects].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  for (const project of sortedProjects) {
    if (remainingAmount <= 0) break

    const balance = calculateProjectBalance(project)
    if (balance <= 0) continue

    const allocatedAmount = Math.min(balance, remainingAmount)

    allocations.push({
      projectId: project.id,
      allocatedAmount,
    })

    remainingAmount -= allocatedAmount
  }

  return allocations
}
```

### Ver También

- [Decisión: ¿Por qué PaymentAllocation?](../05-technical-decisions/payment-allocation.md)
- [API: Payments](../06-apis/payments-api.md)

---

## Installment (Cuotas)

### Modelo

```typescript
model Installment {
  id                String    @id @default(uuid())
  paymentId         String
  installmentNumber Int
  amount            Decimal   @db.Decimal(12, 2)
  dueDate           DateTime
  paidDate          DateTime?
  status            String    // "pending" | "paid"
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relationships
  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([paymentId])
  @@index([status, dueDate])
}
```

### Campos

| Campo               | Tipo          | Obligatorio | Descripción                       |
| ------------------- | ------------- | ----------- | --------------------------------- |
| `installmentNumber` | Int           | ✅          | Número de cuota (1, 2, 3...)      |
| `amount`            | Decimal(12,2) | ✅          | Monto de la cuota                 |
| `dueDate`           | DateTime      | ✅          | Fecha de vencimiento              |
| `paidDate`          | DateTime      | ❌          | Fecha de pago (null si pendiente) |
| `status`            | String        | ✅          | "pending" o "paid"                |

### Creación Automática

Las cuotas se crean **automáticamente** al crear un Payment con `selectedInstallments > 1`:

```typescript
// app/api/payments/route.ts (POST)
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
      installments: {
        create: installments,
      },
    },
  })
}
```

### Business Logic

1. **Primera cuota:** `dueDate = payment.date` (vence el día del pago)
2. **Siguientes cuotas:** `dueDate += 30 días` cada una
3. **Última cuota:** Absorbe centavos residuales para que `SUM(installments.amount) === payment.amount`
4. **Estado inicial:** Todas las cuotas inician con `status = "pending"`

### Marcado Automático (Cron Job)

El sistema marca cuotas como "paid" automáticamente:

```typescript
// app/api/cron/mark-installments-paid/route.ts
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

### Vista Global

Página dedicada para ver todas las cuotas del sistema:

```
GET /api/installments?status=pending&customerId=abc&page=1&limit=10
```

**Features:**

- Filtros: status, paymentId, customerId, dateRange
- Paginación
- Includes: payment.customer, payment.allocations.project

### Componentes

- **Page**: `app/payments/installments/page.tsx`
- **DataTable**: Usa data-table genérico
- **Columns**: `app/payments/installments/columns.tsx`
- **API**: `app/api/installments/route.ts`
- **Cron**: `app/api/cron/mark-installments-paid/route.ts`

### Ver También

- [Decisión: ¿Por qué tabla separada?](../05-technical-decisions/installments-separate.md)
- [Flujo: Gestión de Cuotas](../02-business-flows/installments.md)
- [API: Installments](../06-apis/installments-api.md)
- [API: Cron Job](../06-apis/cron-api.md)

---

## PaymentMethod (Métodos de Pago)

### Modelo

```typescript
model PaymentMethod {
  id              String   @id @default(uuid())
  name            String   @unique
  active          Boolean  @default(true)
  order           Int
  icon            String?
  hasInstallments Boolean  @default(false)
  maxInstallments Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relationships
  payments Payment[]

  // Indexes
  @@index([active, order])
}
```

### Campos

| Campo             | Tipo    | Obligatorio | Descripción                                     |
| ----------------- | ------- | ----------- | ----------------------------------------------- |
| `name`            | String  | ✅          | Nombre (ej: "Efectivo", "Transferencia"), único |
| `active`          | Boolean | ✅          | Activo/visible (default: true)                  |
| `order`           | Int     | ✅          | Orden de visualización                          |
| `icon`            | String  | ❌          | Nombre del ícono Lucide (ej: "Banknote")        |
| `hasInstallments` | Boolean | ✅          | Soporta cuotas (default: false)                 |
| `maxInstallments` | Int     | ❌          | Máximo de cuotas permitidas (ej: 12)            |

### Métodos Seedeados

```typescript
// prisma/seed.ts
const paymentMethods = [
  {
    name: 'Efectivo',
    active: true,
    order: 1,
    icon: 'Banknote',
    hasInstallments: false,
  },
  {
    name: 'Transferencia',
    active: true,
    order: 2,
    icon: 'ArrowRightLeft',
    hasInstallments: false,
  },
  {
    name: 'Tarjeta de Crédito',
    active: true,
    order: 3,
    icon: 'CreditCard',
    hasInstallments: true,
    maxInstallments: 12,
  },
  {
    name: 'Cheque',
    active: true,
    order: 4,
    icon: 'FileText',
    hasInstallments: false,
  },
]
```

### Configuración desde UI

**Pendiente de implementar:**

- CRUD completo de métodos de pago
- Toggle active/inactive
- Reordenar (drag & drop)

**Actualmente:**

- Métodos seedeados en DB
- Query filtra por `active: true`
- Combobox usa `order` para ordenar

### API Actual

```
GET /api/payment-methods          → Listar todos (filtrar por active)
POST /api/payment-methods/[id]/toggle → Toggle active/inactive
```

### Validación de Cuotas

```typescript
// En payment form
if (paymentMethod.hasInstallments) {
  // Mostrar campo de cuotas
  // Max: paymentMethod.maxInstallments
} else {
  // Ocultar campo, forzar selectedInstallments = null
}
```

### Componentes

- **Combobox**: `components/ui/combobox.tsx` (usado en payment forms)
- **API**: `app/api/payment-methods/route.ts`
- **API Toggle**: `app/api/payment-methods/[id]/toggle/route.ts`

---

## Ver También

- [ER Diagram](er-diagram.md) - Diagrama completo del sistema
- [Customer & Project Systems](customer-project-systems.md) - Clientes y proyectos
- [Relationships](relationships.md) - Tabla de relaciones
- [Flujos de Negocio](../02-business-flows/) - Flujos de creación de pagos
- [APIs](../06-apis/) - Endpoints completos

---

**Última actualización:** 2025-10-30
