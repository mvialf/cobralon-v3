# Flujo: Pago a Proyecto (1:1)

Flujo para registrar un pago asignado a UN SOLO proyecto específico.

---

## Diagrama del Flujo

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Usuario busca proyecto específico                           │
│    ↓                                                            │
│    DataTable de proyectos → Columna "Actions"                  │
│    └── Botón "Registrar Pago" (icono Banknote)                 │
│    ↓                                                            │
│    components/dialogs/payments/payment-to-project-dialog.tsx   │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 2. Sistema muestra contexto del proyecto                       │
│    ↓                                                            │
│    Información derivada automáticamente:                       │
│    ↓                                                            │
│    ✅ Cliente: project.customer.name (read-only)               │
│    ✅ Currency: project.currency (derivada, hidden)            │
│    ✅ Balance pendiente: total - SUM(allocations)              │
│    ↓                                                            │
│    Ejemplo:                                                    │
│    - Cliente: "Juan Pérez"                                     │
│    - Proyecto: "P 0001-2025 - Casa Providencia"                │
│    - Total: $1,190,000                                         │
│    - Pagado: $500,000                                          │
│    - Balance: $690,000 ⚠️                                      │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 3. Usuario ingresa datos del pago                              │
│    ↓                                                            │
│    Campos obligatorios:                                        │
│    - amount: Decimal(12,2) (hasta balance máximo)              │
│    - date: DateTime (default: hoy)                             │
│    - paymentMethodId: UUID (combobox)                          │
│    ↓                                                            │
│    Campos opcionales:                                          │
│    - reference: String (número de voucher, boleta)             │
│    - notes: String (notas adicionales)                         │
│    ↓                                                            │
│    Condicional - Si método soporta cuotas:                     │
│    - selectedInstallments: Int (null = pago único)             │
│    ↓                                                            │
│    Ejemplo:                                                    │
│    - amount: $500,000                                          │
│    - date: 2025-10-30                                          │
│    - paymentMethodId: "transferencia-uuid"                     │
│    - reference: "TRANSF-12345"                                 │
│    - selectedInstallments: null (pago único)                   │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 4. Validación Frontend                                         │
│    ↓                                                            │
│    lib/validations/payment-validations.ts                      │
│    ↓                                                            │
│    A. Validar monto:                                           │
│       ✅ amount > 0                                            │
│       ✅ amount <= balance del proyecto                        │
│       ↓                                                         │
│       if (amount > balance) {                                  │
│         error = "Monto excede el balance del proyecto"         │
│       }                                                        │
│    ↓                                                            │
│    B. Validar método de pago:                                  │
│       ✅ paymentMethodId existe                                │
│       ✅ paymentMethod.active === true                         │
│    ↓                                                            │
│    C. Validar cuotas (si aplica):                              │
│       ✅ selectedInstallments >= 2 (o null)                    │
│       ✅ selectedInstallments <= paymentMethod.maxInstallments │
│       ↓                                                         │
│       if (selectedInstallments > maxInstallments) {            │
│         error = "Máximo N cuotas para este método"             │
│       }                                                        │
│    ↓                                                            │
│    Si validación falla → Mostrar errores                       │
│    Si validación pasa → Continuar a API                        │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 5. POST /api/payments (Backend)                                │
│    ↓                                                            │
│    app/api/payments/route.ts                                   │
│    ↓                                                            │
│    A. Construir payload:                                       │
│       ↓                                                         │
│       const payload = {                                        │
│         type: "Project",  // ← Tipo 1:1                        │
│         customerId: project.customerId,  // Derivado           │
│         amount: formData.amount,                               │
│         currency: project.currency,  // Derivada               │
│         date: formData.date,                                   │
│         paymentMethodId: formData.paymentMethodId,             │
│         reference: formData.reference,                         │
│         notes: formData.notes,                                 │
│         selectedInstallments: formData.selectedInstallments,   │
│         allocations: [                                         │
│           {                                                    │
│             projectId: project.id,                             │
│             allocatedAmount: formData.amount  // 100%          │
│           }                                                    │
│         ]                                                      │
│       }                                                        │
│    ↓                                                            │
│    B. Validación Backend:                                      │
│       ↓                                                         │
│       ✅ type === "Project" && allocations.length === 1        │
│       ✅ allocations[0].allocatedAmount === amount             │
│       ✅ project.customerId === customerId                     │
│       ✅ project.currency === currency                         │
│       ↓                                                         │
│       Todas estas validaciones deben pasar ✅                  │
│    ↓                                                            │
│    C. Transacción en DB:                                       │
│       ↓                                                         │
│       await prisma.$transaction(async (tx) => {                │
│         // 1. Crear Payment                                    │
│         const payment = await tx.payment.create({              │
│           data: {                                              │
│             type: "Project",                                   │
│             amount, currency, date,                            │
│             customerId, paymentMethodId,                       │
│             reference, notes,                                  │
│             selectedInstallments,                              │
│           }                                                    │
│         })                                                     │
│         ↓                                                       │
│         // 2. Crear PaymentAllocation (1 sola)                 │
│         await tx.paymentAllocation.create({                    │
│           data: {                                              │
│             paymentId: payment.id,                             │
│             projectId: project.id,                             │
│             allocatedAmount: amount,                           │
│           }                                                    │
│         })                                                     │
│         ↓                                                       │
│         // 3. Crear Installments (si selectedInstallments > 1) │
│         if (selectedInstallments && selectedInstallments > 1) {│
│           const installments = generateInstallments(           │
│             amount,                                            │
│             selectedInstallments,                              │
│             date                                               │
│           )                                                    │
│           ↓                                                     │
│           await tx.installment.createMany({                    │
│             data: installments.map(inst => ({                  │
│               paymentId: payment.id,                           │
│               ...inst                                          │
│             }))                                                │
│           })                                                   │
│         }                                                      │
│         ↓                                                       │
│         return payment                                         │
│       })                                                       │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 6. Sistema recalcula balance del proyecto                      │
│    ↓                                                            │
│    Balance ANTES del pago:                                     │
│    balance = total - SUM(allocations previas)                  │
│    balance = 1,190,000 - 500,000 = 690,000                     │
│    ↓                                                            │
│    Nuevo pago:                                                 │
│    amount = 500,000                                            │
│    ↓                                                            │
│    Balance DESPUÉS del pago:                                   │
│    balance = total - SUM(allocations previas + nueva)          │
│    balance = 1,190,000 - (500,000 + 500,000)                   │
│    balance = 190,000 ✅                                        │
│    ↓                                                            │
│    Query de balance:                                           │
│    ↓                                                            │
│    const project = await prisma.project.findUnique({           │
│      where: { id: projectId },                                 │
│      include: {                                                │
│        paymentAllocations: {                                   │
│          select: { allocatedAmount: true }                     │
│        }                                                       │
│      }                                                         │
│    })                                                          │
│    ↓                                                            │
│    const totalAllocated = project.paymentAllocations           │
│      .reduce((sum, a) => sum + Number(a.allocatedAmount), 0)   │
│    ↓                                                            │
│    const balance = Number(project.total) - totalAllocated      │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 7. Resultado: Pago Registrado ✅                               │
│    ↓                                                            │
│    Response 201:                                               │
│    {                                                           │
│      id: "payment-uuid",                                       │
│      type: "Project",                                          │
│      amount: 500000,                                           │
│      currency: "CLP",                                          │
│      allocations: [                                            │
│        {                                                       │
│          projectId: "project-uuid",                            │
│          allocatedAmount: 500000                               │
│        }                                                       │
│      ],                                                        │
│      installments: []  // Si pago único                        │
│    }                                                           │
│    ↓                                                            │
│    UI:                                                         │
│    - Toast success: "Pago registrado exitosamente"             │
│    - Cerrar dialog                                             │
│    - Refresh DataTable de proyectos (balance actualizado)      │
│    - Opcional: Mostrar resumen del pago                        │
└────────────────────────────────────────────────────────────────┘
```

---

## Validaciones Backend Críticas

### 1. Tipo de Pago

```typescript
// ✅ Payment tipo "Project" debe tener exactamente 1 allocation
if (type === 'Project' && allocations.length !== 1) {
  return NextResponse.json(
    { error: 'Payment tipo "Project" debe tener exactamente 1 allocation' },
    { status: 400 }
  )
}
```

### 2. Suma de Allocations

```typescript
// ✅ La suma de allocations debe igualar el monto del pago
const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)

