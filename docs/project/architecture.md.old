# Arquitectura del Proyecto Cobralon

Sistema completo de gestión de proyectos, clientes y pagos construido con Next.js 15, React 19 y PostgreSQL (Neon).

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Flujos de Negocio](#flujos-de-negocio)
4. [Arquitectura de Capas](#arquitectura-de-capas)
5. [Sistema de Logging Estructurado](#sistema-de-logging-estructurado)
6. [Decisiones Técnicas Clave](#decisiones-técnicas-clave)
7. [APIs Implementadas](#apis-implementadas)
8. [Configuración Regional](#configuración-regional)

---

## Visión General

### Propósito del Sistema

Sistema de gestión integral para empresas que manejan:

- **Clientes** con múltiples proyectos
- **Proyectos** con estados configurables y montos
- **Pagos** asignables a uno o múltiples proyectos
- **Cuotas** (installments) sin interés para pagos
- **Configuración regional** (país, región, comuna) para direcciones

### Stack Tecnológico Principal

| Capa           | Tecnología              | Propósito                     |
| -------------- | ----------------------- | ----------------------------- |
| **Frontend**   | Next.js 15 + React 19   | App Router, Server Components |
| **UI**         | shadcn/ui + Tailwind v4 | Sistema de componentes        |
| **Backend**    | Next.js API Routes      | RESTful APIs                  |
| **Database**   | PostgreSQL (Neon)       | Datos relacionales            |
| **ORM**        | Prisma 6.7              | Type-safe queries             |
| **Validation** | Zod + React Hook Form   | Validación frontend/backend   |
| **State**      | React Context API       | Configuración global          |

---

## Modelo de Datos

### Diagrama Entidad-Relación

```
┌─────────────┐
│   User      │ (Template base - no usado actualmente)
└─────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     SISTEMA DE CLIENTES                      │
├─────────────────────────────────────────────────────────────┤
│  Customer                                                   │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ name: String                                            │
│  ┣━ phone: String (obligatorio)                             │
│  ┣━ email: String? (opcional, unique)                       │
│  ┣━ createdAt / updatedAt                                   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Relationships:                                           ┃│
│  ├─→ projects: Project[] (1:N, onDelete: CASCADE)        ┃│
│  └─→ payments: Payment[] (1:N)                           ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SISTEMA DE PROYECTOS                        │
├─────────────────────────────────────────────────────────────┤
│  Project                                                    │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ projectNumber: String (formato: "P 0001-2025")          │
│  ┣━ projectName: String?                                    │
│  ┣━ customerId: UUID (FK → Customer)                        │
│  ┣━ phone: String                                           │
│  ┣━ street, apartment, comuna, region: String               │
│  ┣━ projectStatusId: UUID? (FK → ProjectStatus)             │
│  ┣━ projectStatusLegacy: String (migración legacy)          │
│  ┣━ date: DateTime                                          │
│  ┣━ subtotal: Decimal(12,2)                                 │
│  ┣━ taxRate: Decimal(5,2) [default: 19%]                    │
│  ┣━ total: Decimal(12,2)                                    │
│  ┣━ windowsCount: Int                                       │
│  ┣━ squareMeters: Decimal(10,2)                             │
│  ┣━ description: String?                                    │
│  ┣━ currency: String [default: "CLP"]                       │
│  ┣━ totalAmount: Decimal(12,2)? (mismo valor que total)     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Relationships:                                           ┃│
│  ├─→ customer: Customer (FK)                              ┃│
│  ├─→ projectStatus: ProjectStatus? (FK, onDelete: RESTRICT)┃│
│  └─→ paymentAllocations: PaymentAllocation[] (1:N)       ┃│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [customerId]                                          ┃│
│  ├─ [projectNumber]                                       ┃│
│  ├─ [projectStatusId]                                     ┃│
│  ├─ [date]                                                ┃│
│  ├─ [customerId, projectStatusId] (composite)             ┃│
│  └─ [projectStatusId, date DESC] (composite)              ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE ESTADOS DE PROYECTO                  │
├─────────────────────────────────────────────────────────────┤
│  ProjectStatus (Configurable desde UI)                     │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ name: String (unique, ej: "En Proceso")                 │
│  ┣━ order: Int (para drag & drop)                           │
│  ┣━ colorId: UUID (FK → BadgeColor)                         │
│  ┣━ isInitial: Boolean (estado inicial)                     │
│  ┣━ isFinal: Boolean (estado final)                         │
│  ┣━ isActive: Boolean                                       │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  BadgeColor (7 colores predefinidos)                     ┃│
│  ┣━ id: UUID (PK)                                         ┃│
│  ┣━ name: String (ej: "Azul", "Verde")                    ┃│
│  ┣━ key: String (unique, ej: "blue", "green")             ┃│
│  ┣━ bgClass: String (ej: "bg-blue-500")                   ┃│
│  ┣━ textClass: String (default: "text-white")             ┃│
│  ┗━ order: Int                                            ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SISTEMA DE PAGOS                           │
├─────────────────────────────────────────────────────────────┤
│  Payment                                                    │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ type: String ("Project" | "Customer")                   │
│  ┣━ amount: Decimal(12,2)                                   │
│  ┣━ currency: String                                        │
│  ┣━ date: DateTime                                          │
│  ┣━ reference: String?                                      │
│  ┣━ notes: String?                                          │
│  ┣━ customerId: UUID (FK → Customer)                        │
│  ┣━ paymentMethodId: UUID (FK → PaymentMethod)              │
│  ┣━ selectedInstallments: Int? (número de cuotas)           │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Relationships:                                           ┃│
│  ├─→ customer: Customer (FK)                              ┃│
│  ├─→ paymentMethod: PaymentMethod (FK)                    ┃│
│  ├─→ allocations: PaymentAllocation[] (1:N, CASCADE)      ┃│
│  └─→ installments: Installment[] (1:N, CASCADE)           ┃│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [customerId]                                          ┃│
│  ├─ [paymentMethodId]                                     ┃│
│  ├─ [date]                                                ┃│
│  ├─ [type]                                                ┃│
│  └─ [type, date DESC] (composite)                         ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE ASIGNACIÓN DE PAGOS                  │
├─────────────────────────────────────────────────────────────┤
│  PaymentAllocation (Tabla intermedia N:M)                  │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ paymentId: UUID (FK → Payment, CASCADE)                 │
│  ┣━ projectId: UUID (FK → Project)                          │
│  ┣━ allocatedAmount: Decimal(12,2)                          │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Constraints:                                             ┃│
│  └─ UNIQUE(paymentId, projectId)                          ┃│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [paymentId]                                           ┃│
│  └─ [projectId]                                           ┃│
│                                                           ┃│
│  ⚠️ IMPORTANTE:                                            ┃│
│  - Un Payment puede tener múltiples allocations          ┃│
│  - La suma de allocations DEBE ser igual a payment.amount ┃│
│  - Validación business logic en frontend Y backend        ┃│
└───────────────────────────────────────────────────────────┛│
                                                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SISTEMA DE CUOTAS (INSTALLMENTS)                │
├─────────────────────────────────────────────────────────────┤
│  Installment                                                │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ paymentId: UUID (FK → Payment, CASCADE)                 │
│  ┣━ installmentNumber: Int (1, 2, 3...)                     │
│  ┣━ amount: Decimal(12,2)                                   │
│  ┣━ dueDate: DateTime                                       │
│  ┣━ paidDate: DateTime? (null = pendiente)                  │
│  ┣━ status: String ("pending" | "paid")                     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Indexes:                                                 ┃│
│  ├─ [paymentId]                                           ┃│
│  └─ [status, dueDate] (composite)                         ┃│
│                                                           ┃│
│  Business Logic:                                          ┃│
│  - Se crean automáticamente al crear Payment con cuotas  ┃│
│  - Primera cuota: dueDate = payment.date                 ┃│
│  - Siguientes: cada 30 días                              ┃│
│  - Última cuota absorbe centavos residuales              ┃│
│  - Cron job marca como "paid" cuando dueDate <= hoy      ┃│
└───────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 SISTEMA DE MÉTODOS DE PAGO                   │
├─────────────────────────────────────────────────────────────┤
│  PaymentMethod (Configurable desde UI)                     │
│  ┣━ id: UUID (PK)                                           │
│  ┣━ name: String (unique, ej: "Efectivo", "Transferencia")  │
│  ┣━ active: Boolean                                         │
│  ┣━ order: Int                                              │
│  ┣━ icon: String? (Lucide icon name)                        │
│  ┣━ hasInstallments: Boolean                                │
│  ┣━ maxInstallments: Int?                                   │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓│
│                                                           ┃│
│  Index:                                                   ┃│
│  └─ [active, order] (composite)                           ┃│
└───────────────────────────────────────────────────────────┘
```

### Relaciones Clave

| Relación                        | Tipo | onDelete Policy     | Razón                                        |
| ------------------------------- | ---- | ------------------- | -------------------------------------------- |
| **Customer → Project**          | 1:N  | CASCADE             | Si se elimina cliente, eliminar proyectos    |
| **Customer → Payment**          | 1:N  | _(no especificado)_ | Preservar historial de pagos                 |
| **Project → ProjectStatus**     | N:1  | RESTRICT            | No eliminar estado si hay proyectos usándolo |
| **Project ← PaymentAllocation** | 1:N  | _(default)_         | Preservar asignaciones                       |
| **Payment → PaymentAllocation** | 1:N  | CASCADE             | Si se elimina pago, eliminar asignaciones    |
| **Payment → Installment**       | 1:N  | CASCADE             | Si se elimina pago, eliminar cuotas          |
| **Payment → PaymentMethod**     | N:1  | _(no especificado)_ | Preservar métodos históricos                 |

---

## Flujos de Negocio

### 1. Flujo: Crear Proyecto

```
1. Usuario → Selecciona/Crea Cliente
   ↓
2. Completa datos del proyecto:
   - Nombre proyecto
   - Dirección (región, comuna, calle)
   - Teléfono de contacto
   - Estado inicial (ProjectStatus)
   - Cantidades (ventanas, m²)
   - Montos (subtotal → calc tax → total)
   ↓
3. Sistema calcula:
   - projectNumber = "P {seq}-{year}"
   - total = subtotal + (subtotal * taxRate%)
   - totalAmount = total (redundante por razones legacy)
   ↓
4. Prisma.create(Project) con FK a Customer y ProjectStatus
   ↓
5. Resultado: Proyecto creado con balance = total (sin pagos)
```

**Componentes:**

- Form: `components/forms/projects/project-form.tsx`
- Dialog: `components/dialogs/projects/new-project-dialog.tsx`
- API: `POST /api/projects`

---

### 2. Flujo: Registrar Pago a Proyecto (1:1)

```
Usuario busca un proyecto específico
   ↓
Selecciona proyecto → Sistema muestra:
   - Cliente (derivado)
   - Currency (derivada)
   - Balance pendiente
   ↓
Usuario ingresa:
   - Monto
   - Fecha
   - Método de pago
   - [Opcional] Cuotas sin interés
   ↓
Sistema crea en transacción:
   ├─ Payment (type: "Project")
   ├─ PaymentAllocation (100% del monto al proyecto)
   └─ [Si cuotas > 1] Installments (N registros)
   ↓
Balance del proyecto = total - SUM(allocations)
```

**Componentes:**

- Form: `components/forms/payments/payment-to-project-form.tsx`
- Dialog: `components/dialogs/payments/payment-to-project-dialog.tsx`
- API: `POST /api/payments` (validación: allocations.length === 1)

---

### 3. Flujo: Registrar Pago a Cliente (1:N)

```
Usuario selecciona un cliente
   ↓
Sistema carga proyectos del cliente con balance > 0
   ↓
Usuario ingresa:
   - Monto total del pago
   - Fecha
   - Método de pago
   ↓
Usuario distribuye el monto:
   Opción A: Botón "FIFO" → Asignación automática
   Opción B: Manual → Asigna monto por proyecto
   ↓
Validación: SUM(allocations) === payment.amount
   ↓
Sistema crea en transacción:
   ├─ Payment (type: "Customer")
   ├─ PaymentAllocations (N registros)
   └─ [Si cuotas > 1] Installments
```

**Componentes:**

- Form: `components/forms/payments/payment-to-customer-form.tsx`
- Dialog: `components/dialogs/payments/payment-to-customer-dialog.tsx`
- Business Logic: `lib/business-logic/payment-fifo.ts`
- API: `POST /api/payments` (validación: allocations.length >= 1)

---

### 4. Flujo: Gestión de Cuotas (Installments)

#### Creación Automática

```
Al crear Payment con selectedInstallments > 1:
   ↓
Sistema genera N cuotas:
   - Cuota 1: amount = floor(total/N), dueDate = payment.date
   - Cuota 2-N-1: amount = floor(total/N), dueDate += 30 días
   - Cuota N: amount = total - SUM(cuotas anteriores), dueDate += 30 días
   ↓
Todas inician con status = "pending"
```

#### Marcado Automático (Cron Job)

```
Vercel Cron Job ejecuta diariamente:
   POST /api/cron/mark-installments-paid
   ↓
Sistema busca:
   WHERE status = 'pending' AND dueDate <= today
   ↓
Batch update:
   SET status = 'paid', paidDate = NOW()
   ↓
Log detallado en consola
```

**Componentes:**

- Cron: `app/api/cron/mark-installments-paid/route.ts`
- Config: `vercel.json` (schedule: "0 0 \* \* \*" = diario a medianoche)
- Página: `app/payments/installments/page.tsx`

---

### 5. Flujo: Configuración de Estados de Proyecto

```
Admin → Settings → Estados de Proyecto
   ↓
CRUD completo:
   - CREATE: Nuevo estado con color y flags
   - READ: Lista con drag & drop
   - UPDATE: Editar nombre/color/flags
   - DELETE: Solo si no hay proyectos usándolo (RESTRICT)
   - REORDER: Drag & drop actualiza campo "order"
   ↓
Sistema actualiza en tiempo real el Combobox de ProjectForm
```

**Componentes:**

- Page: `app/settings/project-status/page.tsx`
- Form: `components/forms/settings/project-status-form.tsx`
- Dialog: `components/dialogs/settings/project-status-dialog.tsx`
- Sortable: `components/settings/sortable-status-item.tsx` (@dnd-kit)
- API: `POST/PUT/DELETE /api/project-status`, `POST /api/project-status/reorder`

---

## Arquitectura de Capas

### Vista General

```
┌───────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                      │
│  (Next.js Pages + React Components)                       │
├───────────────────────────────────────────────────────────┤
│  app/                                                     │
│  ├── customer/page.tsx         → DataTable Customers      │
│  ├── projects/page.tsx         → DataTable Projects       │
│  ├── payments/page.tsx         → DataTable Payments       │
│  ├── payments/installments/    → DataTable Installments   │
│  ├── settings/                 → 3 páginas config         │
│  └── examples/                 → Demos de componentes     │
└───────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────┐
│                   UI COMPONENTS LAYER                      │
│  (shadcn/ui + Custom Components)                          │
├───────────────────────────────────────────────────────────┤
│  components/                                              │
│  ├── forms/              → React Hook Form + Zod          │
│  │   ├── customer/                                        │
│  │   ├── projects/                                        │
│  │   ├── payments/                                        │
│  │   └── settings/                                        │
│  ├── dialogs/            → Modal forms                    │
│  ├── data-table/         → TanStack Table wrapper         │
│  ├── ui/                 → shadcn/ui base (50+ components)│
│  │   ├── combobox.tsx        (wrapper)                    │
│  │   ├── currency-input.tsx   (regional)                  │
│  │   ├── phone-input.tsx      (E.164)                     │
│  │   └── rut-input.tsx        (Chilean RUT)               │
│  └── layout/            → AppLayout, AppSidebar           │
└───────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────┐
│                     API LAYER (REST)                       │
│  (Next.js Route Handlers)                                 │
├───────────────────────────────────────────────────────────┤
│  app/api/                                                 │
│  ├── customers/          → CRUD + search                  │
│  │   ├── route.ts           (GET, POST)                   │
│  │   ├── [id]/route.ts      (GET, PUT, DELETE)            │
│  │   └── list/route.ts      (GET simple list)             │
│  ├── projects/           → CRUD + search                  │
│  │   ├── route.ts           (GET, POST)                   │
│  │   └── [id]/route.ts      (GET, PUT, DELETE)            │
│  ├── payments/           → CRUD + allocation logic        │
│  │   ├── route.ts           (GET, POST)                   │
│  │   ├── [id]/route.ts      (GET, PUT, DELETE, CANCEL)    │
│  │   ├── search-projects/   (GET projects con balance)    │
│  │   └── customer-projects/ (GET projects by customer)    │
│  ├── installments/       → Vista global de cuotas         │
│  │   └── route.ts           (GET con filtros)             │
│  ├── project-status/     → CRUD + reorder                 │
│  │   ├── route.ts           (GET, POST)                   │
│  │   ├── [id]/route.ts      (PUT, DELETE)                 │
│  │   └── reorder/route.ts   (POST bulk update)            │
│  ├── payment-methods/    → GET + toggle                   │
│  │   └── [id]/toggle/       (POST activo/inactivo)        │
│  └── cron/                                                │
│      └── mark-installments-paid/ (POST - Vercel Cron)     │
└───────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                     │
│  (Validations + Calculations)                             │
├───────────────────────────────────────────────────────────┤
│  lib/                                                     │
│  ├── validations/         → Zod schemas                   │
│  │   ├── customer-validations.ts                          │
│  │   ├── project-validations.ts                           │
│  │   ├── payment-validations.ts  (2 schemas: 1:1 y 1:N)  │
│  │   ├── rut-validations.ts      (Chilean RUT)           │
│  │   └── project-status-validations.ts                    │
│  ├── business-logic/     → Pure functions                 │
│  │   ├── project-balance.ts     (calc balance)            │
│  │   └── payment-fifo.ts        (FIFO allocation)         │
│  ├── contexts/           → React Context                  │
│  │   └── configuration-context.tsx (país, región, locale) │
│  └── constants/          → Business constants             │
│      ├── financial-constants.ts (DECIMAL_PRECISION, etc.) │
│      └── paises-config.ts       (países + regiones)       │
└───────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                     │
│  (Prisma ORM)                                             │
├───────────────────────────────────────────────────────────┤
│  lib/db.ts               → Prisma Client singleton        │
│  prisma/schema.prisma    → 10 modelos                     │
│  prisma/seed.ts          → Data inicial                   │
└───────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                       │
│  (PostgreSQL @ Neon)                                      │
├───────────────────────────────────────────────────────────┤
│  10 tablas relacionales                                   │
│  16 índices (8 simples + 8 compuestos)                    │
│  relationLoadStrategy: 'join' (N+1 fix)                   │
└───────────────────────────────────────────────────────────┘
```

---

## Sistema de Logging Estructurado

### Arquitectura de Logging

El proyecto implementa un sistema de logging estructurado basado en **Pino 9.7.0** para debugging eficiente, auditoría y monitoring en producción.

```
┌───────────────────────────────────────────────────────────┐
│                      LOGGING LAYER                         │
│  (Pino Structured Logger)                                 │
├───────────────────────────────────────────────────────────┤
│  lib/logger.ts               → Singleton Pino instance    │
│  lib/logger-middleware.ts    → withLogging() wrapper      │
│                                                           │
│  Features:                                                │
│  ├── Environment-aware config (debug dev, info prod)      │
│  ├── Pretty-print en desarrollo                           │
│  ├── JSON estructurado en producción                      │
│  ├── Request correlation (requestId UUID v4)              │
│  ├── Child loggers con contexto de negocio                │
│  ├── Automatic sensitive data redaction                   │
│  ├── Error serialization con stack traces                 │
│  ├── Performance tracking (duration en ms)                │
│  └── Cron job tracking (runId con timestamp)              │
└───────────────────────────────────────────────────────────┘
                          ↓
┌───────────────────────────────────────────────────────────┐
│                   LOGGING INTEGRATION                      │
├───────────────────────────────────────────────────────────┤
│  API Routes (Next.js):                                    │
│  ├── app/api/payments/route.ts      ✅ Migrated          │
│  ├── app/api/projects/route.ts      ✅ Migrated          │
│  ├── app/api/customers/route.ts     ✅ Migrated          │
│  └── app/api/cron/mark-installments-paid/ ✅ Migrated    │
│                                                           │
│  Pattern usado:                                           │
│  export const POST = withLogging(async (request, logger) => {
│    const childLogger = logger.child({ customerId, amount })
│    childLogger.info('Operation started')                  │
│    // ... business logic ...                              │
│    childLogger.info({ result }, 'Operation completed')    │
│  })                                                       │
└───────────────────────────────────────────────────────────┘
```

### Componentes Principales

#### 1. Logger Singleton (`lib/logger.ts`)

```typescript
export const logger = pino({
  level: getLogLevel(), // info (prod) / debug (dev)
  formatters: { level, bindings },
  serializers: { err, req, res }, // Pino built-in
  redact: {
    paths: ['password', 'token', 'apiKey', 'creditCard', ...],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev ? { transport: 'pino-pretty' } : {}),
})
```

**Features:**
- ✅ Performance óptima (~30ns per log, 10x más rápido que Winston)
- ✅ Bundle size mínimo (~10KB)
- ✅ Zero blocking I/O (ideal para serverless)
- ✅ Automatic redaction de campos sensibles

#### 2. Middleware Pattern (`lib/logger-middleware.ts`)

```typescript
export function withLogging(handler: APIHandler) {
  return async (request: NextRequest, context?) => {
    const requestId = generateRequestId() // UUID v4
    const requestLogger = logger.child({ requestId, method, path })

    requestLogger.info('Request received')

    const startTime = performance.now()
    const response = await handler(request, requestLogger, context)
    const duration = Math.round(performance.now() - startTime)

    requestLogger.info({ status, duration }, 'Request completed')
    return response
  }
}
```

**Features:**
- ✅ Request correlation automática (requestId en todos los logs)
- ✅ Duration tracking (performance.now())
- ✅ Child logger con contexto HTTP (method, path)
- ✅ Error handling con logging estructurado

### Niveles de Log

| Nivel   | Uso                                    | Ambiente      |
| ------- | -------------------------------------- | ------------- |
| `debug` | Flow tracking, validaciones detalladas | Development   |
| `info`  | Operaciones exitosas, milestones       | Production    |
| `warn`  | Validaciones fallidas, estados inválidos | Todos       |
| `error` | Errores capturados, excepciones        | Todos         |

**Configuración por ambiente:**
- **Development**: `debug` level (todo visible) + pino-pretty (colored output)
- **Production**: `info` level (solo importante) + JSON (Vercel logs)
- **Override**: Variable de entorno `LOG_LEVEL`

### Patrones de Uso

#### API Route con Child Logger

```typescript
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // Child logger con contexto de negocio
  const paymentLogger = logger.child({
    customerId: body.customerId,
    amount: body.amount,
  })

  paymentLogger.info('Payment creation requested')
  paymentLogger.debug('Starting validations')

  if (!customerId) {
    paymentLogger.warn('Missing customerId')
    return NextResponse.json({ error: '...' }, { status: 400 })
  }

  paymentLogger.info({ paymentId }, 'Payment created successfully')
  return NextResponse.json(payment, { status: 201 })
})
```

**Beneficios:**
- ✅ Context inheritance (requestId + customerId + amount)
- ✅ Búsqueda fácil en logs: `grep customerId=abc-123`
- ✅ No manual context passing

#### Cron Job Tracking

```typescript
export async function POST(request: Request) {
  const runId = generateRunId() // run-2025-10-30T14-32-15-uuid
  const cronLogger = logger.child({
    job: 'mark-installments-paid',
    runId,
  })

  cronLogger.info('Cron job started')
  // ... business logic ...
  cronLogger.info({ updated: result.count }, 'Cron job completed')
}
```

### Output Examples

**Development (pino-pretty):**
```
[14:32:15] INFO: Request received
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    method: "POST"
    path: "/api/payments"

[14:32:15] INFO: Payment creation requested
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    customerId: "customer-123"
    amount: 1500000

[14:32:15] INFO: Request completed
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    status: 201
    duration: 342
```

**Production (JSON):**
```json
{"level":"info","time":1698765135000,"requestId":"550e8400-e29b-41d4-a716-446655440000","method":"POST","path":"/api/payments","msg":"Request received"}
{"level":"info","time":1698765135050,"requestId":"550e8400-e29b-41d4-a716-446655440000","customerId":"customer-123","amount":1500000,"msg":"Payment creation requested"}
{"level":"info","time":1698765135342,"requestId":"550e8400-e29b-41d4-a716-446655440000","status":201,"duration":342,"msg":"Request completed"}
```

### Sensitive Data Redaction

Campos redactados automáticamente:
```typescript
redact: {
  paths: [
    'password', 'token', 'apiKey', 'api_key',
    'accessToken', 'access_token',
    'refreshToken', 'refresh_token',
    'secret', 'creditCard', 'credit_card',
    'cardNumber', 'card_number', 'cvv', 'ssn',
  ],
  censor: '[REDACTED]',
}
```

**Ejemplo:**
```typescript
logger.info({
  userId: '123',
  password: 'secret123' // ❌ Sensible
})

// Output: { userId: '123', password: '[REDACTED]' } ✅
```

### Performance Benchmark

Comparativa con alternativas (fuente: Pino GitHub):

```
benchBunyan*10000:  2496.613ms
benchWinston*10000: 2994.308ms
benchPino*10000:    303.419ms  ← 10x más rápido
```

**Por qué Pino:**
- ✅ 8-10x más rápido que Winston/Bunyan
- ✅ Crítico para ambientes serverless (Vercel)
- ✅ Bundle size mínimo
- ✅ Zero blocking I/O

### Integración con Vercel

- ✅ Logs automáticamente capturados por Vercel
- ✅ JSON parseable para log aggregators
- ✅ Queryable en Vercel Logs UI
- ✅ Compatible con Datadog, LogRocket, etc.

### Referencias

- **Decisión completa:** [ADR-012: Pino Structured Logging](decisions/012-pino-structured-logging.md)
- **Pino Documentation:** https://getpino.io
- **Vercel Logging:** https://vercel.com/docs/observability/runtime-logs

---

## Decisiones Técnicas Clave

### 1. ¿Por qué PaymentAllocation en lugar de FK directo?

**Decisión:** Tabla intermedia N:M entre Payment y Project

**Alternativas consideradas:**

- ❌ **FK directo** (`payment.projectId`): No soporta pago a múltiples proyectos
- ❌ **Embedded JSON**: Pierde normalización y consultas complejas

**Razones:**

1. ✅ **Flexibilidad:** Un pago puede asignarse a 1 o N proyectos
2. ✅ **Auditoría:** Historial completo de asignaciones
3. ✅ **Balance calculado:** `SUM(allocations.allocatedAmount) GROUP BY project`
4. ✅ **Tipos de pago:** Soporta tanto "Project" (1:1) como "Customer" (1:N)

**Trade-offs:**

- ⚠️ **Complejidad:** Requiere validación `SUM(allocations) === payment.amount`
- ⚠️ **Queries:** JOIN adicional para obtener balance
- ✅ **Mitigación:** Business logic centralizada en `lib/business-logic/`

---

### 2. ¿Por qué Decimal(12,2) para montos?

**Decisión:** Tipo `Decimal` de Prisma con precisión 12,2

**Alternativas consideradas:**

- ❌ **Float/Double**: Errores de redondeo en operaciones financieras
- ❌ **Int (centavos)**: Complica formateo y validaciones

**Razones:**

1. ✅ **Exactitud:** Sin errores de punto flotante
2. ✅ **Standard financiero:** 2 decimales suficiente para CLP, USD, EUR
3. ✅ **Rango:** 12 dígitos = hasta $999,999,999,999.99 (suficiente)
4. ✅ **Prisma support:** Mapea a `DECIMAL` PostgreSQL nativamente

**Constantes:**

```typescript
// lib/constants/financial-constants.ts
export const FINANCIAL = {
  DECIMAL_PRECISION: 0.01, // 2 decimales
  TOLERANCE: 0.01, // Para comparaciones float
}
```

---

### 3. ¿Por qué onDelete: CASCADE vs RESTRICT?

| Relación                    | Policy   | Razón                                                             |
| --------------------------- | -------- | ----------------------------------------------------------------- |
| **Customer → Project**      | CASCADE  | Eliminar cliente implica eliminar sus proyectos (dato de negocio) |
| **Payment → Allocation**    | CASCADE  | Eliminar pago debe eliminar asignaciones (coherencia)             |
| **Payment → Installment**   | CASCADE  | Eliminar pago debe eliminar cuotas (coherencia)                   |
| **Project → ProjectStatus** | RESTRICT | Proteger: no eliminar estado si hay proyectos activos             |

**Filosofía:**

- CASCADE para relaciones de "ownership" (parent owns child)
- RESTRICT para relaciones de "reference" (child references config)

---

### 4. ¿Por qué separar Installment de Payment?

**Decisión:** Tabla `Installment` separada (1:N con Payment)

**Alternativas consideradas:**

- ❌ **JSON field**: Pierdes queries por cuota individual
- ❌ **N Payments**: Confunde historial (1 pago ≠ N pagos)

**Razones:**

1. ✅ **Queries individuales:** `SELECT * FROM installments WHERE status='pending'`
2. ✅ **Cron job:** Fácil marcar cuotas vencidas como "paid"
3. ✅ **Auditoría:** Historial completo por cuota (paidDate, status)
4. ✅ **Reportes:** "Cuotas por vencer", "Cuotas pendientes del cliente X"

**Ejemplo cron:**

```sql
UPDATE installments
SET status = 'paid', paidDate = NOW()
WHERE status = 'pending' AND dueDate <= CURRENT_DATE
```

---

### 5. ¿Por qué projectStatusLegacy además de FK?

**Contexto:** Migración desde sistema legacy con campo String

**Solución:**

- `projectStatusLegacy: String` (campo viejo, default "")
- `projectStatusId: UUID?` (relación nueva, opcional)

**Razones:**

1. ✅ **Migración progresiva:** Proyectos viejos mantienen string legacy
2. ✅ **Sin breaking changes:** Código viejo sigue funcionando
3. ✅ **Nuevos proyectos:** Usan `projectStatusId` con colores/flags
4. ⚠️ **Deuda técnica:** En futuro, migrar todos y eliminar legacy field

**Estado actual:**

- Nuevos proyectos: `projectStatusId` (FK)
- Proyectos legacy: `projectStatusLegacy` (String) + `projectStatusId = null`

---

### 6. ¿Por qué sistema de configuración regional (no i18n completo)?

**Decisión:** Context API con país/región/comuna/locale/currency

**Alternativas consideradas:**

- ❌ **next-intl**: Overkill para solo Chile actualmente
- ❌ **Hardcoded CLP**: No extensible a otros países

**Razones:**

1. ✅ **Preparación:** Base para futuro multi-país
2. ✅ **Simplicidad:** Context API sin librerías externas
3. ✅ **Persistencia:** localStorage + hydration automática
4. ✅ **Derivación:** Currency/locale se derivan automáticamente del país
5. ✅ **Componentes regionales:** PhoneInput, CurrencyInput, RutInput

**Implementación:**

```typescript
// lib/contexts/configuration-context.tsx
const ConfigurationContext = createContext({
  pais, region, ciudad, comuna,    // Ubicación
  currency, locale,                 // Derivados del país
  setPais, setRegion, ...           // Setters
})
```

---

## APIs Implementadas

### Resumen

| Entidad            | Endpoints | Paginación | Filtros                                  | Includes                                     |
| ------------------ | --------- | ---------- | ---------------------------------------- | -------------------------------------------- |
| **Customers**      | 4         | ✅         | search (name, email, phone)              | -                                            |
| **Projects**       | 4         | ✅         | customerId, statusId, dateRange          | customer, projectStatus, allocations         |
| **Payments**       | 6         | ✅         | customerId, projectId, dateRange         | customer, paymentMethod, allocations.project |
| **Installments**   | 1         | ✅         | status, paymentId, customerId, dateRange | payment.customer, payment.allocations        |
| **ProjectStatus**  | 4         | ❌         | -                                        | color                                        |
| **PaymentMethods** | 2         | ❌         | active                                   | -                                            |
| **BadgeColors**    | 1         | ❌         | -                                        | -                                            |
| **Cron**           | 1         | ❌         | -                                        | -                                            |

### Detalle de Endpoints Principales

#### 1. Customers API

```
GET    /api/customers           → Listar con paginación + search
POST   /api/customers           → Crear (name, phone, email?)
GET    /api/customers/[id]      → Detalle de cliente
PUT    /api/customers/[id]      → Actualizar
DELETE /api/customers/[id]      → Eliminar (CASCADE a projects)
GET    /api/customers/list      → Lista simple (para dropdowns)
```

**Query params (GET /api/customers):**

- `page`, `limit`: Paginación (default: page=1, limit=10, max=100)
- `search`: Busca en name, email, phone (case-insensitive)

**Validaciones:**

- `name`: Required, String, min 1 char
- `phone`: Required, String, min 1 char (validado con PhoneInput E.164)
- `email`: Optional, String, format email, unique

---

#### 2. Projects API

```
GET    /api/projects            → Listar con paginación + filtros + includes
POST   /api/projects            → Crear proyecto
GET    /api/projects/[id]       → Detalle con allocations
PUT    /api/projects/[id]       → Actualizar
DELETE /api/projects/[id]       → Eliminar
```

**Query params (GET /api/projects):**

- `page`, `limit`: Paginación
- `customerId`: Filtrar por cliente
- `projectStatusId`: Filtrar por estado
- `startDate`, `endDate`: Rango de fechas

**Includes (GET):**

```typescript
include: {
  customer: { select: { id, name, phone } },
  projectStatus: {
    select: {
      id, name, order,
      color: { select: { bgClass, textClass } }
    }
  },
  paymentAllocations: {
    select: { allocatedAmount },
  },
}
```

**Performance:**

- ✅ `relationLoadStrategy: 'join'` (fix N+1)
- ✅ Índices compuestos: `[customerId, projectStatusId]`, `[projectStatusId, date DESC]`

---

#### 3. Payments API

```
GET    /api/payments            → Listar con paginación + filtros + includes
POST   /api/payments            → Crear con allocations + installments
GET    /api/payments/[id]       → Detalle completo
PUT    /api/payments/[id]       → Actualizar (limitado)
DELETE /api/payments/[id]       → Eliminar (CASCADE a allocations + installments)

GET    /api/payments/search-projects  → Buscar proyectos con balance > 0
GET    /api/payments/customer-projects → Proyectos de cliente específico
```

**POST Body:**

```typescript
{
  type: "Project" | "Customer",
  customerId: string,
  amount: number,
  currency: string,
  date: Date,
  paymentMethodId: string,
  reference?: string,
  notes?: string,
  selectedInstallments?: number,
  allocations: [
    { projectId: string, allocatedAmount: number }
  ]
}
```

**Validaciones backend:**

1. ✅ `type === "Project"` → `allocations.length === 1`
2. ✅ `type === "Customer"` → `allocations.length >= 1`
3. ✅ `SUM(allocations.allocatedAmount) === amount` (tolerancia 0.01)
4. ✅ Todos los projects pertenecen al mismo customer
5. ✅ Todos los projects tienen misma currency
6. ✅ No projectIds duplicados

**Creación de Installments (automática):**

```typescript
if (selectedInstallments > 1) {
  // Crear N cuotas:
  // - Cuota 1-N-1: floor(amount / N)
  // - Cuota N: amount - SUM(anteriores) (absorbe centavos)
  // - dueDates: cada 30 días desde payment.date
  installments: {
    create: [...generatedInstallments]
  }
}
```

---

#### 4. Installments API

```
GET    /api/installments        → Vista global con filtros
```

**Query params:**

- `page`, `limit`: Paginación
- `status`: "pending" | "paid"
- `paymentId`: Filtrar por pago
- `customerId`: Filtrar por cliente (via payment)
- `startDate`, `endDate`: Rango de vencimiento (dueDate)

**Includes:**

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
          project: { select: { id, projectNumber, projectName, currency } }
        }
      }
    }
  }
}
```

**Order:**

```typescript
orderBy: [
  { dueDate: 'asc' }, // Vencimientos próximos primero
  { installmentNumber: 'asc' }, // Número de cuota
]
```

---

#### 5. Cron Job API

```
POST   /api/cron/mark-installments-paid
```

**Autenticación:**

```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (authHeader !== `Bearer ${cronSecret}`) {
  return 401 Unauthorized
}
```

**Lógica:**

1. Buscar: `WHERE status='pending' AND dueDate <= NOW()`
2. Batch update: `SET status='paid', paidDate=NOW()`
3. Log detallado de cuotas marcadas

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

## Configuración Regional

### Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│         ConfigurationContext (React Context)            │
├─────────────────────────────────────────────────────────┤
│  Estado:                                                │
│  ├─ pais: string (ej: "CL")                             │
│  ├─ region: string (ej: "Metropolitana (RM)")           │
│  ├─ ciudad: string (ej: "Santiago")                     │
│  ├─ comuna: string (ej: "Providencia")                  │
│  ├─ currency: string (derivado, ej: "CLP")              │
│  └─ locale: string (derivado, ej: "es-CL")              │
│                                                         │
│  Persistencia:                                          │
│  └─ localStorage ("configuration") + hydration          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│               PAISES_CONFIG (Master Data)               │
├─────────────────────────────────────────────────────────┤
│  Chile (CL):                                            │
│  ├─ currency: "CLP"                                     │
│  ├─ locale: "es-CL"                                     │
│  └─ regiones: [                                         │
│      { name: "Metropolitana (RM)", code: "RM",          │
│        ciudades: ["Santiago", ...],                     │
│        comunas: ["Providencia", "Las Condes", ...] }    │
│    ]                                                    │
│                                                         │
│  Argentina (AR): { currency: "ARS", locale: "es-AR" }   │
│  México (MX): { currency: "MXN", locale: "es-MX" }      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            Componentes que consumen config              │
├─────────────────────────────────────────────────────────┤
│  ├─ CurrencyInput → useConfiguration() → currency       │
│  ├─ PhoneInput    → useConfiguration() → país           │
│  ├─ RutInput      → Solo para Chile                     │
│  ├─ AddressFields → useConfiguration() → región/comuna  │
│  └─ Settings      → useConfiguration() → todo           │
└─────────────────────────────────────────────────────────┘
```

### Hooks

```typescript
// hooks/use-configuration.ts
export function useConfiguration() {
  const context = useContext(ConfigurationContext)

  return {
    // Estado
    pais,
    region,
    ciudad,
    comuna,
    currency,
    locale,

    // Setters
    setPais,
    setRegion,
    setCiudad,
    setComuna,

    // Helpers
    resetConfiguration,
  }
}
```

### Ejemplo de uso

```typescript
// components/ui/currency-input.tsx
function CurrencyInput({ currency: propCurrency, ...props }) {
  const { currency: contextCurrency } = useConfiguration()

  // Prioridad: props > context > default
  const effectiveCurrency = propCurrency || contextCurrency || 'CLP'

  return (
    <NumericFormat
      thousandSeparator="."
      decimalSeparator=","
      prefix={getCurrencySymbol(effectiveCurrency)}
      {...props}
    />
  )
}
```

---

## Próximos Pasos Recomendados

### Performance (cuando escale)

1. **Phase 2** (a 500+ proyectos):
   - Implementar campo `balance` en Project (denormalizado)
   - Actualizar balance vía triggers o application logic
   - Agregar índice: `[balance, customerId]`

2. **Phase 3** (a 5000+ proyectos):
   - Cursor pagination (en lugar de offset/limit)
   - Materialized views para reportes
   - Redis cache para queries frecuentes

Ver: `docs/project/database-optimization-guide.md`

### Features de Negocio

1. **Reportes:**
   - Balance total por cliente
   - Cuotas por vencer (próximos 30 días)
   - Histórico de pagos (gráficas)

2. **Workflow:**
   - Transiciones de estados validadas (ej: "Presupuesto" → "En Proceso" → "Finalizado")
   - Notificaciones automáticas (email/WhatsApp)

3. **Multi-tenancy:**
   - Agregar modelo `Organization`
   - RLS (Row-Level Security) en Neon

---

**Última actualización:** 2025-10-25
**Versión del proyecto:** 0.1.0
**Base:** Template SaaS v1.0
