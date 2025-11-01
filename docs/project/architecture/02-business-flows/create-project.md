# Flujo: Crear Proyecto

Flujo completo desde la selección del cliente hasta la persistencia del proyecto en base de datos.

---

## Diagrama del Flujo

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Usuario abre formulario de nuevo proyecto                   │
│    ↓                                                            │
│    components/dialogs/projects/new-project-dialog.tsx          │
│    └── components/forms/projects/project-form.tsx              │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 2. Selecciona/Crea Cliente                                     │
│    ↓                                                            │
│    Combobox de clientes:                                       │
│    - Si existe → Seleccionar                                   │
│    - Si NO existe → Crear inline (name, phone, email?)         │
│    ↓                                                            │
│    Derivaciones automáticas:                                   │
│    - currency ← pais (CLP para Chile)                          │
│    - locale ← pais (es-CL para Chile)                          │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 3. Completa Datos del Proyecto                                 │
│    ↓                                                            │
│    Datos básicos:                                              │
│    - projectName (opcional)                                    │
│    - phone (obligatorio, E.164)                                │
│    - projectStatusId (combobox de estados activos)             │
│    - date (default: hoy)                                       │
│    ↓                                                            │
│    Dirección (validada con ConfigurationContext):             │
│    - region (combobox)                                         │
│    - comuna (combobox filtrado por region)                     │
│    - street (input)                                            │
│    - apartment (opcional)                                      │
│    ↓                                                            │
│    Cantidades:                                                 │
│    - windowsCount (número entero)                              │
│    - squareMeters (decimal 10,2)                               │
│    ↓                                                            │
│    Montos:                                                     │
│    - subtotal (Decimal 12,2, ingreso manual)                   │
│    - taxRate (Decimal 5,2, default: 19%)                       │
│    - description (texto opcional)                              │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 4. Sistema Calcula Total Automáticamente                       │
│    ↓                                                            │
│    ANTES de submit (en el form):                               │
│    ↓                                                            │
│    const tax = subtotal * (taxRate / 100)                      │
│    const total = subtotal + tax                                │
│    ↓                                                            │
│    Valores calculados:                                         │
│    - total: Decimal(12,2)                                      │
│    - totalAmount: Decimal(12,2) (redundante = total)           │
│    ↓                                                            │
│    Ejemplo:                                                    │
│    subtotal = 1,000,000                                        │
│    taxRate = 19%                                               │
│    tax = 190,000                                               │
│    total = 1,190,000 ✅                                        │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 5. Validación Frontend (Zod)                                   │
│    ↓                                                            │
│    lib/validations/project-validations.ts                      │
│    ↓                                                            │
│    Validaciones:                                               │
│    ✅ customerId: UUID válido                                  │
│    ✅ phone: String, min 1 char                                │
│    ✅ street, comuna, region: Strings obligatorios             │
│    ✅ subtotal, taxRate, total: Decimals positivos             │
│    ✅ windowsCount: Int >= 0                                   │
│    ✅ squareMeters: Decimal >= 0                               │
│    ✅ currency: String válido (ej: "CLP")                      │
│    ↓                                                            │
│    Si validación falla → Mostrar errores en form               │
│    Si validación pasa → Continuar a API                        │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 6. POST /api/projects (Backend)                                │
│    ↓                                                            │
│    app/api/projects/route.ts                                   │
│    ↓                                                            │
│    A. Generar projectNumber automático:                        │
│       ↓                                                         │
│       const currentYear = new Date().getFullYear()             │
│       ↓                                                         │
│       // Buscar último proyecto del año                        │
│       const lastProject = await prisma.project.findFirst({     │
│         where: { projectNumber: { startsWith: `P ` } },        │
│         orderBy: { projectNumber: 'desc' }                     │
│       })                                                        │
│       ↓                                                         │
│       // Calcular siguiente secuencia                          │
│       const nextSeq = lastProject                              │
│         ? parseInt(lastProject.projectNumber.split('-')[0]     │
│             .replace('P ', '')) + 1                            │
│         : 1                                                    │
│       ↓                                                         │
│       // Formato: P 0001-2025                                  │
│       const projectNumber =                                    │
│         `P ${nextSeq.toString().padStart(4, '0')}-${year}`     │
│       ↓                                                         │
│       Ejemplos:                                                │
│       - Primer proyecto 2025: "P 0001-2025"                    │
│       - Segundo proyecto 2025: "P 0002-2025"                   │
│       - Proyecto 9999: "P 9999-2025"                           │
│       - Proyecto 10000: "P 10000-2025" (5 dígitos)            │
│    ↓                                                            │
│    B. Validación Backend (Zod):                                │
│       ↓                                                         │
│       const validated = projectSchema.parse(body)              │
│       ↓                                                         │
│       Re-validar todas las constraints (mismas que frontend)   │
│    ↓                                                            │
│    C. Crear en DB:                                             │
│       ↓                                                         │
│       const project = await prisma.project.create({            │
│         data: {                                                │
│           projectNumber,                                       │
│           projectName,                                         │
│           customerId,                                          │
│           phone,                                               │
│           street, apartment, comuna, region,                   │
│           projectStatusId,                                     │
│           date,                                                │
│           subtotal, taxRate, total, totalAmount,               │
│           windowsCount, squareMeters,                          │
│           description,                                         │
│           currency,                                            │
│         }                                                      │
│       })                                                       │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ 7. Resultado: Proyecto Creado ✅                               │
│    ↓                                                            │
│    Response 201:                                               │
│    {                                                           │
│      id: "uuid",                                               │
│      projectNumber: "P 0001-2025",                             │
│      projectName: "Proyecto Demo",                             │
│      total: 1190000,                                           │
│      balance: 1190000,  // Sin pagos aún                       │
│      ...                                                       │
│    }                                                           │
│    ↓                                                            │
│    UI:                                                         │
│    - Toast success                                             │
│    - Cerrar dialog                                             │
│    - Refresh DataTable                                         │
│    - Navegar a detalle (opcional)                              │
└────────────────────────────────────────────────────────────────┘
```

---

## Validaciones Clave

### 1. Validación de Cliente

```typescript
// ✅ Cliente debe existir
const customer = await prisma.customer.findUnique({
  where: { id: customerId },
})

