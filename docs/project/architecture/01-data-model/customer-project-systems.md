# Customer & Project Systems

Documentación detallada de los sistemas de Clientes y Proyectos, incluyendo estados configurables.

---

## Customer (Clientes)

### Modelo

```typescript
model Customer {
  id        String   @id @default(uuid())
  name      String
  phone     String
  email     String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  projects  Project[]
  payments  Payment[]
}
```

### Campos

| Campo       | Tipo       | Obligatorio | Descripción                          |
| ----------- | ---------- | ----------- | ------------------------------------ |
| `id`        | UUID       | ✅          | Primary key                          |
| `name`      | String     | ✅          | Nombre del cliente                   |
| `phone`     | String     | ✅          | Teléfono (validado con E.164)        |
| `email`     | String     | ❌          | Email (opcional, único si se provee) |
| `createdAt` | DateTime   | ✅          | Fecha de creación (automática)       |
| `updatedAt` | DateTime   | ✅          | Última actualización (automática)    |

### Relaciones

- **1:N con Project** - Un cliente puede tener múltiples proyectos
  - `onDelete: CASCADE` - Eliminar cliente elimina sus proyectos
- **1:N con Payment** - Un cliente puede tener múltiples pagos
  - `onDelete: (default)` - Preservar historial de pagos

### Validaciones

**Frontend + Backend (Zod):**

```typescript
// lib/validations/customer-validations.ts
export const customerSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  phone: z.string().min(1, 'Teléfono requerido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})
```

### Componentes

- **Form**: `components/forms/customer/customer-form.tsx`
- **Dialog**: `components/dialogs/customers/new-customer-dialog.tsx`
- **DataTable**: `app/customers/page.tsx`
- **Columns**: `app/customers/columns.tsx`

---

## Project (Proyectos)

### Modelo

```typescript
model Project {
  id                   String         @id @default(uuid())
  projectNumber        String         @unique
  projectName          String?
  customerId           String
  phone                String
  street               String
  apartment            String?
  comuna               String
  region               String
  projectStatusId      String?
  projectStatusLegacy  String         @default("")
  date                 DateTime
  subtotal             Decimal        @db.Decimal(12, 2)
  taxRate              Decimal        @db.Decimal(5, 2) @default(19)
  total                Decimal        @db.Decimal(12, 2)
  windowsCount         Int
  squareMeters         Decimal        @db.Decimal(10, 2)
  description          String?
  currency             String         @default("CLP")
  totalAmount          Decimal?       @db.Decimal(12, 2)
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt

  // Relationships
  customer             Customer           @relation(fields: [customerId], references: [id], onDelete: Cascade)
  projectStatus        ProjectStatus?     @relation(fields: [projectStatusId], references: [id], onDelete: Restrict)
  paymentAllocations   PaymentAllocation[]

  // Indexes
  @@index([customerId])
  @@index([projectNumber])
  @@index([projectStatusId])
  @@index([date])
  @@index([customerId, projectStatusId])
  @@index([projectStatusId, date(sort: Desc)])
}
```

### Campos Principales

| Campo           | Tipo          | Obligatorio | Descripción                                      |
| --------------- | ------------- | ----------- | ------------------------------------------------ |
| `projectNumber` | String        | ✅          | Formato: "P 0001-2025" (autogenerado, único)     |
| `projectName`   | String        | ❌          | Nombre descriptivo del proyecto                  |
| `customerId`    | UUID (FK)     | ✅          | Referencia a Customer                            |
| `phone`         | String        | ✅          | Teléfono de contacto del proyecto                |
| `subtotal`      | Decimal(12,2) | ✅          | Monto antes de impuestos                         |
| `taxRate`       | Decimal(5,2)  | ✅          | Tasa de impuesto (default: 19%)                  |
| `total`         | Decimal(12,2) | ✅          | subtotal + (subtotal \* taxRate%)                |
| `totalAmount`   | Decimal(12,2) | ❌          | Redundante con `total` (razones legacy)          |
| `windowsCount`  | Int           | ✅          | Cantidad de ventanas                             |
| `squareMeters`  | Decimal(10,2) | ✅          | Metros cuadrados                                 |
| `currency`      | String        | ✅          | Moneda (default: "CLP")                          |

