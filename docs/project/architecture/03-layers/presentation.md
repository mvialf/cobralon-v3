# Presentation Layer

Capa de presentación construida con Next.js 15 App Router y React 19 Server Components.

---

## Ubicación

```
app/
├── customer/page.tsx         → DataTable Customers
├── projects/page.tsx         → DataTable Projects
├── payments/page.tsx         → DataTable Payments
├── payments/installments/    → DataTable Installments
├── settings/                 → 3 páginas config
└── examples/                 → Demos de componentes
```

---

## Características

### Server Components por Defecto

Todas las páginas son Server Components a menos que requieran interactividad:

```tsx
// app/projects/page.tsx (Server Component)
export default function ProjectsPage() {
  // Fetch data en server
  return <ProjectsDataTable />
}
```

### Client Components Selectivos

Solo componentes con interactividad son Client Components:

```tsx
"use client" // Solo donde se necesita

import { useState } from 'react'

export function InteractiveComponent() {
  const [state, setState] = useState()
  // ...
}
```

---

## Pattern: Page Wrapper

Todas las páginas principales usan `AppLayout`:

```tsx
import { AppLayout } from '@/components/layout/app-layout'

export default function Page() {
  return (
    <AppLayout
      pageTitle="Título"
      pageDescription="Descripción"
      breadcrumbs={[...]}
    >
      {/* Contenido de la página */}
    </AppLayout>
  )
}
```

**Beneficios:**
- ✅ Sidebar automático
- ✅ Header consistente
- ✅ Breadcrumbs integrados
- ✅ Responsive out-of-the-box

---

## Páginas Principales

### 1. Customers (`/customer`)

DataTable con columnas:
- Nombre
- Email
- Teléfono
- Acciones (Ver, Editar, Eliminar)

**Features:**
- Búsqueda por nombre/email/teléfono
- Paginación
- Crear nuevo cliente (dialog)

### 2. Projects (`/projects`)

DataTable con columnas:
- Número proyecto
- Cliente
- Estado (badge con color)
- Fecha
- Total
- Balance pendiente
- Acciones

**Features:**
- Filtros: cliente, estado, rango fechas
- Paginación
- Crear proyecto (dialog)
- Registrar pago (dialog)

### 3. Payments (`/payments`)

DataTable con columnas:
- Fecha
- Cliente
- Monto
- Método de pago
- Tipo (Project/Customer)
- Cuotas
- Acciones

**Features:**
- Filtros: cliente, proyecto, rango fechas
- Paginación
- Ver detalle de asignaciones
- Cancelar pago

### 4. Installments (`/payments/installments`)

Vista global de todas las cuotas:

**Features:**
- Filtros: estado (pending/paid), cliente, rango vencimiento
- Paginación
- Orden por dueDate ASC

### 5. Settings

Tres páginas de configuración:

- `/settings/project-status` - Estados de proyecto (CRUD + drag & drop)
- `/settings/payment-methods` - Métodos de pago (GET + toggle)
- `/settings/badge-colors` - Colores (GET)

---

## Ver También

- [UI Components Layer](ui-components.md) - Componentes reutilizables
- [AppLayout](../../template/components/app-layout.md) - Sistema de layout

**Última actualización:** 2025-10-30