if (!customer) {
  return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
}
```

### 2. Validación de ProjectStatus

```typescript
// ✅ Estado debe existir y estar activo
if (projectStatusId) {
  const status = await prisma.projectStatus.findUnique({
    where: { id: projectStatusId },
  })

  if (!status || !status.isActive) {
    return NextResponse.json({ error: 'Estado no válido o inactivo' }, { status: 400 })
  }
}
```

### 3. Validación de Montos

```typescript
// Zod schema
export const projectSchema = z.object({
  subtotal: z.coerce.number().positive('Subtotal debe ser positivo'),
  taxRate: z.coerce
    .number()
    .min(0, 'Tasa de impuesto no puede ser negativa')
    .max(100, 'Tasa de impuesto no puede exceder 100%'),
  total: z.coerce.number().positive('Total debe ser positivo'),
})
```

### 4. Validación de Dirección

```typescript
// Validación con ConfigurationContext
const { region, comuna } = useConfiguration()

// Combobox region:
// - Opciones: PAISES_CONFIG.CL.regiones

// Combobox comuna:
// - Filtrado por region seleccionada
// - Opciones: PAISES_CONFIG.CL.regiones[selectedRegion].comunas
```

---

## Componentes Involucrados

### 1. Dialog Container

```typescript
// components/dialogs/projects/new-project-dialog.tsx
export function NewProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
        </DialogHeader>
        <ProjectForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
```

### 2. Form Component

```typescript
// components/forms/projects/project-form.tsx
export function ProjectForm({ onSuccess, defaultValues }: ProjectFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  })

  async function onSubmit(data: ProjectFormValues) {
    // Calcular total antes de submit
    const calculatedTotal = data.subtotal + (data.subtotal * (data.taxRate / 100))

    const projectData = {
      ...data,
      total: calculatedTotal,
      totalAmount: calculatedTotal,
    }

    // POST /api/projects
    const response = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    })

    if (response.ok) {
      toast.success('Proyecto creado exitosamente')
      onSuccess?.()
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Campos del form */}
      </form>
    </Form>
  )
}
```

### 3. API Route

```typescript
// app/api/projects/route.ts
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()

  // Generar projectNumber
  const projectNumber = await generateProjectNumber()

  logger.info({ projectNumber }, 'Creating project')

  const project = await prisma.project.create({
    data: {
      ...body,
      projectNumber,
    },
    include: {
      customer: { select: { id: true, name: true } },
      projectStatus: {
        select: {
          id: true,
          name: true,
          color: { select: { bgClass: true, textClass: true } },
        },
      },
    },
  })

  logger.info({ projectId: project.id }, 'Project created successfully')

  return NextResponse.json(project, { status: 201 })
})
```

---

## Business Logic

### Generación de ProjectNumber

```typescript
// Dentro de POST /api/projects/route.ts
async function generateProjectNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()

  const lastProject = await prisma.project.findFirst({
    where: {
      projectNumber: {
        startsWith: 'P ',
      },
    },
    orderBy: {
      projectNumber: 'desc',
    },
  })

  let nextSequence = 1

  if (lastProject) {
    const parts = lastProject.projectNumber.split('-')
    const lastSequence = parseInt(parts[0].replace('P ', ''))
    nextSequence = lastSequence + 1
  }

  return `P ${nextSequence.toString().padStart(4, '0')}-${currentYear}`
}
```

**Features:**

- ✅ Secuencia auto-incremental por año
- ✅ Formato consistente: "P 0001-YYYY"
- ✅ Padding con ceros (4 dígitos mínimo)
- ✅ Soporta más de 9999 proyectos (5, 6, N dígitos)

### Cálculo de Total

```typescript
// En el frontend (antes de submit)
const subtotal = Number(formData.subtotal)
const taxRate = Number(formData.taxRate)

const tax = subtotal * (taxRate / 100)
const total = subtotal + tax

// Redondear a 2 decimales
const roundedTotal = Math.round(total * 100) / 100
```

**Ejemplo:**

```
Subtotal: 1,000,000
Tax Rate: 19%
Tax: 190,000
Total: 1,190,000 ✅
```

---

## Estados Iniciales

### Proyecto Recién Creado

```typescript
{
  id: "uuid",
  projectNumber: "P 0001-2025",
  customerId: "customer-uuid",
  projectStatusId: "status-uuid-inicial",
  total: 1190000,
  balance: 1190000,  // Sin pagos aún
  paymentAllocations: [],
  createdAt: "2025-10-30T12:00:00Z",
}
```

**Balance inicial:**

```
balance = total - SUM(allocations.allocatedAmount)
balance = 1,190,000 - 0 = 1,190,000 ✅
```

---

## Ver También

- [Project Model](../01-data-model/customer-project-systems.md#project-proyectos) - Detalle del modelo
- [Projects API](../06-apis/projects-api.md) - Endpoints completos
- [Validaciones](../../../../lib/validations/project-validations.ts) - Zod schemas
- [Payment Flow](payment-to-project.md) - Siguiente paso: registrar pagos

---

**Última actualización:** 2025-10-30
