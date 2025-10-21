# Sistema de Gestión de Pagos

Documentación completa del sistema de pagos del proyecto.

---

## 📑 Tabla de Contenidos

1. [Visión General](#-visión-general)
2. [Arquitectura de Base de Datos](#-arquitectura-de-base-de-datos)
3. [Lógica de Negocio](#-lógica-de-negocio)
4. [API Routes](#-api-routes)
5. [Componentes UI](#-componentes-ui)
6. [Flujos de Uso](#-flujos-de-uso)
7. [Ejemplos Prácticos](#-ejemplos-prácticos)
8. [Referencia de Archivos](#-referencia-de-archivos)

---

## 🎯 Visión General

El sistema de pagos permite:

- ✅ Registrar pagos de clientes
- ✅ Asignar un pago a **uno o múltiples proyectos**
- ✅ Distribución automática **FIFO** (First In First Out)
- ✅ Distribución manual personalizada
- ✅ Anulación de pagos (soft delete con auditoría)
- ✅ Cálculo automático de balances por proyecto
- ✅ Historial completo de pagos

### Característica Principal: 1 Pago → N Proyectos

Un pago de $500,000 puede distribuirse así:

```
Payment #123 ($500,000)
├── $300,000 → Proyecto A (cierra balance pendiente)
├── $150,000 → Proyecto B (abono parcial)
└── $50,000  → Proyecto C (abono parcial)
```

---

## 🏗️ Arquitectura de Base de Datos

### Modelo de Datos

```prisma
// prisma/schema.prisma

model Payment {
  id              String   @id @default(uuid())
  amount          Decimal  @db.Decimal(12, 2)  // Monto total del pago
  currency        String                        // "CLP", "USD", etc.
  date            DateTime                      // Fecha del pago
  reference       String?                       // N° transacción, comprobante
  notes           String?  @db.Text

  // Soft Delete para auditoría
  status          String   @default("ACTIVE")   // "ACTIVE" | "CANCELLED"
  cancelledAt     DateTime?
  cancelledReason String?  @db.Text

  // Relations
  customerId      String
  customer        Customer @relation(...)

  paymentMethodId String
  paymentMethod   PaymentMethod @relation(...)

  allocations     PaymentAllocation[]           // ← Asignaciones a proyectos

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model PaymentAllocation {
  id              String   @id @default(uuid())

  paymentId       String
  payment         Payment  @relation(...)

  projectId       String
  project         Project  @relation(...)

  allocatedAmount Decimal  @db.Decimal(12, 2)  // Cuánto va a este proyecto

  createdAt       DateTime @default(now())

  @@unique([paymentId, projectId])  // ← Previene duplicados
}

model PaymentMethod {
  id                String   @id @default(uuid())
  name              String   @unique            // "Efectivo", "Transferencia"
  active            Boolean  @default(true)
  requiresReference Boolean  @default(false)    // ← Si necesita N° referencia
  icon              String?                     // Nombre de icono Lucide
  order             Int      @default(0)

  payments          Payment[]
}

model Project {
  // ... otros campos

  totalAmount       Decimal? @db.Decimal(12, 2) // Monto total acordado
  currency          String   @default("CLP")

  paymentAllocations PaymentAllocation[]        // ← Pagos recibidos
}
```

### Relaciones Clave

```
Customer (1) ──→ (N) Payment
Payment  (1) ──→ (N) PaymentAllocation
Project  (1) ──→ (N) PaymentAllocation
PaymentMethod (1) ──→ (N) Payment
```

### Constraint Importante

```sql
@@unique([paymentId, projectId])
```

**Previene:** Asignar el mismo pago dos veces al mismo proyecto.

---

## 💡 Lógica de Negocio

### 1. Cálculo de Balance de Proyecto

**Función:** `calculateProjectBalance()`
**Archivo:** `lib/validations/payment-validations.ts:174-202`

```typescript
function calculateProjectBalance(project: {
  totalAmount: number | null
  allocations?: Array<{
    allocatedAmount: number
    payment?: { status: string }
  }>
}): {
  totalPaid: number
  balance: number
  percentPaid: number
  isFullyPaid: boolean
}
```

#### Algoritmo:

```
1. totalAmount = monto acordado del proyecto
2. totalPaid = suma de allocations donde payment.status === 'ACTIVE'
   ❗ Ignora automáticamente pagos CANCELLED
3. balance = totalAmount - totalPaid
4. percentPaid = (totalPaid / totalAmount) * 100
5. isFullyPaid = balance <= 0
```

#### Ejemplo:

```javascript
Project: {
  totalAmount: 500000,
  allocations: [
    { allocatedAmount: 200000, payment: { status: 'ACTIVE' } },    // ✅ Cuenta
    { allocatedAmount: 100000, payment: { status: 'ACTIVE' } },    // ✅ Cuenta
    { allocatedAmount: 50000,  payment: { status: 'CANCELLED' } }, // ❌ No cuenta
  ]
}

Resultado:
  totalPaid: 300000      (200k + 100k)
  balance: 200000        (500k - 300k)
  percentPaid: 60%
  isFullyPaid: false
```

---

### 2. Distribución FIFO (First In First Out)

**Función:** `calculateFIFO()`
**Archivo:** `lib/payment-fifo.ts:52-90`

```typescript
function calculateFIFO(totalAmount: number, projects: ProjectWithBalance[]): FIFOAllocation[]
```

#### Algoritmo:

```
1. Ordenar proyectos por createdAt (más antiguo primero)
2. remaining = totalAmount
3. Para cada proyecto en orden:
   a. Si remaining <= 0 → break
   b. balance = calculateProjectBalance(proyecto)
   c. Si balance <= 0 → skip (ya está pagado)
   d. allocated = min(balance, remaining)
   e. Agregar allocation
   f. remaining -= allocated
4. Retornar array de allocations
```

#### Ejemplo Visual:

```
Proyectos del cliente:
  2024-001 (Jun): balance $300,000  ← Más antiguo
  2024-002 (Ago): balance $400,000
  2024-003 (Oct): balance $300,000  ← Más nuevo

Pago recibido: $500,000

FIFO distribuye:
  Step 1: $300k → 2024-001 (cierra completo) → remaining = $200k
  Step 2: $200k → 2024-002 (abono parcial)  → remaining = $0
  Step 3: Skip 2024-003 (remaining = 0)

Resultado:
  [
    { projectId: '2024-001', allocatedAmount: 300000, isFullyPaid: true },
    { projectId: '2024-002', allocatedAmount: 200000, isFullyPaid: false }
  ]
```

---

### 3. Validación de Suma de Allocations

**Función:** `validateAllocationsSum()`
**Archivo:** `lib/payment-fifo.ts:99-105`

```typescript
function validateAllocationsSum(
  totalAmount: number,
  allocations: Array<{ allocatedAmount: number }>
): boolean {
  const sum = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0)
  return Math.abs(sum - totalAmount) < 0.01 // ← Tolerancia para decimales
}
```

**Por qué 0.01 de tolerancia?**
Evita errores de precisión con decimales en JavaScript.

```javascript
// Sin tolerancia (puede fallar):
500.0 === 200.0 + 100.0 + 200.0 // false (float precision)

// Con tolerancia (correcto):
Math.abs(500.0 - (200.0 + 100.0 + 200.0)) < 0.01 // true
```

---

## 🔌 API Routes

### 1. GET /api/payments

**Archivo:** `app/api/payments/route.ts:19-124`

#### Query Parameters:

| Parámetro    | Tipo       | Default | Descripción                            |
| ------------ | ---------- | ------- | -------------------------------------- |
| `page`       | number     | 1       | Número de página                       |
| `limit`      | number     | 10      | Registros por página (max: 100)        |
| `customerId` | string     | -       | Filtrar por cliente                    |
| `projectId`  | string     | -       | Filtrar por proyecto (via allocations) |
| `status`     | string     | -       | "ACTIVE" o "CANCELLED"                 |
| `startDate`  | ISO string | -       | Fecha inicio (inclusive)               |
| `endDate`    | ISO string | -       | Fecha fin (inclusive)                  |

#### Response:

```typescript
{
  payments: Payment[],  // Con customer, paymentMethod, allocations
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

#### Ejemplo:

```bash
GET /api/payments?customerId=abc-123&status=ACTIVE&limit=20
```

---

### 2. POST /api/payments

**Archivo:** `app/api/payments/route.ts:141-313`

#### Request Body:

```typescript
{
  customerId: string,        // UUID del cliente
  amount: number,            // Monto total (> 0)
  currency: string,          // "CLP", "USD", etc. (3 letras)
  date: string,              // ISO date string
  paymentMethodId: string,   // UUID del método
  reference?: string,        // Requerido si method.requiresReference
  notes?: string,
  allocations: Array<{
    projectId: string,       // UUID del proyecto
    allocatedAmount: number  // Monto asignado (> 0)
  }>  // Mínimo 1 allocation
}
```

#### Validaciones Automáticas:

```
1. ✅ customerId: string no vacío
2. ✅ amount: número > 0
3. ✅ currency: 3 letras exactamente
4. ✅ date: fecha válida
5. ✅ paymentMethodId: string no vacío
6. ✅ allocations: array con mínimo 1 elemento

Luego valida en DB:
7. ✅ Customer existe
8. ✅ PaymentMethod existe
9. ✅ Reference provisto si method.requiresReference
10. ✅ No hay projectIds duplicados en allocations
11. ✅ Todos los proyectos existen
12. ✅ Todos los proyectos pertenecen al customerId
13. ✅ Todos los proyectos tienen misma currency
14. ✅ Suma de allocations = amount (tolerancia 0.01)
```

#### Response Success (201):

```typescript
{
  id: string,
  amount: number,
  currency: string,
  date: string,
  // ... resto de campos
  customer: { id, name, phone },
  paymentMethod: { id, name, requiresReference, icon },
  allocations: Array<{
    id: string,
    allocatedAmount: number,
    project: {
      id, projectNumber, projectName, totalAmount, currency
    }
  }>
}
```

#### Errores Comunes:

| Status | Error                                                           | Causa                          |
| ------ | --------------------------------------------------------------- | ------------------------------ |
| 400    | "El cliente es requerido"                                       | customerId inválido            |
| 400    | "El monto debe ser mayor a 0"                                   | amount <= 0                    |
| 400    | "Debe asignar el pago a al menos un proyecto"                   | allocations.length === 0       |
| 400    | "No puede asignar el mismo proyecto dos veces"                  | Duplicados en allocations      |
| 400    | "La suma de los montos asignados debe ser igual al monto total" | Suma ≠ amount                  |
| 404    | "El cliente no existe"                                          | customerId no encontrado en DB |
| 404    | "El método de pago no existe"                                   | paymentMethodId no encontrado  |
| 404    | "Uno o más proyectos no existen"                                | projectIds inválidos           |

---

### 3. POST /api/payments/[id]/cancel

**Archivo:** `app/api/payments/[id]/cancel/route.ts:19-90`

**Anula un pago (soft delete).**

#### Request Body:

```typescript
{
  reason?: string  // Razón de anulación (opcional)
}
```

#### Proceso:

```
1. Verificar que el pago existe
2. Verificar que status !== 'CANCELLED'
3. UPDATE payment SET:
     status = 'CANCELLED'
     cancelledAt = NOW()
     cancelledReason = reason
4. Retornar pago actualizado
```

#### Importante:

- ❗ **NO elimina PaymentAllocations** (permanecen en DB)
- ❗ `calculateProjectBalance()` ignora allocations de pagos CANCELLED
- ❗ Cambio es **irreversible** (no hay endpoint de "reactivar")

#### Response Success (200):

```typescript
{
  // ... todos los campos del pago
  status: "CANCELLED",
  cancelledAt: "2024-11-05T10:30:00Z",
  cancelledReason: "Pago duplicado - error de ingreso"
}
```

#### Errores:

| Status | Error                     | Causa                  |
| ------ | ------------------------- | ---------------------- |
| 404    | "Pago no encontrado"      | id inválido            |
| 400    | "El pago ya está anulado" | status ya es CANCELLED |

---

## 🎨 Componentes UI

### 1. PaymentSummaryCard

**Archivo:** `components/summarys/payment-summary-card.tsx`

Card con resumen financiero de un proyecto.

#### Props:

```typescript
interface PaymentSummaryCardProps {
  projectId: string
  totalAmount: number | null
  currency: string
}
```

#### Vista:

```
┌───────────────────────────────────────┐
│ Resumen de Pagos    [Registrar Pago] │
│ Estado financiero del proyecto        │
├───────────────────────────────────────┤
│ Total del Proyecto     $500,000       │
│ Total Pagado           $300,000 ✅    │
│ Balance Pendiente      $200,000 ⚠️    │
│                                       │
│ Progreso de Pago              60.0%   │
│ [▓▓▓▓▓▓░░░░░░░░░░]                   │
│                                       │
│ ⚠ Pendiente de pago                  │
└───────────────────────────────────────┘
```

#### Estados Visuales:

```typescript
if (balance <= 0 && totalAmount > 0) {
  // ✅ Verde: "Proyecto pagado completamente"
} else if (balance > 0) {
  // ⚠️ Naranja: "Pendiente de pago"
}
```

#### Fetch de Datos:

```typescript
useEffect(() => {
  // GET /api/payments?projectId={projectId}
  const allocations = data.payments.flatMap((payment) =>
    payment.allocations
      .filter((alloc) => alloc.project.id === projectId)
      .map((alloc) => ({
        allocatedAmount: alloc.allocatedAmount,
        payment: { status: payment.status },
      }))
  )

  const { totalPaid, balance, percentPaid } = calculateProjectBalance({ totalAmount, allocations })
}, [projectId])
```

---

### 4. ProjectPaymentsTable

**Archivo:** `components/tables/project-payments-table.tsx`

Tabla con historial de pagos de un proyecto específico.

#### Props:

```typescript
interface ProjectPaymentsTableProps {
  projectId: string
}
```

#### Vista:

```
┌──────────────────────────────────────────────────────────────┐
│ Pagos del Proyecto                                           │
│ Historial de pagos asociados a este proyecto                │
├──────────────────────────────────────────────────────────────┤
│ Fecha    Método         Monto Asig. Referencia   Estado  Acc│
│ 15/Jul   Efectivo       $200,000    -            ✅ Activo │
│ 10/Sep   Transferencia  $300,000    TRX-987654   ✅ Activo │
│ 20/Oct   WebPay         $100,000    WP-555666    ✅ [Anul]│
│ 25/Oct   Transferencia  $50,000     TRX-CANCEL   ❌ Anula.│
└──────────────────────────────────────────────────────────────┘
```

#### Características:

- ✅ Muestra **monto asignado** (no monto total del pago)
- ✅ Badge verde (ACTIVE) o rojo (CANCELLED)
- ✅ Botón "Anular" solo visible si status === 'ACTIVE'
- ✅ Tooltip con cancelReason si está anulado

#### Dialog de Anulación:

```
┌───────────────────────────────────────┐
│ ¿Anular este pago?                    │
│ Esta acción no se puede deshacer.    │
├───────────────────────────────────────┤
│ Monto:  $100,000                      │
│ Método: WebPay                        │
│ Fecha:  20/Oct/2024                   │
│                                       │
│ Razón de anulación (opcional):       │
│ ┌───────────────────────────────────┐ │
│ │ Pago duplicado - error de ingreso │ │
│ └───────────────────────────────────┘ │
│                                       │
│ [Cancelar]         [Anular Pago]     │
└───────────────────────────────────────┘
```

---

### 5. Página Principal: /payments

**Archivo:** `app/payments/page.tsx`

Vista de todos los pagos del sistema.

#### Características:

- ✅ DataTable con paginación client-side (limit=1000)
- ✅ Búsqueda por nombre de cliente
- ✅ Filtro por estado (ACTIVE/CANCELLED)
- ✅ Filtro por método de pago
- ✅ Columnas: Fecha, Cliente, Método, Monto, Estado, Acciones
- ✅ Click en fila → PaymentDetailsDialog

#### Fetch:

```typescript
useEffect(() => {
  fetch('/api/payments?limit=1000')
    .then((res) => res.json())
    .then((data) => setPayments(data.payments))
}, [])
```

---

## 🔄 Flujos de Uso

### Flujo 1: Pago Simple a un Proyecto

```
Usuario → Click "Registrar Pago" en proyecto
      ↓
PaymentDialog se abre
      ↓
PaymentForm (modo Simple)
      ↓
1. Ingresa monto: $300,000
2. Selecciona método: "Transferencia"
3. Ingresa referencia: "TRX-123456"
4. Click en proyecto #2024-001
      ↓
Submit form
      ↓
POST /api/payments
  Body: {
    customerId: "abc-123",
    amount: 300000,
    currency: "CLP",
    date: "2024-11-05",
    paymentMethodId: "xyz-789",
    reference: "TRX-123456",
    allocations: [
      { projectId: "2024-001", allocatedAmount: 300000 }
    ]
  }
      ↓
Validaciones API (14 checks)
      ↓
✅ Success → Payment creado con allocation
      ↓
Toast: "Pago registrado exitosamente"
      ↓
onSuccess() → Refetch data
      ↓
PaymentSummaryCard actualiza balance
ProjectPaymentsTable muestra nuevo pago
```

---

### Flujo 2: Pago con FIFO Automático

```
Usuario → Click "Registrar Pago"
      ↓
PaymentDialog (modo Distribuir)
      ↓
1. Ingresa monto: $500,000
2. Selecciona método: "Efectivo"
3. Click "Calcular FIFO"
      ↓
Sistema ejecuta calculateFIFO():
      ↓
Proyectos ordenados por fecha:
  #2024-001 (Jun): balance $300k
  #2024-002 (Ago): balance $400k
  #2024-003 (Oct): balance $300k
      ↓
Distribución:
  $300k → #2024-001 (cierra)
  $200k → #2024-002 (abono)
  $0    → #2024-003 (skip)
      ↓
Tabla muestra allocations calculadas
Usuario puede editarlas manualmente
      ↓
Validación visual:
  Total asignado: $500,000 ✅
  Diferencia: $0
      ↓
Submit → POST /api/payments
      ↓
✅ Success → 2 allocations creadas
      ↓
Balances actualizados:
  #2024-001: $0 (pagado completo)
  #2024-002: $200k (pendiente)
```

---

### Flujo 3: Anulación de Pago

```
Usuario → ProjectPaymentsTable
      ↓
Encuentra pago incorrecto (status: ACTIVE)
      ↓
Click botón "Anular"
      ↓
AlertDialog se abre:
  - Muestra info del pago
  - Textarea para reason (opcional)
      ↓
Usuario ingresa:
  "Pago duplicado - error de ingreso"
      ↓
Click "Anular Pago"
      ↓
POST /api/payments/{id}/cancel
  Body: {
    reason: "Pago duplicado - error de ingreso"
  }
      ↓
API ejecuta:
  UPDATE payment SET
    status = 'CANCELLED',
    cancelledAt = NOW(),
    cancelledReason = reason
      ↓
✅ Success
      ↓
Toast: "Pago anulado exitosamente"
      ↓
Refetch payments
      ↓
Tabla actualiza:
  - Badge cambia a rojo "Anulado"
  - Botón "Anular" desaparece
  - Tooltip muestra reason
      ↓
PaymentSummaryCard recalcula:
  - calculateProjectBalance() ignora allocation
  - Balance aumenta automáticamente
```

---

### Flujo 4: Corrección Manual de Distribución

```
Usuario → Modo "Distribuir (1:N)"
      ↓
1. Ingresa monto: $400,000
2. Click "Calcular FIFO"
      ↓
FIFO sugiere:
  $300k → #2024-001
  $100k → #2024-002
      ↓
❌ Usuario prefiere otra distribución
      ↓
Edita manualmente:
  $150k → #2024-001
  $250k → #2024-002
      ↓
Validación en tiempo real:
  Total asignado: $400,000
  Diferencia: $0 ✅
      ↓
Submit → POST /api/payments
      ↓
✅ Allocations creadas según edición manual
```

---

## 📊 Ejemplos Prácticos

### Ejemplo 1: Cliente con Múltiples Proyectos

**Contexto:**
Juan Pérez tiene 3 proyectos antiguos con balance pendiente.

```javascript
// Estado inicial (del seed.ts)
const projects = [
  {
    id: 'project-1',
    projectNumber: '2024-001',
    date: new Date('2024-06-15'), // Junio (más antiguo)
    totalAmount: 500000,
    balance: 500000, // Sin pagos aún
  },
  {
    id: 'project-2',
    projectNumber: '2024-002',
    date: new Date('2024-08-20'), // Agosto
    totalAmount: 400000,
    balance: 400000,
  },
  {
    id: 'project-3',
    projectNumber: '2024-003',
    date: new Date('2024-10-10'), // Octubre (más nuevo)
    totalAmount: 300000,
    balance: 300000,
  },
]
```

**Pago 1:** $200,000 (Efectivo - 15/Jul/2024)

```javascript
// Modo Simple: Usuario selecciona proyecto-1
POST /api/payments {
  customerId: 'customer-1',
  amount: 200000,
  currency: 'CLP',
  date: '2024-07-15',
  paymentMethodId: 'efectivo-id',
  allocations: [
    { projectId: 'project-1', allocatedAmount: 200000 }
  ]
}

// Estado después:
project-1: balance = $300,000 (500k - 200k)
project-2: balance = $400,000 (sin cambios)
project-3: balance = $300,000 (sin cambios)
```

**Pago 2:** $500,000 (Transferencia - 10/Sep/2024)

```javascript
// Modo Distribuir: Click "Calcular FIFO"
calculateFIFO(500000, [
  { id: 'project-1', balance: 300000, createdAt: '2024-06-15' },
  { id: 'project-2', balance: 400000, createdAt: '2024-08-20' },
  { id: 'project-3', balance: 300000, createdAt: '2024-10-10' }
])

// FIFO distribuye:
Step 1: $300k → project-1 (cierra)
Step 2: $200k → project-2 (abono)
Step 3: Skip project-3 (remaining = 0)

POST /api/payments {
  customerId: 'customer-1',
  amount: 500000,
  currency: 'CLP',
  date: '2024-09-10',
  paymentMethodId: 'transferencia-id',
  reference: 'TRX-98765432',
  allocations: [
    { projectId: 'project-1', allocatedAmount: 300000 },
    { projectId: 'project-2', allocatedAmount: 200000 }
  ]
}

// Estado después:
project-1: balance = $0       (pagado completo) ✅
project-2: balance = $200,000 (400k - 200k)
project-3: balance = $300,000 (sin cambios)
```

**Pago 3:** $100,000 (WebPay - 20/Oct/2024)

```javascript
// Modo Simple: Usuario selecciona project-2
POST /api/payments {
  customerId: 'customer-1',
  amount: 100000,
  currency: 'CLP',
  date: '2024-10-20',
  paymentMethodId: 'webpay-id',
  reference: 'WP-555666777',
  allocations: [
    { projectId: 'project-2', allocatedAmount: 100000 }
  ]
}

// Estado final:
project-1: balance = $0       (pagado completo) ✅
project-2: balance = $100,000 (400k - 300k)
project-3: balance = $300,000 (pendiente)
```

---

### Ejemplo 2: Corrección de Error con Anulación

**Contexto:**
Se registró un pago duplicado por error.

```javascript
// Pago erróneo registrado:
Payment {
  id: 'payment-5',
  amount: 50000,
  date: '2024-10-25',
  reference: 'TRX-CANCEL123',
  status: 'ACTIVE',
  allocations: [
    { projectId: 'project-2', allocatedAmount: 50000 }
  ]
}

// Estado antes de anular:
project-2:
  totalAmount: 400000
  allocations: [
    { amount: 200000, status: 'ACTIVE' },
    { amount: 100000, status: 'ACTIVE' },
    { amount: 50000,  status: 'ACTIVE' }  // ← Duplicado
  ]
  balance = 50000  (400k - 350k)
```

**Usuario detecta error y anula:**

```javascript
POST /api/payments/payment-5/cancel {
  reason: "Error en transferencia - fondos devueltos"
}

// API ejecuta:
UPDATE payment
SET
  status = 'CANCELLED',
  cancelledAt = '2024-10-26T10:30:00Z',
  cancelledReason = 'Error en transferencia - fondos devueltos'
WHERE id = 'payment-5'
```

**Balance se recalcula automáticamente:**

```javascript
calculateProjectBalance({
  totalAmount: 400000,
  allocations: [
    { amount: 200000, payment: { status: 'ACTIVE' } },    // ✅ Cuenta
    { amount: 100000, payment: { status: 'ACTIVE' } },    // ✅ Cuenta
    { amount: 50000,  payment: { status: 'CANCELLED' } }  // ❌ No cuenta
  ]
})

// Resultado:
totalPaid = 300000  (200k + 100k)
balance = 100000    (400k - 300k)
```

**Estado corregido:**

```
project-2: balance = $100,000 (correcto) ✅
```

---

### Ejemplo 3: Pago que Cierra Múltiples Proyectos

**Contexto:**
Cliente tiene varios proyectos pequeños antiguos.

```javascript
const projects = [
  { id: 'A', date: '2024-01-10', balance: 100000 },
  { id: 'B', date: '2024-02-15', balance: 150000 },
  { id: 'C', date: '2024-03-20', balance: 200000 },
  { id: 'D', date: '2024-04-25', balance: 250000 },
]

// Recibe pago: $500,000
```

**FIFO distribuye:**

```javascript
calculateFIFO(500000, projects)

// Proceso:
remaining = 500000

Step 1: Project A (más antiguo)
  allocated = min(100000, 500000) = 100000
  remaining = 400000
  isFullyPaid = true ✅

Step 2: Project B
  allocated = min(150000, 400000) = 150000
  remaining = 250000
  isFullyPaid = true ✅

Step 3: Project C
  allocated = min(200000, 250000) = 200000
  remaining = 50000
  isFullyPaid = true ✅

Step 4: Project D
  allocated = min(250000, 50000) = 50000
  remaining = 0
  isFullyPaid = false (balance: 200k)

// Resultado:
allocations = [
  { projectId: 'A', amount: 100000, isFullyPaid: true },
  { projectId: 'B', amount: 150000, isFullyPaid: true },
  { projectId: 'C', amount: 200000, isFullyPaid: true },
  { projectId: 'D', amount: 50000,  isFullyPaid: false }
]
```

**Visualización en tabla:**

```
┌────────────────────────────────────────────────────┐
│ Proyecto   Balance    Monto Asig.   Estado        │
├────────────────────────────────────────────────────┤
│ #A         $100k      $100k         ✅ Completo   │
│ #B         $150k      $150k         ✅ Completo   │
│ #C         $200k      $200k         ✅ Completo   │
│ #D         $250k      $50k          ⚠️ Parcial   │
├────────────────────────────────────────────────────┤
│ Total pago: $500,000                              │
│ Total asignado: $500,000 ✅                       │
└────────────────────────────────────────────────────┘
```

---

## 📁 Referencia de Archivos

### Base de Datos

| Archivo                | Descripción                                       | Líneas  |
| ---------------------- | ------------------------------------------------- | ------- |
| `prisma/schema.prisma` | Modelos Payment, PaymentAllocation, PaymentMethod | 140-210 |
| `prisma/seed.ts`       | Datos de ejemplo con FIFO real                    | 359-498 |

### API Routes

| Archivo                                 | Endpoints     | Líneas |
| --------------------------------------- | ------------- | ------ |
| `app/api/payments/route.ts`             | GET, POST     | 1-313  |
| `app/api/payments/[id]/cancel/route.ts` | POST (anular) | 1-90   |

### Lógica de Negocio

| Archivo                                  | Funciones                              | Líneas |
| ---------------------------------------- | -------------------------------------- | ------ |
| `lib/validations/payment-validations.ts` | Schemas Zod, calculateProjectBalance() | 1-203  |
| `lib/payment-fifo.ts`                    | calculateFIFO(), helpers de balance    | 1-138  |

### Componentes UI - Dialogs

| Archivo                                                  | Descripción             | Líneas |
| -------------------------------------------------------- | ----------------------- | ------ |
| `components/dialogs/payments/payment-details-dialog.tsx` | Modal para ver detalles | -      |

### Componentes UI - Tables & Cards

| Archivo                                        | Descripción                     | Líneas |
| ---------------------------------------------- | ------------------------------- | ------ |
| `components/summarys/payment-summary-card.tsx` | Resumen financiero del proyecto | 1-173  |
| `components/tables/project-payments-table.tsx` | Historial de pagos + anular     | 1-337  |

### Páginas

| Archivo                    | Ruta        | Descripción             |
| -------------------------- | ----------- | ----------------------- | ----- |
| `app/payments/page.tsx`    | `/payments` | Lista completa de pagos | 1-120 |
| `app/payments/columns.tsx` | -           | Columnas de DataTable   | -     |

---

## 🔐 Seguridad y Validaciones

### Validaciones en API

```typescript
// 14 validaciones antes de crear pago:

// Frontend (Zod Schema):
1. customerId: UUID válido
2. amount: número > 0, max 2 decimales
3. currency: exactamente 3 letras
4. date: fecha válida
5. paymentMethodId: UUID válido
6. allocations: min 1, no duplicados, suma = amount

// Backend (Database):
7. Customer existe en DB
8. PaymentMethod existe en DB
9. Reference provisto si es requerido
10. No hay projectIds duplicados
11. Todos los proyectos existen
12. Todos los proyectos pertenecen al customerId
13. Todos los proyectos tienen misma currency
14. Suma de allocations = amount (tolerancia 0.01)
```

### Constraint de DB

```prisma
@@unique([paymentId, projectId])
```

Previene duplicar asignación de un pago al mismo proyecto.

### Soft Delete

```typescript
// NO hard delete:
DELETE FROM payment WHERE id = ?  // ❌ NUNCA

// Sí soft delete:
UPDATE payment
SET status = 'CANCELLED',
    cancelledAt = NOW(),
    cancelledReason = ?
WHERE id = ?  // ✅ Correcto
```

**Beneficios:**

- ✅ Auditoría completa
- ✅ Trazabilidad de cambios
- ✅ Posibilidad de reportes históricos
- ✅ No rompe integridad referencial

---

## 🎓 Conceptos Clave

### 1. PaymentAllocation vs Payment.amount

```
Payment.amount = $500,000  (monto total del pago)

PaymentAllocation[]:
  - { projectId: 'A', allocatedAmount: $300,000 }
  - { projectId: 'B', allocatedAmount: $200,000 }
                                     ───────────
                                      $500,000 ✅
```

**Regla:** Suma de allocatedAmount DEBE = Payment.amount

### 2. FIFO vs Manual

| FIFO                              | Manual                       |
| --------------------------------- | ---------------------------- |
| Automático                        | Usuario decide               |
| Cierra proyectos antiguos primero | Cualquier orden              |
| Optimiza cobros                   | Requiere más conocimiento    |
| Recomendado para pagos grandes    | Útil para abonos específicos |

### 3. Status ACTIVE vs CANCELLED

```typescript
// Balance se calcula diferente:
const totalPaid = allocations.reduce((sum, alloc) => {
  const isActive = alloc.payment.status === 'ACTIVE'
  return sum + (isActive ? alloc.allocatedAmount : 0)
  //                        ↑
  //         Si CANCELLED, no suma
}, 0)
```

### 4. Tolerancia en Decimales

```javascript
// Por qué 0.01?
const total = 500.0
const sum = 200.0 + 100.0 + 200.0 // = 500.0000000001 (float)

// Sin tolerancia:
total === sum // false ❌

// Con tolerancia:
Math.abs(total - sum) < 0.01 // true ✅
```

---

## 🚀 Mejoras Futuras

### Posibles Extensiones:

1. **Pagos Parciales Programados**
   - Dividir un pago en cuotas
   - Fechas de vencimiento
   - Recordatorios automáticos

2. **Reconciliación Bancaria**
   - Importar extractos bancarios
   - Match automático con pagos
   - Marcar como conciliados

3. **Multi-moneda**
   - Soporte para conversión de divisas
   - Tipos de cambio históricos
   - Reportes en múltiples monedas

4. **Roles y Permisos**
   - Solo admin puede anular pagos
   - Auditoría de quién modificó qué

5. **Notificaciones**
   - Email/SMS al recibir pago
   - Alertas de pagos vencidos
   - Resumen semanal de cobros

6. **Reportes Avanzados**
   - Dashboard de flujo de caja
   - Proyecciones de ingresos
   - Análisis de morosidad

---

## 📞 Soporte

Para preguntas o problemas:

1. Revisar esta documentación
2. Revisar código fuente en archivos referenciados
3. Revisar datos de ejemplo en `prisma/seed.ts`
4. Consultar validaciones en `lib/validations/payment-validations.ts`

---

**Última actualización:** 2024-11-05
**Versión:** 1.0.0