### Campos de Dirección

| Campo       | Tipo   | Obligatorio | Descripción                     |
| ----------- | ------ | ----------- | ------------------------------- |
| `street`    | String | ✅          | Calle y número                  |
| `apartment` | String | ❌          | Departamento/oficina            |
| `comuna`    | String | ✅          | Comuna (validado con config)    |
| `region`    | String | ✅          | Región (validado con config)    |

### Campos de Estado

| Campo                 | Tipo      | Obligatorio | Descripción                              |
| --------------------- | --------- | ----------- | ---------------------------------------- |
| `projectStatusId`     | UUID (FK) | ❌          | FK a ProjectStatus (nuevo sistema)       |
| `projectStatusLegacy` | String    | ✅          | Campo legacy (default: ""), deprecar     |

**Migración gradual:**
- Proyectos nuevos: `projectStatusId` (FK) + `projectStatusLegacy = ""`
- Proyectos legacy: `projectStatusId = null` + `projectStatusLegacy` (String)

### Cálculos Automáticos

**En el form antes de submit:**

```typescript
// components/forms/projects/project-form.tsx
const calculatedTotal = subtotal + (subtotal * (taxRate / 100))
const projectData = {
  ...formData,
  total: calculatedTotal,
  totalAmount: calculatedTotal, // Redundante, pero necesario por legacy
}
```

**ProjectNumber autogenerado:**

```typescript
// app/api/projects/route.ts (POST)
const currentYear = new Date().getFullYear()
const lastProject = await prisma.project.findFirst({
  where: { projectNumber: { startsWith: `P ` } },
  orderBy: { projectNumber: 'desc' },
})

const nextSequence = lastProject ? parseInt(lastProject.projectNumber.split('-')[0].replace('P ', '')) + 1 : 1
const projectNumber = `P ${nextSequence.toString().padStart(4, '0')}-${currentYear}`
```

### Relaciones

- **N:1 con Customer** (FK `customerId`)
  - `onDelete: CASCADE` - Eliminar cliente elimina proyectos
- **N:1 con ProjectStatus** (FK `projectStatusId`)
  - `onDelete: RESTRICT` - No eliminar estado si hay proyectos usándolo
- **1:N con PaymentAllocation** - Un proyecto puede tener múltiples asignaciones de pagos

### Índices

| Índice                              | Tipo       | Propósito                                |
| ----------------------------------- | ---------- | ---------------------------------------- |
| `[customerId]`                      | Simple     | Queries por cliente                      |
| `[projectNumber]`                   | Simple     | Búsqueda rápida por número               |
| `[projectStatusId]`                 | Simple     | Filtrar por estado                       |
| `[date]`                            | Simple     | Ordenar por fecha                        |
| `[customerId, projectStatusId]`     | Compuesto  | Filtros combinados                       |
| `[projectStatusId, date DESC]`      | Compuesto  | Proyectos recientes por estado           |

### Balance Calculado

**Fórmula:**

```typescript
balance = project.total - SUM(paymentAllocations.allocatedAmount)
```

**Implementación:**

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

**Future optimization (Phase 2):**
- Denormalizar: agregar campo `balance` en Project
- Actualizar vía triggers o application logic
- Índice: `[balance, customerId]`

### Componentes

- **Form**: `components/forms/projects/project-form.tsx`
- **Dialog**: `components/dialogs/projects/new-project-dialog.tsx`
- **DataTable**: `app/projects/page.tsx`
- **Columns**: `app/projects/columns.tsx`
- **Detail**: `app/projects/[id]/page.tsx`

---

## ProjectStatus (Estados de Proyecto)

### Modelo

