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
**Archivo:** [lib/validations/payment-validations.ts:95-123](lib/validations/payment-validations.ts#L95-L123)

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

### 2. Schemas de Validación: Dos Flujos Principales

El sistema se divide en **dos flujos separados** para simplificar UX:

#### A. Pago a Proyecto (1:1) - Flujo Simplificado

**Schema:** `paymentToProjectSchema`
**Archivo:** [lib/validations/payment-validations.ts:137-182](lib/validations/payment-validations.ts#L137-L182)

```typescript
{
  projectId: string       // ← Proyecto seleccionado
  amount: number
  date: Date
  paymentMethodId: string
  reference?: string | null
  notes?: string | null
  // customerId y currency se derivan del proyecto seleccionado
  // allocations se genera automáticamente (100% al proyecto)
}
```

**Helper de conversión:** `paymentToProjectToPayload()`
**Archivo:** [lib/validations/payment-validations.ts:211-230](lib/validations/payment-validations.ts#L211-L230)

Convierte el schema simplificado al payload completo del API, derivando `customerId` y `currency` del proyecto seleccionado.

---

#### B. Pago a Cliente (1:N) - Flujo con FIFO

**Schema:** `paymentToCustomerSchema`
**Archivo:** [lib/validations/payment-validations.ts:245-323](lib/validations/payment-validations.ts#L245-L323)

```typescript
{
  customerId: string      // ← Cliente seleccionado
  amount: number
  date: Date
  paymentMethodId: string
  reference?: string | null
  notes?: string | null
  allocations: Array<{    // ← Distribución manual o FIFO
    projectId: string
    allocatedAmount: number
  }>
}
```

**Validaciones del schema:**

- Min 1 allocation
- No duplicados de `projectId`
- Suma de `allocatedAmount` = `amount` total (tolerancia 0.01)

**Helper de conversión:** `paymentToCustomerToPayload()`
**Archivo:** [lib/validations/payment-validations.ts:335-349](lib/validations/payment-validations.ts#L335-L349)

---

### 3. Distribución FIFO (First In First Out)

**Función:** `calculateFIFO()`
**Archivo:** [lib/validations/payment-validations.ts:372-400](lib/validations/payment-validations.ts#L372-L400)

```typescript
function calculateFIFO(
  projects: ProjectWithBalance[],
  totalAmount: number
): Array<{ projectId: string; allocatedAmount: number }>
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

### 4. Validación de Suma de Allocations

**Integrada en:** `paymentToCustomerSchema` (Zod refine)
**Archivo:** [lib/validations/payment-validations.ts:313-323](lib/validations/payment-validations.ts#L313-L323)

```typescript
.refine(
  (data) => {
    // Suma de allocations debe ser igual al monto total
    const totalAllocated = data.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
    return Math.abs(totalAllocated - data.amount) < 0.01 // ← Tolerancia para decimales
  },
  {
    message: 'La suma de los montos asignados debe ser igual al monto total del pago',
    path: ['allocations'],
  }
)
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

**Archivo:** [app/api/payments/route.ts](app/api/payments/route.ts)

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

### 2. GET /api/payments/search-projects

**Archivo:** [app/api/payments/search-projects/route.ts](app/api/payments/search-projects/route.ts)

**Propósito:** Búsqueda de proyectos para asignar pagos (usado en "Pago a Proyecto")

#### Query Parameters:

| Parámetro | Tipo   | Default | Descripción                       |
| --------- | ------ | ------- | --------------------------------- |
| `q`       | string | -       | Término de búsqueda (min 2 chars) |
| `limit`   | number | 20      | Máximo de resultados (max: 50)    |

#### Búsqueda en:

- `projectNumber` (ej: "2024-089")
- `projectName` (ej: "Ampliación bodega")
- `customer.name` (ej: "Juan Pérez")

#### Filtros automáticos:

- Solo proyectos con `totalAmount > 0`
- Solo proyectos con `balance > 0` (calcula balance en tiempo real)
- Solo cuenta pagos `status = 'ACTIVE'`

#### Response:

```typescript
Array<{
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: number
  currency: string
  balance: number // ← Calculado dinámicamente
  createdAt: Date // ← Para FIFO
  customer: {
    id: string
    name: string
  }
}>
```

#### Ejemplo:

```bash
GET /api/payments/search-projects?q=2024&limit=10
```

---

### 3. GET /api/payments/customer-projects

**Archivo:** [app/api/payments/customer-projects/route.ts](app/api/payments/customer-projects/route.ts)

**Propósito:** Obtener proyectos de un cliente para distribución FIFO (usado en "Pago a Cliente")

#### Query Parameters:

| Parámetro    | Tipo   | Required | Descripción      |
| ------------ | ------ | -------- | ---------------- |
| `customerId` | string | ✅ Sí    | UUID del cliente |

#### Validaciones:

- `customerId` es requerido y debe ser UUID válido
- Verifica que el cliente existe (404 si no)
- Solo retorna proyectos con `totalAmount > 0` y `balance > 0`

#### Response:

```typescript
Array<{
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: number
  currency: string
  balance: number // ← Calculado dinámicamente
  createdAt: Date // ← Para FIFO (ordenado ASC)
  customer: {
    id: string
    name: string
  }
}>
```

**Importante:** Proyectos ordenados por `createdAt ASC` (más antiguos primero) para facilitar FIFO.

#### Ejemplo:

```bash
GET /api/payments/customer-projects?customerId=abc-123
```

---

### 4. POST /api/payments

**Archivo:** [app/api/payments/route.ts](app/api/payments/route.ts)

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

### 5. POST /api/payments/[id]/cancel

**Archivo:** [app/api/payments/[id]/cancel/route.ts](app/api/payments/[id]/cancel/route.ts)

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

### Arquitectura de Componentes

El sistema sigue los patrones del template (ver [docs/template/methodology/patterns.md](docs/template/methodology/patterns.md)):

- **Dialogs:** `components/dialogs/payments/`
- **Forms:** `components/forms/payments/`
- **Tables:** `components/tables/`
- **Summaries:** `components/summarys/`

---

### 1. Dialogs de Registro

#### A. PaymentToProjectDialog (Pago a Proyecto 1:1)

**Archivo:** [components/dialogs/payments/payment-to-project-dialog.tsx](components/dialogs/payments/payment-to-project-dialog.tsx)

**Propósito:** Dialog para flujo simplificado de pago a un solo proyecto.

**Props:**

```typescript
{
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void  // Callback para refetch
}
```

**Características:**

- Dialog reutilizable con estado de apertura/cierre externo
- Maneja submit del formulario
- POST a `/api/payments` con payload generado automáticamente
- Toast de success/error
- Callback `onSuccess` para refetch de datos
- Router refresh automático

**Componente interno:** [PaymentToProjectForm](#b-paymenttoprojectform)

---

#### B. PaymentToCustomerDialog (Pago a Cliente 1:N)

**Archivo:** [components/dialogs/payments/payment-to-customer-dialog.tsx](components/dialogs/payments/payment-to-customer-dialog.tsx)

**Propósito:** Dialog para flujo avanzado con distribución FIFO o manual.

**Props:**

```typescript
{
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}
```

**Características:**

- Dialog para flujo complejo (FIFO + manual)
- Valida que suma de allocations = monto total
- Soporta tabs: FIFO automático vs Manual
- POST a `/api/payments` con allocations completas
- Router refresh + callback

**Componente interno:** [PaymentToCustomerForm](#c-paymenttocustomerform)

---

#### C. PaymentDetailsDialog

**Archivo:** [components/dialogs/payments/payment-details-dialog.tsx](components/dialogs/payments/payment-details-dialog.tsx)

**Propósito:** Ver detalles completos de un pago existente.

**Props:**

```typescript
{
  payment: Payment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

**Muestra:**

- Información del pago (monto, fecha, método, referencia)
- Customer info
- Lista de allocations a proyectos
- Status (ACTIVE/CANCELLED) con badge
- Razón de cancelación (si aplica)

---

### 2. Formularios

#### A. PaymentToProjectForm (1:1)

**Archivo:** [components/forms/payments/payment-to-project-form.tsx](components/forms/payments/payment-to-project-form.tsx)

**Schema:** `paymentToProjectSchema`

**Campos:**

1. **Proyecto** (Combobox con búsqueda)
   - API: `/api/payments/search-projects?q={search}`
   - Busca por projectNumber, projectName, customer.name
   - Muestra: projectNumber + balance pendiente
   - Debounce 300ms

2. **Monto** (CurrencyInput)
   - Currency derivada del proyecto seleccionado
   - Validación: > 0, max 2 decimales
   - Muestra balance del proyecto

3. **Fecha** (DatePicker)
   - Default: hoy
   - Formato: es-CL

4. **Método de Pago** (Select)
   - Carga desde `/api/payment-methods`
   - Muestra icon si tiene

5. **Referencia** (Input opcional)
   - Requerida si `method.requiresReference`
   - Max 100 caracteres

6. **Notas** (Textarea opcional)
   - Max 500 caracteres

**Features:**

- Validación con React Hook Form + Zod
- Auto-derivación de customerId y currency
- Submit expone `(values, project)` al parent
- Loading state integrado

---

#### B. PaymentToCustomerForm (1:N)

**Archivo:** [components/forms/payments/payment-to-customer-form.tsx](components/forms/payments/payment-to-customer-form.tsx)

**Schema:** `paymentToCustomerSchema`

**Campos básicos:**

1. **Cliente** (Combobox con búsqueda)
   - API: Búsqueda de customers
   - Al seleccionar → fetch proyectos: `/api/payments/customer-projects?customerId={id}`

2. **Monto** (CurrencyInput)
3. **Fecha** (DatePicker)
4. **Método de Pago** (Select)
5. **Referencia** (Input opcional)
6. **Notas** (Textarea opcional)

**Sección de Distribución (Tabs):**

**Tab 1: FIFO Automático**

- Botón "Calcular FIFO"
- Ejecuta `calculateFIFO(projects, amount)`
- Muestra tabla readonly con distribución sugerida
- Columnas: Proyecto, Monto Asignado, Estado (Completo/Parcial)

**Tab 2: Distribución Manual**

- Tabla editable para asignar montos
- Columnas: Proyecto, Balance, Monto Asignado
- Botones: + Agregar Proyecto, 🗑️ Eliminar
- Muestra total asignado vs monto total
- Validación en tiempo real

**Validación:**

- Suma de allocations = monto total (tolerancia 0.01)
- No proyectos duplicados
- Todos los proyectos del mismo customer
- Todos los proyectos con misma currency

---

### 3. PaymentSummaryCard

**Archivo:** [components/summarys/payment-summary-card.tsx](components/summarys/payment-summary-card.tsx)

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

**Archivo:** [components/tables/project-payments-table.tsx](components/tables/project-payments-table.tsx)

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

**Archivo:** [app/payments/page.tsx](app/payments/page.tsx)

Vista de todos los pagos del sistema.

#### Características:

- ✅ DataTable con paginación client-side (limit=1000)
- ✅ Búsqueda por nombre de cliente
- ✅ Filtro por estado (ACTIVE/CANCELLED)
- ✅ Filtro por método de pago
- ✅ Columnas: Fecha, Cliente, Método, Monto, Estado, Acciones
- ✅ Click en fila → PaymentDetailsDialog
- ✅ **Dropdown "Registrar Pago"** con 2 opciones:
  - "Pago a Proyecto" → Abre `PaymentToProjectDialog`
  - "Pago a Cliente" → Abre `PaymentToCustomerDialog`

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

### Flujo 1: Pago a Proyecto (1:1) - Flujo Simplificado

```
Usuario → Click "Registrar Pago" → "Pago a Proyecto"
      ↓
PaymentToProjectDialog se abre
      ↓
PaymentToProjectForm renderizado
      ↓
1. Usuario busca proyecto: "2024"
   → API: GET /api/payments/search-projects?q=2024
   → Muestra proyectos con balance > 0
      ↓
2. Selecciona "2024-001" (balance: $300,000)
   → customerId y currency se derivan automáticamente
      ↓
3. Ingresa monto: $200,000
   → Validación: No puede exceder balance
      ↓
4. Selecciona fecha: Hoy
      ↓
5. Selecciona método: "Transferencia"
   → Campo referencia se vuelve requerido (requiresReference: true)
      ↓
6. Ingresa referencia: "TRX-123456"
      ↓
7. Click "Registrar Pago"
      ↓
Submit → Helper convierte a payload completo:
  paymentToProjectToPayload(values, project) → {
    customerId: "abc-123",        // ← Derivado del proyecto
    amount: 200000,
    currency: "CLP",              // ← Derivado del proyecto
    date: "2024-11-05",
    paymentMethodId: "xyz-789",
    reference: "TRX-123456",
    notes: null,
    allocations: [
      { projectId: "2024-001", allocatedAmount: 200000 }  // ← 100% del monto
    ]
  }
      ↓
POST /api/payments
      ↓
Validaciones API (14 checks)
      ↓
✅ Success → Payment creado con allocation
      ↓
Toast: "Pago registrado exitosamente"
      ↓
Dialog cierra → onSuccess() → Refetch data → Router refresh
      ↓
PaymentSummaryCard actualiza balance:
  - totalAmount: $300,000
  - totalPaid: $200,000 ✅
  - balance: $100,000
ProjectPaymentsTable muestra nuevo pago
```

---

### Flujo 2: Pago a Cliente (1:N) - FIFO Automático

```
Usuario → Click "Registrar Pago" → "Pago a Cliente"
      ↓
PaymentToCustomerDialog se abre
      ↓
PaymentToCustomerForm renderizado
      ↓
1. Usuario busca cliente: "Juan"
   → API: Búsqueda de customers
   → Muestra resultados con debounce 300ms
      ↓
2. Selecciona "Juan Pérez"
   → Trigger: GET /api/payments/customer-projects?customerId=abc-123
   → Retorna proyectos con balance > 0 ordenados por createdAt ASC
   → Resultado:
     - #2024-001 (Jun): balance $300k
     - #2024-002 (Ago): balance $400k
     - #2024-003 (Oct): balance $300k
      ↓
3. Ingresa monto: $500,000
      ↓
4. Selecciona fecha: Hoy
      ↓
5. Selecciona método: "Efectivo"
      ↓
6. Tab "FIFO Automático" (default)
      ↓
7. Click "Calcular FIFO"
   → Frontend ejecuta:
      calculateFIFO(projects, 500000)
      ↓
      Distribución FIFO:
        Step 1: $300k → #2024-001 (cierra completo)
        Step 2: $200k → #2024-002 (abono parcial)
        Step 3: Skip #2024-003 (remaining = 0)
      ↓
      Resultado:
        allocations = [
          { projectId: '2024-001', allocatedAmount: 300000 },
          { projectId: '2024-002', allocatedAmount: 200000 }
        ]
      ↓
8. Tabla muestra distribución FIFO sugerida:
   ┌────────────────────────────────────────┐
   │ Proyecto    Monto Asig.   Estado      │
   ├────────────────────────────────────────┤
   │ #2024-001   $300,000      ✅ Completo │
   │ #2024-002   $200,000      ⚠️ Parcial  │
   └────────────────────────────────────────┘

   Resumen:
   Total asignado: $500,000 ✅
   Diferencia: $0
      ↓
9. Usuario puede:
   - Aceptar distribución FIFO → Submit
   - O cambiar a tab "Manual" para editar
      ↓
10. Click "Registrar Pago"
      ↓
Submit → Helper convierte:
  paymentToCustomerToPayload(values, "CLP") → {
    customerId: "abc-123",
    amount: 500000,
    currency: "CLP",          // ← Derivada del primer proyecto
    date: "2024-11-05",
    paymentMethodId: "efectivo-id",
    reference: null,
    notes: null,
    allocations: [
      { projectId: "2024-001", allocatedAmount: 300000 },
      { projectId: "2024-002", allocatedAmount: 200000 }
    ]
  }
      ↓
POST /api/payments
      ↓
Validaciones API (14 checks)
      ↓
✅ Success → Payment creado con 2 allocations
      ↓
Toast: "Pago registrado exitosamente"
      ↓
Dialog cierra → Router refresh
      ↓
Balances actualizados:
  #2024-001: balance = $0 (pagado completo) ✅
  #2024-002: balance = $200k (pendiente)
  #2024-003: balance = $300k (sin cambios)
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

### Flujo 4: Pago a Cliente (1:N) - Distribución Manual

```
Usuario → Click "Registrar Pago" → "Pago a Cliente"
      ↓
PaymentToCustomerDialog → PaymentToCustomerForm
      ↓
1. Selecciona cliente: "Juan Pérez"
   → Carga proyectos con balance:
     - #2024-001 (Jun): balance $300k
     - #2024-002 (Ago): balance $400k
     - #2024-003 (Oct): balance $300k
      ↓
2. Ingresa monto: $400,000
      ↓
3. Selecciona método: "Transferencia"
      ↓
4. Cambia a tab "Distribución Manual"
      ↓
5. Click "Calcular FIFO" (opcional)
   → FIFO sugiere:
     - $300k → #2024-001
     - $100k → #2024-002
      ↓
6. ❌ Usuario prefiere otra distribución
   → Edita manualmente en tabla:

   ┌──────────────────────────────────────────────┐
   │ Proyecto    Balance    Monto Asignado  [X]  │
   ├──────────────────────────────────────────────┤
   │ #2024-001   $300k      [$150,000]      🗑️   │
   │ #2024-002   $400k      [$250,000]      🗑️   │
   └──────────────────────────────────────────────┘

   [+ Agregar Proyecto]

   Resumen:
   Total asignado: $400,000 ✅
   Diferencia: $0
      ↓
7. Validación en tiempo real (Zod refine):
   - Suma = monto total ✅
   - No duplicados ✅
   - Todos del mismo customer ✅
   - Misma currency ✅
      ↓
8. Click "Registrar Pago"
      ↓
Submit → POST /api/payments con allocations editadas
      ↓
✅ Success → 2 allocations creadas según distribución manual
      ↓
Balances actualizados:
  #2024-001: balance = $150k (abono parcial)
  #2024-002: balance = $150k (abono parcial)
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

| Archivo                                                | Descripción                                       | Líneas  |
| ------------------------------------------------------ | ------------------------------------------------- | ------- |
| [prisma/schema.prisma](prisma/schema.prisma#L140-L210) | Modelos Payment, PaymentAllocation, PaymentMethod | 140-210 |
| [prisma/seed.ts](prisma/seed.ts)                       | Datos de ejemplo con FIFO real                    | 359-498 |

### API Routes

| Archivo                                                                                    | Endpoints | Descripción                       |
| ------------------------------------------------------------------------------------------ | --------- | --------------------------------- |
| [app/api/payments/route.ts](app/api/payments/route.ts)                                     | GET, POST | Lista de pagos + crear pago       |
| [app/api/payments/search-projects/route.ts](app/api/payments/search-projects/route.ts)     | GET       | Búsqueda de proyectos con balance |
| [app/api/payments/customer-projects/route.ts](app/api/payments/customer-projects/route.ts) | GET       | Proyectos de un cliente (FIFO)    |
| [app/api/payments/[id]/cancel/route.ts](app/api/payments/[id]/cancel/route.ts)             | POST      | Anular pago (soft delete)         |

### Lógica de Negocio

| Archivo                                                                          | Funciones                                                                                 |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [lib/validations/payment-validations.ts](lib/validations/payment-validations.ts) | Schemas Zod (2 flujos), calculateProjectBalance(), calculateFIFO(), helpers de conversión |

**Nota:** El archivo `lib/payment-fifo.ts` fue eliminado. Su lógica está ahora integrada en `payment-validations.ts`.

### Componentes UI - Dialogs

| Archivo                                                                                                                  | Descripción                            |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| [components/dialogs/payments/payment-to-project-dialog.tsx](components/dialogs/payments/payment-to-project-dialog.tsx)   | Dialog "Pago a Proyecto" (1:1)         |
| [components/dialogs/payments/payment-to-customer-dialog.tsx](components/dialogs/payments/payment-to-customer-dialog.tsx) | Dialog "Pago a Cliente" (1:N) con FIFO |
| [components/dialogs/payments/payment-details-dialog.tsx](components/dialogs/payments/payment-details-dialog.tsx)         | Ver detalles de un pago                |

### Componentes UI - Forms

| Archivo                                                                                                          | Descripción                          |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [components/forms/payments/payment-to-project-form.tsx](components/forms/payments/payment-to-project-form.tsx)   | Formulario flujo 1:1 simplificado    |
| [components/forms/payments/payment-to-customer-form.tsx](components/forms/payments/payment-to-customer-form.tsx) | Formulario flujo 1:N con FIFO/Manual |

### Componentes UI - Tables & Cards

| Archivo                                                                                      | Descripción                     |
| -------------------------------------------------------------------------------------------- | ------------------------------- |
| [components/summarys/payment-summary-card.tsx](components/summarys/payment-summary-card.tsx) | Resumen financiero del proyecto |
| [components/tables/project-payments-table.tsx](components/tables/project-payments-table.tsx) | Historial de pagos + anular     |

### Páginas

| Archivo                                              | Ruta        | Descripción                                      |
| ---------------------------------------------------- | ----------- | ------------------------------------------------ |
| [app/payments/page.tsx](app/payments/page.tsx)       | `/payments` | Lista completa de pagos con dropdown de registro |
| [app/payments/columns.tsx](app/payments/columns.tsx) | -           | Columnas de DataTable                            |

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

**Última actualización:** 2025-10-21
**Versión:** 2.0.0

## 📝 Historial de Cambios

### v2.0.0 (2025-10-21)

**Refactor arquitectural completo:**

- ✅ **Separación en 2 flujos principales:**
  - "Pago a Proyecto" (1:1) - Flujo simplificado con auto-derivación de datos
  - "Pago a Cliente" (1:N) - Flujo con FIFO automático o distribución manual

- ✅ **Nuevos endpoints API:**
  - `GET /api/payments/search-projects` - Búsqueda de proyectos con balance
  - `GET /api/payments/customer-projects` - Proyectos de un cliente ordenados para FIFO

- ✅ **Schemas de validación separados:**
  - `paymentToProjectSchema` con helpers de conversión
  - `paymentToCustomerSchema` con validación integrada de suma

- ✅ **Nuevos componentes:**
  - `PaymentToProjectDialog` + `PaymentToProjectForm`
  - `PaymentToCustomerDialog` + `PaymentToCustomerForm`

- ✅ **Consolidación de lógica:**
  - Eliminado `lib/payment-fifo.ts`
  - `calculateFIFO()` integrado en `payment-validations.ts`

- ✅ **Página de pagos mejorada:**
  - Dropdown "Registrar Pago" con 2 opciones
  - UX simplificada según flujo de uso

### v1.0.0 (2024-11-05)

- Implementación inicial del sistema de pagos
- Soporte básico para 1:N con FIFO manual
