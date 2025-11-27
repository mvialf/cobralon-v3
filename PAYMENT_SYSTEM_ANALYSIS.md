# Sistema de Pagos - Análisis Exhaustivo

**Proyecto:** Cobralon  
**Fecha:** 2025-11-27  
**Stack:** Next.js 15 + React 19 + TypeScript + Prisma + PostgreSQL  
**Profundidad:** Very Thorough (exhaustivo)

---

## Índice

1. [Estructura del Modelo de Datos](#estructura-del-modelo-de-datos)
2. [Arquitectura de Asignaciones (N:M)](#arquitectura-de-asignaciones-nm)
3. [Flujos de Pago Duales](#flujos-de-pago-duales)
4. [Validaciones Implementadas](#validaciones-implementadas)
5. [API Routes](#api-routes)
6. [Componentes UI](#componentes-ui)
7. [Lógica de Negocio](#lógica-de-negocio)
8. [Sistema de Crédito por Sobrepago](#sistema-de-crédito-por-sobrepago)
9. [Decisiones Arquitecturales](#decisiones-arquitecturales)
10. [Observaciones y Análisis](#observaciones-y-análisis)

---

## Estructura del Modelo de Datos

### Diagrama Entidad-Relación

```
Customer (1)  ──────────┬─────────────── (N) Project
    │                   │
    │              balance = total - SUM(paymentAllocations)
    │
    ├─────────────────── (N) Payment
    │
    ├─────────────────── (N) CreditTransaction
    │
    └─────────────────── creditBalance (Decimal)


Payment (1)  ─────┬────────────── (N) PaymentAllocation ────────── (1) Project
    │             │
    │         allocatedAmount
    │
    ├─────────── (N) Installment
    │
    └─────────── (1) PaymentMethod
```

---

### Tabla: Customer

**Ubicación:** `prisma/schema.prisma:22-36`

```prisma
model Customer {
  id              String              @id @default(uuid())
  name            String              // Nombre del cliente
  phone           String              // Teléfono principal
  email           String?             // Email (opcional)
  creditBalance   Decimal             @default(0) @db.Decimal(12, 2)  // ⭐ Crédito disponible
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  // Relaciones
  payments                Payment[]
  projects                Project[]
  creditTransactions      CreditTransaction[]

  @@index([name])
  @@index([email])
}
```

**Propósito:** Entidad principal que agrupa proyectos y pagos.

**Campo crítico:** `creditBalance` - Acumula sobrepagos para uso futuro.

---

### Tabla: Project

**Ubicación:** `prisma/schema.prisma:99-139`

```prisma
model Project {
  id                  String              @id @default(uuid())
  projectNumber       String              // Ej: "2025-089"
  projectName         String?             // Ej: "Ampliación Bodega"
  customerId          String
  phone               String
  street              String
  apartment           String?
  comuna              String
  region              String

  date                DateTime            @default(now())
  subtotal            Decimal             @db.Decimal(12, 2)
  taxRate             Decimal             @default(19.0) @db.Decimal(5, 2)
  total               Decimal             @db.Decimal(12, 2)  // Monto total del proyecto
  balance             Decimal             @default(0) @db.Decimal(12, 2)  // ⭐ CALCULADO

  currency            String              @default("CLP")
  totalAmount         Decimal?            @db.Decimal(12, 2)

  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  // Relaciones
  customer            Customer            @relation(fields: [customerId], references: [id], onDelete: Cascade)
  paymentAllocations  PaymentAllocation[] // ⭐ Tabla intermedia N:M
  aftersales          Aftersale[]
  calendarEvents      ProjectEvent[]
  creditTransactions  CreditTransaction[]

  @@index([customerId])
  @@index([projectNumber])
  @@index([balance])  // Para filtros eficientes
  @@index([customerId, projectStatusId])
}
```

**Propósito:** Obra/proyecto sobre el que se registran pagos.

**Campo crítico:** `balance = total - SUM(paymentAllocations.allocatedAmount)`

**Cálculo:**

```typescript
const { balance } = calculateProjectBalance({
  totalAmount: project.totalAmount,
  allocations: project.paymentAllocations,
})
// balance = totalAmount - SUM(allocations)
```

---

### Tabla: Payment

**Ubicación:** `prisma/schema.prisma:156-180`

```prisma
model Payment {
  id                   String              @id @default(uuid())
  type                 String              // "Project" (1:1) | "Customer" (1:N)
  amount               Decimal             @db.Decimal(12, 2)  // Monto total
  currency             String              // "CLP", "USD"
  date                 DateTime            // Fecha del pago
  reference            String?             // Voucher, boleta, etc.
  notes                String?             // Notas del usuario
  customerId           String
  paymentMethodId      String
  selectedInstallments Int?                // Nº cuotas (null = pago único)

  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  // Relaciones
  customer             Customer            @relation(fields: [customerId], references: [id])
  paymentMethod        PaymentMethod       @relation(fields: [paymentMethodId], references: [id])
  allocations          PaymentAllocation[] // ⭐ N:M intermedia
  installments         Installment[]       // Cuotas
  creditTransactions   CreditTransaction[]

  @@index([customerId])
  @@index([paymentMethodId])
  @@index([date])
  @@index([type, date(sort: Desc)])
}
```

**Propósito:** Registro de cada pago realizado.

**Campos críticos:**

- `type`: Define flujo (simplificado vs avanzado)
- `allocations`: Permite 1 o N asignaciones
- `selectedInstallments`: Número de cuotas

---

### Tabla: PaymentAllocation (⭐ TABLA INTERMEDIA N:M)

**Ubicación:** `prisma/schema.prisma:198-210`

```prisma
model PaymentAllocation {
  id              String   @id @default(uuid())
  paymentId       String
  projectId       String
  allocatedAmount Decimal  @db.Decimal(12, 2)  // ⭐ Cuánto de este pago se asigna a este proyecto
  createdAt       DateTime @default(now())

  payment         Payment  @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  project         Project  @relation(fields: [projectId], references: [id])

  @@unique([paymentId, projectId])  // Un pago solo 1 vez por proyecto
  @@index([paymentId])
  @@index([projectId])
}
```

**PROPÓSITO FUNDAMENTAL:**

Permite asignación flexible de pagos:

- ✅ 1 pago → 1 proyecto (caso común 90%)
- ✅ 1 pago → N proyectos (caso avanzado 10%)

**INVARIANTES:**

```
1. SUM(PaymentAllocation[paymentId].allocatedAmount) === Payment.amount
2. Nunca duplicados: UNIQUE([paymentId, projectId])
3. Todos los proyectos del pago pertenecen al mismo cliente
4. Todos los proyectos comparten la misma currency
```

**EJEMPLO PRÁCTICO:**

```
Pago P1: $1,000,000
├─ Asignación A1: Proyecto "Casa 1" → $400,000
├─ Asignación A2: Proyecto "Casa 2" → $350,000
├─ Asignación A3: Proyecto "Casa 3" → $250,000
└─ SUM = $1,000,000 ✓
```

---

### Tabla: PaymentMethod

**Ubicación:** `prisma/schema.prisma:141-154`

```prisma
model PaymentMethod {
  id              String    @id @default(uuid())
  name            String    @unique
  active          Boolean   @default(true)
  order           Int       @default(0)
  icon            String?   // Ícono Lucide
  hasInstallments Boolean   @default(false)
  maxInstallments Int?      // Máximo de cuotas

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  payments        Payment[]

  @@index([active, order])
}
```

**Métodos Seedeados:**

1. Efectivo
2. Transferencia
3. Tarjeta de Crédito (máx 12 cuotas)
4. Cheque

---

### Tabla: Installment

**Ubicación:** `prisma/schema.prisma:182-196`

```prisma
model Installment {
  id                String    @id @default(uuid())
  paymentId         String
  installmentNumber Int       // 1, 2, 3...
  amount            Decimal   @db.Decimal(12, 2)
  dueDate           DateTime  // Fecha de vencimiento
  paidDate          DateTime? // Fecha de pago (null = pendiente)
  status            String    @default("pending")

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  payment           Payment   @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([paymentId])
  @@index([status, dueDate])
}
```

**CREACIÓN AUTOMÁTICA:** Se generan N registros al crear Payment con `selectedInstallments > 1`.

**ÚLTIMA CUOTA:** Absorbe centavos residuales para exactitud.

---

### Tabla: CreditTransaction

**Ubicación:** `prisma/schema.prisma:395-433`

```prisma
model CreditTransaction {
  id          String                 @id @default(uuid())
  customerId  String
  customer    Customer               @relation(fields: [customerId], references: [id], onDelete: Cascade)

  amount      Decimal                @db.Decimal(12, 2)  // Positivo o negativo
  type        CreditTransactionType  // OVERPAYMENT | APPLIED | REFUND | WITHDRAWAL | ADJUSTMENT
  description String?                @db.Text

  projectId   String?                // Ref. si aplica
  project     Project?               @relation(fields: [projectId], references: [id], onDelete: SetNull)

  paymentId   String?                // Ref. si aplica
  payment     Payment?               @relation(fields: [paymentId], references: [id], onDelete: SetNull)

  metadata    Json?
  createdAt   DateTime               @default(now())

  @@index([customerId, createdAt(sort: Desc)])
  @@index([type])
  @@index([projectId])
  @@index([paymentId])
}

enum CreditTransactionType {
  OVERPAYMENT  // Sobrepago generado
  APPLIED      // Crédito aplicado
  REFUND       // Devolución
  WITHDRAWAL   // Retiro
  ADJUSTMENT   // Ajuste manual
}
```

**PROPÓSITO:** Auditoría completa de todos los movimientos de crédito.

---

## Arquitectura de Asignaciones (N:M)

### ¿Por Qué Tabla Intermedia?

**Problema:** Un pago puede necesitar asignarse a múltiples proyectos.

**Alternativas evaluadas:**

| Opción                   | Descripción                 | Pros                              | Contras                                     | Elegida |
| ------------------------ | --------------------------- | --------------------------------- | ------------------------------------------- | ------- |
| **1. FK Directo**        | `Payment.projectId`         | Simple, performance               | ❌ 1 pago = 1 proyecto SIEMPRE              | ❌ No   |
| **2. JSON Field**        | `Payment.allocations: JSON` | Flexible                          | ❌ No type-safe, sin integridad referencial | ❌ No   |
| **3. PaymentAllocation** | Tabla intermedia N:M        | ✅ Flexible, type-safe, queryable | ⚠️ Validaciones complejas                   | ✅ SÍ   |

### Decisión: Tabla Intermedia PaymentAllocation

**Decisión Arquitectural:** ADR-001 (2025-10-21)

**Beneficios:**

- ✅ Flexibilidad máxima (1:1 O 1:N)
- ✅ Type-safe con Prisma
- ✅ Auditoría precisa (`allocatedAmount` por proyecto)
- ✅ Queries relacionales
- ✅ Integridad referencial (no projectIds huérfanos)

**Trade-offs:**

- ⚠️ Validaciones complejas (15+ checks)
- ⚠️ JOINs adicionales (mitigado con `relationLoadStrategy: 'join'`)
- ⚠️ ~400 líneas de código extra

---

## Flujos de Pago Duales

### Flow A: "Pago a Proyecto" (1:1 Simplificado)

**Ubicación:** `components/forms/payments/payment-to-project-form.tsx`

**Caso de uso:** 90% de pagos - Pago directo a UN proyecto específico.

**Schema Zod:**

```typescript
export const paymentToProjectSchema = z.object({
  projectId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  date: z.date(),
  paymentMethodId: z.string().uuid(),
  selectedInstallments: z.coerce.number().optional().nullable(),
  creditApplied: z.coerce.number().min(0).optional().default(0),
  notes: z.string().max(500).trim().optional().nullable(),
})
```

**UX Simplificada:**

```
1. [Seleccionar Proyecto]
   ↓ Se cargan automáticamente:
   - Cliente
   - Currency
   - Balance actual

2. [Ingresar Monto]
   ↓ Validación: monto <= (balance + creditApplied)

3. [Seleccionar Método + Cuotas]
   ↓ Si método soporta cuotas: mostrar campo

4. [Notas opcionales]
   ↓

5. [Submit]
   ↓ Crea 1 PaymentAllocation
```

**Componentes:**

- **Form:** `PaymentToProjectForm`
- **Dialog:** `PaymentToProjectDialog`
- **API:** POST `/api/payments` con `type: "Project"`

---

### Flow B: "Pago a Cliente" (1:N Avanzado)

**Ubicación:** `components/forms/payments/payment-to-customer-form.tsx`

**Caso de uso:** 10% de pagos - Pago distribuido entre MÚLTIPLES proyectos.

**Schema Zod:**

```typescript
export const paymentToCustomerSchema = z
  .object({
    customerId: z.string().uuid(),
    amount: z.coerce.number().positive(),
    date: z.date(),
    paymentMethodId: z.string().uuid(),
    selectedInstallments: z.coerce.number().optional().nullable(),
    notes: z.string().max(500).trim().optional().nullable(),
    allocations: z
      .array(
        z.object({
          projectId: z.string().uuid(),
          allocatedAmount: z.coerce.number().positive(),
        })
      )
      .min(1),
  })
  .refine(
    (data) => {
      const sum = data.allocations.reduce((s, a) => s + a.allocatedAmount, 0)
      return Math.abs(sum - data.amount) < TOLERANCE
    },
    { message: 'Suma de asignaciones debe ser igual al monto total' }
  )
```

**UX Avanzada:**

```
1. [Seleccionar Cliente]
   ↓ Se cargan todos sus proyectos con balance

2. [Ingresar Monto Total]
   ↓ Se activa botón "Distribuir FIFO"

3. [Elegir distribución]

   OPCIÓN A: FIFO Automático
   ├─ Clickea "Distribuir FIFO"
   ├─ Sistema calcula automáticamente
   └─ Llena tabla con asignaciones

   OPCIÓN B: Manual
   ├─ Ingresa montos por proyecto
   ├─ Validación en tiempo real: SUM === monto total
   └─ Submit cuando suma coincida

4. [Seleccionar Método + Cuotas]

5. [Submit]
   ↓ Crea N PaymentAllocations
```

**Componentes:**

- **Form:** `PaymentToCustomerForm`
- **Dialog:** `PaymentToCustomerDialog`
- **API:** POST `/api/payments` con `type: "Customer"`

---

### Algoritmo FIFO (First-In-First-Out)

**Archivo:** `lib/business-logic/payment-fifo.ts`

**Propósito:** Distribución automática inteligente usando regla contable FIFO.

```typescript
export function calculateFIFO(
  totalAmount: number,
  projects: ProjectWithBalance[]
): FIFOAllocation[] {
  // 1. Ordenar por fecha de creación (más antiguo primero)
  const sorted = [...projects].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const allocations: FIFOAllocation[] = []
  let remaining = totalAmount

  // 2. Iterar y asignar hasta que se acabe el dinero
  for (const project of sorted) {
    if (remaining <= 0) break

    // 3. Calcular balance actual
    const { balance } = calculateProjectBalance(project)

    // 4. Skip si ya está pagado
    if (balance <= 0) continue

    // 5. Asignar: min(balance, remaining)
    const allocated = Math.min(balance, remaining)

    allocations.push({
      projectId: project.id,
      balance,
      allocatedAmount: allocated,
      isFullyPaid: allocated >= balance,
    })

    remaining -= allocated
  }

  return allocations
}
```

**EJEMPLO PRÁCTICO:**

```
Proyectos ordenados por fecha:
├─ P1 (2025-01-01): balance $300,000
├─ P2 (2025-02-01): balance $400,000
└─ P3 (2025-03-01): balance $500,000

Pago: $500,000

Ejecución FIFO:
1. P1: Asignar min($300k, $500k) = $300k → remaining = $200k
2. P2: Asignar min($400k, $200k) = $200k → remaining = $0
3. P3: remaining = 0 → NO asignar

Resultado:
├─ P1: $300,000 (FULLY PAID ✓)
├─ P2: $200,000 (balance queda en $200k)
└─ P3: $0
```

---

## Validaciones Implementadas

### Frontend Validations (Zod)

**Archivo:** `lib/validations/payment-validations.ts`

#### Validaciones Numéricas

```typescript
// Monto positivo y con máximo 2 decimales
amount: z.coerce
  .number()
  .positive('El monto debe ser mayor a 0')
  .multipleOf(0.01, 'Máximo 2 decimales')

// Cuotas enteras
selectedInstallments: z.coerce
  .number()
  .int('Debe ser entero')
  .min(1, 'Mínimo 1')
  .max(12, 'Máximo 12')
  .optional()
  .nullable()
```

#### Validación de Suma (Pago a Cliente)

```typescript
.refine(
  (data) => {
    const sum = data.allocations.reduce((s, a) => s + a.allocatedAmount, 0)
    return Math.abs(sum - data.amount) < TOLERANCE  // 0.01
  },
  { message: 'Suma debe ser igual al monto total' }
)
```

#### Validación de Duplicados

```typescript
.refine(
  (allocations) => {
    const projectIds = allocations.map(a => a.projectId)
    return new Set(projectIds).size === projectIds.length
  },
  { message: 'No puede asignar el mismo proyecto dos veces' }
)
```

---

### Backend Validations (API Route)

**Archivo:** `app/api/payments/route.ts:189-520`

**16+ Validaciones Implementadas:**

1. **Type Validation**

   ```
   type === 'Project' → allocations.length === 1
   type === 'Customer' → allocations.length >= 1
   ```

2. **Sum Validation**

   ```
   SUM(allocations) === amount (tolerance: $0.01)
   ```

3. **Customer Validation**

   ```
   customer.exists()
   all projects belong to same customer
   ```

4. **Currency Validation**

   ```
   all projects have same currency
   payment.currency matches project.currency
   ```

5. **Duplicate Validation**

   ```
   no duplicate projectIds in allocations
   ```

6. **Existence Validation**

   ```
   customer.exists()
   paymentMethod.exists() && active
   all projects exist
   ```

7. **Payment Method Validation**

   ```
   if hasInstallments:
     - selectedInstallments <= maxInstallments
     - selectedInstallments >= 2 (o null)
   ```

8. **Credit Validation**
   ```
   if creditApplied > 0:
     - customer.creditBalance >= creditApplied
     - totalPayment >= projectBalance (no overpayment sin crédito)
   ```

9-16. Validaciones adicionales de integridad y consistencia.

---

## API Routes

### GET /api/payments

**Descripción:** Obtiene lista de pagos con filtros, paginación e includes.

**Query Parameters:**

```
page: Int (default: 1)
limit: Int (default: 10, max: 100)
customerId: UUID (opcional)
projectId: UUID (opcional) - Filtra via allocations
startDate: ISO string (opcional)
endDate: ISO string (opcional)
```

**Implementación:**

```typescript
const payments = await prisma.payment.findMany({
  relationLoadStrategy: 'join', // ← Evita N+1 queries
  where: {
    customerId: customerId || undefined,
    date: dateRange || undefined,
    allocations: projectId ? { some: { projectId } } : undefined,
  },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { date: 'desc' },
  include: {
    customer: { select: { id, name, phone } },
    paymentMethod: { select: { id, name, icon } },
    allocations: {
      include: { project: true },
      orderBy: { project: { createdAt: 'asc' } }, // FIFO order
    },
  },
})
```

**Optimizaciones:**

- `relationLoadStrategy: 'join'` evita N+1
- Índices compuestos en schema
- Paginación estándar

---

### POST /api/payments

**Descripción:** Crea nuevo pago con allocations e installments.

**Lógica de Creación:**

1. **Validaciones Backend** (16+ checks)

2. **Transacción Atómica:**

   ```typescript
   await prisma.$transaction(async (tx) => {
     // 1. Crear Payment
     const payment = await tx.payment.create({
       data: {
         type,
         customerId,
         amount,
         currency,
         date,
         paymentMethodId,
         reference,
         notes,
         selectedInstallments,
         allocations: { create: allocations },
       },
     })

     // 2. Crear Installments si aplica
     if (selectedInstallments > 1) {
       await tx.installment.createMany({
         data: installments,
       })
     }

     // 3. Procesar crédito si hay sobrepago
     if (generatedCredit > 0) {
       await tx.creditTransaction.create({
         data: {
           customerId,
           paymentId: payment.id,
           type: 'OVERPAYMENT',
           amount: generatedCredit,
         },
       })
     }

     // 4. Actualizar Customer.creditBalance
     await tx.customer.update({
       where: { id: customerId },
       data: { creditBalance: { increment: newCredit } },
     })

     // 5. Actualizar Project.balance
     // (se calcula automáticamente via include)
   })
   ```

3. **Cálculo de Cuotas:**

   ```typescript
   const installmentAmount = Math.floor((amount / selectedInstallments) * 100) / 100

   for (let i = 1; i <= selectedInstallments; i++) {
     const isLast = i === selectedInstallments
     const cuotaAmount = isLast
       ? amount - installmentAmount * (selectedInstallments - 1)
       : installmentAmount

     installments.push({
       installmentNumber: i,
       amount: cuotaAmount,
       dueDate: addDays(date, (i - 1) * 30),
       status: 'pending',
     })
   }
   ```

---

### GET /api/payments/search-projects

**Descripción:** Busca proyectos con balance para crear pagos.

**Query Parameters:**

```
q: String (min 2 caracteres)
limit: Int (default: 20, max: 50)
```

**Búsqueda en:**

- `projectNumber` (case-insensitive)
- `projectName` (case-insensitive)
- `customer.name` (case-insensitive)

**Implementación:**

```typescript
const projects = await prisma.project.findMany({
  where: {
    totalAmount: { gt: 0 },
    OR: [
      { projectNumber: { contains: q, mode: 'insensitive' } },
      { projectName: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
    ],
  },
  include: {
    customer: { select: { id, name } },
    paymentAllocations: { select: { allocatedAmount: true } },
  },
  take: limit,
  orderBy: { createdAt: 'desc' },
})

// Calcular balance
const projectsWithBalance = projects.map((p) => ({
  ...p,
  balance: p.totalAmount - SUM(p.paymentAllocations),
}))
```

**Response:** Array de `ProjectWithBalance`

---

## Componentes UI

### Formularios

#### PaymentToProjectForm

**Archivo:** `components/forms/payments/payment-to-project-form.tsx`

**Features:**

- ProjectSearchField (búsqueda + autocomplete)
- Derivación automática de customer + currency
- Visualización de balance
- PaymentMethodFields (método + cuotas)
- PaymentAmountDateFields (monto + fecha)
- CreditApplicationFields (aplicar crédito)
- Notas opcionales

**Flujo:**

```
1. Seleccionar proyecto
   → Load customer.creditBalance
   → Show project balance

2. Ingresar monto
   → Validación: amount <= (balance + credit)
   → Sugerir usar crédito disponible

3. Seleccionar método
   → Si hasInstallments: show cuotas field
   → Validar selectedInstallments <= maxInstallments

4. Submit
   → Zod validation
   → Transform to API payload
   → POST /api/payments
```

---

#### PaymentToCustomerForm

**Archivo:** `components/forms/payments/payment-to-customer-form.tsx`

**Features:**

- CustomerSearchField
- Tabla dinámica de proyectos
- Botón "FIFO Auto-distribución"
- Validación de suma en tiempo real
- Inputs de asignación manual

**Flujo:**

```
1. Seleccionar cliente
   → Load projects with balance

2. Ingresar monto total
   → Enable FIFO button

3. Distribuir

   A) FIFO Automático
   ├─ Click "FIFO"
   ├─ Calculate allocations
   ├─ Fill table

   B) Manual
   ├─ Input per project
   ├─ Validate SUM === amount
   └─ Enable submit when sum matches

4. Submit
   → POST /api/payments
```

---

### Diálogos

- **PaymentToProjectDialog:** Wrapper que abre form 1:1 en modal
- **PaymentToCustomerDialog:** Wrapper que abre form 1:N en modal
- **PaymentDetailsDialog:** View read-only de pago existente

---

### Tablas

- **ProjectPaymentsTable:** Pagos de un proyecto específico
- **PaymentsDataTable:** Tabla principal de pagos (página `/payments`)

---

## Lógica de Negocio

### Cálculo de Balance de Proyecto

**Archivo:** `lib/business-logic/project-balance.ts`

```typescript
export function calculateProjectBalance(project: {
  totalAmount: number | null
  paymentAllocations?: Array<{ allocatedAmount: number }>
}): { balance: number; totalPaid: number } {
  const total = project.totalAmount ?? 0
  const totalPaid = project.paymentAllocations?.reduce((sum, a) => sum + a.allocatedAmount, 0) ?? 0

  return {
    totalPaid,
    balance: Math.max(0, total - totalPaid), // Nunca negativo
  }
}
```

**INVARIANTE:** `balance >= 0` SIEMPRE

---

### Sistema de Crédito por Sobrepago

**Archivo:** `lib/business-logic/credit-management.ts`

**Concepto:** Sobrepagos se convierten automáticamente en crédito para usar en otros proyectos.

**Función Principal:**

```typescript
export function calculatePaymentDistribution(
  projectBalance: number,
  paymentAmount: number,
  customerCreditApplied: number = 0
): {
  appliedToProject: number
  generatedCredit: number
  newProjectBalance: number
  newCustomerCredit: number
} {
  const totalPayment = paymentAmount + customerCreditApplied
  const appliedToProject = Math.min(totalPayment, projectBalance)
  const generatedCredit = Math.max(0, totalPayment - projectBalance)

  return {
    appliedToProject,
    generatedCredit,
    newProjectBalance: projectBalance - appliedToProject,
    newCustomerCredit: generatedCredit - customerCreditApplied,
  }
}
```

**EJEMPLO 1: Sobrepago genera crédito**

```
Proyecto: balance $200,000
Pago: $500,000 cash
Crédito aplicado: $0

Resultado:
├─ Aplicado a proyecto: $200,000
├─ Generado de crédito: $300,000 ✓
└─ Nuevo crédito cliente: +$300,000
```

**EJEMPLO 2: Aplicar crédito existente**

```
Proyecto: balance $500,000
Pago: $200,000 cash
Crédito disponible: $400,000
Crédito aplicado: $300,000 (usuario elige)

Resultado:
├─ Total disponible: $200k + $300k = $500k
├─ Aplicado a proyecto: $500,000
├─ Nuevo balance proyecto: $0
└─ Crédito consumido: -$300,000
```

---

## Constantes Financieras

**Archivo:** `lib/constants/financial-constants.ts`

```typescript
export const FINANCIAL = {
  DECIMAL_PRECISION: 0.01, // Centavo
  TOLERANCE: 0.01, // Tolerancia de redondeo
  ROUNDING: 2, // 2 decimales
} as const

export const PAYMENT_PROGRESS_THRESHOLDS = {
  COMPLETE: 99.95, // >= 99.95% → verde "100%"
  HIGH: 67, // >= 67% → neutral
  MEDIUM: 34, // >= 34% → secundario
  // < 34% → destructive (rojo)
} as const
```

---

## Decisiones Arquitecturales

### ADR-001: PaymentAllocation Architecture (N:M)

**Estado:** Aceptado (2025-10-21)

**Decisión:** Usar tabla intermedia `PaymentAllocation` en lugar de:

- FK directo (inflexible)
- JSON field (no type-safe)

**Beneficios:**

- ✅ Flexibilidad (1:1 O 1:N)
- ✅ Auditoría precisa
- ✅ Type-safe
- ✅ Queryable

**Trade-offs:**

- ⚠️ 15+ validaciones backend
- ⚠️ ~400 líneas de código extra

---

### ADR-002: Dual Payment Flows

**Estado:** Aceptado (2025-10-22)

**Decisión:** Dos UX flows especializados:

- Flow A: PaymentToProjectForm (1:1 simplificado)
- Flow B: PaymentToCustomerForm (1:N avanzado)

**Razón:** Flujo único universal sería confuso para caso común (90%).

**Beneficios:**

- ✅ UX optimizada
- ✅ Error prevention
- ✅ Schemas especializados

---

## Observaciones y Análisis

### ✅ Fortalezas

1. **Modelo de Datos Flexible**
   - PaymentAllocation permite adaptarse a nuevos requisitos sin breaking changes
   - Extensible (fácil agregar descuentos, notas por allocation)

2. **Validaciones Exhaustivas**
   - 16+ validaciones backend
   - Zod schemas en frontend
   - Invariantes de negocio preservadas

3. **Auditoría Completa**
   - Cada allocation rastrea qué pago cubrió qué proyecto
   - CreditTransaction logging completo
   - Historial de créditos

4. **Manejo de Crédito Sofisticado**
   - Sobrepagos generan crédito automático
   - Crédito aplicable a otros proyectos
   - Audit trail completo

5. **Performance Optimizado**
   - `relationLoadStrategy: 'join'` evita N+1
   - Índices compuestos
   - Paginación

---

### ⚠️ Áreas de Atención

1. **Complejidad de Validaciones**
   - 16+ validaciones pueden ser frágiles si reglas cambian
   - **Recomendación:** Crear objeto de validación centralizado

2. **Cuotas y Cron Jobs**
   - Cuotas se marcan como "paid" automáticamente
   - **Riesgo:** Si cron falla, quedan pendientes indefinidamente
   - **Recomendación:** Implementar retry logic

3. **Tolerancia de Redondeo**
   - TOLERANCE = 0.01 (centavo)
   - **Riesgo:** 3+ decimales en monedas extranjeras
   - **Recomendación:** Ajustar según monedas soportadas

4. **Race Conditions**
   - Múltiples pagos simultáneos a mismo proyecto
   - **Recomendación:** Database locks o versionado optimista

5. **Tests de API Routes**
   - No hay tests unitarios de POST /api/payments
   - **Recomendación:** Agregar tests de transacciones atómicas

---

### 📊 Flujo Crítico de Creación

```
START
  │
  ├─→ 1. Frontend Validations (Zod)
  │   ├─ Monto > 0
  │   ├─ SUM(allocations) === amount
  │   ├─ No duplicados
  │   └─ Cuotas en rango
  │
  ├─→ 2. POST /api/payments
  │   ├─ Validar customer.exists()
  │   ├─ Validar paymentMethod.exists() && active
  │   ├─ Validar projects.exist() && same customer
  │   ├─ Validar currency match
  │   ├─ Validar allocations sum
  │   └─ Check credit (si aplica)
  │
  ├─→ 3. Transacción Atómica
  │   ├─ CREATE Payment
  │   ├─ CREATE PaymentAllocations (N)
  │   ├─ CREATE Installments (si aplica)
  │   ├─ CREATE CreditTransaction (si sobrepago)
  │   ├─ UPDATE Customer.creditBalance
  │   └─ UPDATE Project.balance (indirecto)
  │
  └─→ 4. Frontend Update
      ├─ Invalidar caches
      ├─ Close dialog
      └─ Toast success
```

---

## Resumen Ejecutivo

**¿Qué es?** Sistema integral para registrar, rastrear y distribuir pagos entre proyectos.

**Característica clave:** 1 pago puede asignarse a 1 o N proyectos flexiblemente.

**Modelo:** PaymentAllocation (tabla intermedia N:M)

**Flujos:**

- PaymentToProject (90%): Formulario 1:1 simplificado
- PaymentToCustomer (10%): Formulario 1:N con FIFO automático

**Validaciones:** 16+ en backend + Zod en frontend

**Crédito:** Sobrepagos generan crédito automático reutilizable

**Auditoría:** CreditTransaction logging completo de cada transacción

---

**Última actualización:** 2025-11-27