const tolerance = 0.01 // Tolerancia para errores de redondeo

if (Math.abs(totalAllocated - amount) > tolerance) {
  return NextResponse.json(
    {
      error: `La suma de allocations (${totalAllocated}) no coincide con el monto (${amount})`,
    },
    { status: 400 }
  )
}
```

### 3. Cliente y Currency

```typescript
// ✅ Verificar que el proyecto existe y pertenece al cliente
const project = await prisma.project.findUnique({
  where: { id: allocations[0].projectId },
  select: { id: true, customerId: true, currency: true },
})

if (!project) {
  return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
}

if (project.customerId !== customerId) {
  return NextResponse.json({ error: 'El proyecto no pertenece a este cliente' }, { status: 400 })
}

if (project.currency !== currency) {
  return NextResponse.json({ error: 'La moneda no coincide con la del proyecto' }, { status: 400 })
}
```

---

## Componentes Involucrados

### 1. Trigger Button (en DataTable)

```typescript
// app/projects/columns.tsx
{
  id: 'actions',
  cell: ({ row }) => {
    const project = row.original

    return (
      <PaymentToProjectDialog
        project={project}
        onSuccess={() => {
          // Refresh table
          router.refresh()
        }}
      >
        <Button variant="ghost" size="sm">
          <Banknote className="h-4 w-4" />
        </Button>
      </PaymentToProjectDialog>
    )
  },
}
```

### 2. Dialog Container

```typescript
// components/dialogs/payments/payment-to-project-dialog.tsx
export function PaymentToProjectDialog({
  project,
  onSuccess,
  children,
}: PaymentToProjectDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Cliente: {project.customer.name}
            <br />
            Proyecto: {project.projectNumber} - {project.projectName}
            <br />
            Balance: {formatCurrency(calculateBalance(project), project.currency)}
          </DialogDescription>
        </DialogHeader>
        <PaymentToProjectForm project={project} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Form Component

```typescript
// components/forms/payments/payment-to-project-form.tsx
export function PaymentToProjectForm({ project, onSuccess }: FormProps) {
  const balance = calculateProjectBalance(project)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentToProjectSchema),
    defaultValues: {
      amount: balance, // Pre-fill con balance completo
      date: new Date(),
      paymentMethodId: '',
    },
  })

  async function onSubmit(data: PaymentFormValues) {
    const payload = {
      type: 'Project',
      customerId: project.customerId,
      amount: data.amount,
      currency: project.currency,
      date: data.date,
      paymentMethodId: data.paymentMethodId,
      reference: data.reference,
      notes: data.notes,
      selectedInstallments: data.selectedInstallments,
      allocations: [
        {
          projectId: project.id,
          allocatedAmount: data.amount, // 100% al proyecto
        },
      ],
    }

    const response = await fetch('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      toast.success('Pago registrado exitosamente')
      onSuccess?.()
    }
  }

  return <Form {...form}>{/* Campos del form */}</Form>
}
```

---

## Business Logic

### Cálculo de Balance

```typescript
// lib/business-logic/project-balance.ts
export function calculateProjectBalance(project: ProjectWithAllocations): number {
  const totalAllocated = project.paymentAllocations.reduce(
    (sum, allocation) => sum + Number(allocation.allocatedAmount),
    0
  )

  return Number(project.total) - totalAllocated
}
```

**Ejemplo:**

```
Total: $1,190,000
Allocations previas: $500,000
Balance: $690,000

Nuevo pago: $500,000
Balance actualizado: $190,000 ✅
```

---

## Estados del Proyecto

### Antes del Pago

```typescript
{
  id: "project-uuid",
  total: 1190000,
  paymentAllocations: [
    { allocatedAmount: 500000 }  // Pago previo
  ],
  balance: 690000  // Calculado
}
```

### Después del Pago

```typescript
{
  id: "project-uuid",
  total: 1190000,
  paymentAllocations: [
    { allocatedAmount: 500000 },  // Pago previo
    { allocatedAmount: 500000 }   // Nuevo pago ✅
  ],
  balance: 190000  // Actualizado
}
```

---

## Casos Especiales

### 1. Pago Completo (Balance = 0)

```typescript
// Si amount === balance
const payment = {
  amount: 690000,
  allocations: [{ projectId: 'project-uuid', allocatedAmount: 690000 }],
}

// Resultado:
// balance = 1,190,000 - (500,000 + 690,000) = 0 ✅
// Proyecto completamente pagado
```

### 2. Pago Parcial

```typescript
// Si amount < balance
const payment = {
  amount: 200000,
  allocations: [{ projectId: 'project-uuid', allocatedAmount: 200000 }],
}

// Resultado:
// balance = 1,190,000 - (500,000 + 200,000) = 490,000 ✅
// Proyecto aún tiene balance pendiente
```

### 3. Pago con Cuotas

```typescript
// Si selectedInstallments > 1
const payment = {
  amount: 600000,
  selectedInstallments: 3,
  allocations: [{ projectId: 'project-uuid', allocatedAmount: 600000 }],
}

// Sistema crea automáticamente:
// - Installment 1: $200,000 (dueDate: hoy)
// - Installment 2: $200,000 (dueDate: +30 días)
// - Installment 3: $200,000 (dueDate: +60 días)
```

---

## Ver También

- [Payment Model](../01-data-model/payment-systems.md#payment-pagos) - Detalle del modelo
- [PaymentAllocation](../01-data-model/payment-systems.md#paymentallocation-asignaciones) - Tabla intermedia
- [Payments API](../06-apis/payments-api.md) - Endpoints completos
- [Payment to Customer Flow](payment-to-customer.md) - Flujo 1:N alternativo
- [Installments Flow](installments.md) - Gestión de cuotas

---

**Última actualización:** 2025-10-30