```typescript
model ProjectStatus {
  id        String   @id @default(uuid())
  name      String   @unique
  order     Int
  colorId   String
  isInitial Boolean  @default(false)
  isFinal   Boolean  @default(false)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  color     BadgeColor @relation(fields: [colorId], references: [id])
  projects  Project[]

  @@index([order])
}
```

### Campos

| Campo       | Tipo      | Obligatorio | Descripción                                       |
| ----------- | --------- | ----------- | ------------------------------------------------- |
| `name`      | String    | ✅          | Nombre del estado (ej: "En Proceso"), único       |
| `order`     | Int       | ✅          | Orden para drag & drop                            |
| `colorId`   | UUID (FK) | ✅          | Referencia a BadgeColor                           |
| `isInitial` | Boolean   | ✅          | Estado inicial por defecto (default: false)       |
| `isFinal`   | Boolean   | ✅          | Estado final (default: false)                     |
| `isActive`  | Boolean   | ✅          | Estado activo/visible (default: true)             |

### Features

1. **Configurable desde UI** (`app/settings/project-status/page.tsx`)
2. **Drag & Drop** para reordenar (actualiza campo `order`)
3. **7 colores predefinidos** vía BadgeColor
4. **Flags especiales:**
   - `isInitial`: Estado por defecto para proyectos nuevos
   - `isFinal`: Estado que marca proyecto como completado
   - `isActive`: Ocultar sin eliminar (soft delete)

### CRUD Completo

```
POST   /api/project-status        → Crear estado
GET    /api/project-status        → Listar (ordenado por `order`)
PUT    /api/project-status/[id]   → Actualizar
DELETE /api/project-status/[id]   → Eliminar (RESTRICT si hay proyectos)
POST   /api/project-status/reorder → Batch update de `order`
```

### Componentes

- **Page**: `app/settings/project-status/page.tsx`
- **Form**: `components/forms/settings/project-status-form.tsx`
- **Dialog**: `components/dialogs/settings/project-status-dialog.tsx`
- **Sortable**: `components/settings/sortable-status-item.tsx` (@dnd-kit)

---

## BadgeColor (Colores de Badges)

### Modelo

```typescript
model BadgeColor {
  id        String   @id @default(uuid())
  name      String   @unique
  key       String   @unique
  bgClass   String
  textClass String   @default("text-white")
  order     Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relationships
  projectStatuses ProjectStatus[]

  @@index([order])
}
```

### Colores Predefinidos (7)

| Name     | Key     | bgClass          | textClass   |
| -------- | ------- | ---------------- | ----------- |
| Azul     | blue    | bg-blue-500      | text-white  |
| Verde    | green   | bg-green-500     | text-white  |
| Amarillo | yellow  | bg-yellow-500    | text-black  |
| Rojo     | red     | bg-red-500       | text-white  |
| Morado   | purple  | bg-purple-500    | text-white  |
| Naranja  | orange  | bg-orange-500    | text-white  |
| Gris     | gray    | bg-gray-500      | text-white  |

### Seedeado Inicial

```typescript
// prisma/seed.ts
const badgeColors = [
  { name: 'Azul', key: 'blue', bgClass: 'bg-blue-500', textClass: 'text-white', order: 1 },
  { name: 'Verde', key: 'green', bgClass: 'bg-green-500', textClass: 'text-white', order: 2 },
  // ... 5 más
]

await prisma.badgeColor.createMany({ data: badgeColors })
```

### Uso

```typescript
// components/ui/badge.tsx (custom variant)
<Badge className={cn(projectStatus.color.bgClass, projectStatus.color.textClass)}>
  {projectStatus.name}
</Badge>
```

---

## Ver También

- [ER Diagram](er-diagram.md) - Diagrama completo con relaciones
- [Payment Systems](payment-systems.md) - Sistema de pagos y asignaciones
- [Relationships](relationships.md) - Tabla de relaciones con políticas onDelete
- [APIs - Projects](../06-apis/projects-api.md) - Endpoints de proyectos
- [APIs - Customers](../06-apis/customers-api.md) - Endpoints de clientes

---

**Última actualización:** 2025-10-30
