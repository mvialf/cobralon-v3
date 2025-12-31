---
name: cobralon-crud-generator
description: |
  Genera features CRUD completas siguiendo los patrones establecidos en Cobralon.

  USAR CUANDO: necesitas crear una nueva entidad, generar CRUD, crear formulario con validación, o agregar nueva feature con tabla + formulario + API.

  Genera 7 archivos siguiendo la arquitectura del proyecto.
---

# CRUD Generator para Cobralon

## Archivos a Generar (7 total)

Para una entidad llamada `EntityName` (ej: `Product`, `Category`):

### 1. Schema de Validación Zod

**Archivo:** `lib/validations/entity-name-validations.ts`

**Referencia:** `lib/validations/project-validations.ts`

```typescript
import { z } from 'zod'

// Schema base (campos de entrada)
const entityNameBaseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  // ... más campos
})

// Schema para crear (puede tener defaults)
export const createEntityNameSchema = entityNameBaseSchema

// Schema para actualizar (todo opcional excepto id)
export const updateEntityNameSchema = entityNameBaseSchema.partial().extend({
  id: z.string().min(1),
})

// Tipos inferidos
export type CreateEntityNameInput = z.infer<typeof createEntityNameSchema>
export type UpdateEntityNameInput = z.infer<typeof updateEntityNameSchema>
```

### 2. Componente Form

**Archivo:** `components/forms/entity-name/entity-name-form.tsx`

**Referencia:** `components/forms/projects/project-form.tsx`

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEntityNameSchema, type CreateEntityNameInput } from '@/lib/validations/entity-name-validations'

interface EntityNameFormProps {
  defaultValues?: Partial<CreateEntityNameInput>
  onSubmit: (data: CreateEntityNameInput) => Promise<void>
  isLoading?: boolean
}

export function EntityNameForm({ defaultValues, onSubmit, isLoading }: EntityNameFormProps) {
  const form = useForm<CreateEntityNameInput>({
    resolver: zodResolver(createEntityNameSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* FormFields aquí */}
      </form>
    </Form>
  )
}
```

### 3. Dialog Wrapper

**Archivo:** `components/dialogs/entity-name/entity-name-dialog.tsx`

**Referencia:** `components/dialogs/projects/project-dialog.tsx`

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EntityNameForm } from '@/components/forms/entity-name/entity-name-form'

interface EntityNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName?: EntityNameType // Para edición
  onSuccess?: () => void
}

export function EntityNameDialog({ open, onOpenChange, entityName, onSuccess }: EntityNameDialogProps) {
  // Lógica de submit (POST o PUT según si existe entityName)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entityName ? 'Editar' : 'Crear'} EntityName</DialogTitle>
        </DialogHeader>
        <EntityNameForm ... />
      </DialogContent>
    </Dialog>
  )
}
```

### 4. API Route GET + POST

**Archivo:** `app/api/entity-names/route.ts`

**Referencia:** `app/api/projects/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createEntityNameSchema } from '@/lib/validations/entity-name-validations'

// GET /api/entity-names
export async function GET() {
  const items = await prisma.entityName.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

// POST /api/entity-names
export async function POST(request: Request) {
  const body = await request.json()
  const validated = createEntityNameSchema.parse(body)

  const created = await prisma.entityName.create({
    data: validated,
  })

  return NextResponse.json(created, { status: 201 })
}
```

### 5. API Route GET/PUT/DELETE por ID

**Archivo:** `app/api/entity-names/[id]/route.ts`

**Referencia:** `app/api/projects/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/entity-names/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const item = await prisma.entityName.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

// PUT /api/entity-names/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const updated = await prisma.entityName.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(updated)
}

// DELETE /api/entity-names/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.entityName.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
```

### 6. Table Columns

**Archivo:** `app/entity-names/columns.tsx`

**Referencia:** `app/projects/columns.tsx`

```typescript
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/custom/data-table/column-header'
import { DataTableRowActions } from '@/components/custom/data-table/row-actions'

export const columns: ColumnDef<EntityNameType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
  },
  // ... más columnas
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
```

### 7. Page

**Archivo:** `app/entity-names/page.tsx`

**Referencia:** `app/projects/page.tsx`

```typescript
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/custom/data-table/data-table'
import { columns } from './columns'
import { prisma } from '@/lib/prisma'

export default async function EntityNamesPage() {
  const items = await prisma.entityName.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AppLayout
      pageTitle="Entity Names"
      pageDescription="Gestión de entity names"
    >
      <DataTable columns={columns} data={items} />
    </AppLayout>
  )
}
```

## Naming Conventions

| Concepto | Formato | Ejemplo |
|----------|---------|---------|
| Entidad Prisma | PascalCase | `ProjectStatus` |
| Archivo validación | kebab-case | `project-status-validations.ts` |
| Carpeta form | kebab-case | `components/forms/project-status/` |
| API route | kebab-case plural | `app/api/project-statuses/` |
| Página | kebab-case plural | `app/project-statuses/page.tsx` |

## Checklist de Calidad

- [ ] Schema Prisma existe (o lo creé con `npm run db:push`)
- [ ] Validación Zod cubre todos los campos requeridos
- [ ] Form usa React Hook Form + zodResolver
- [ ] Dialog maneja estados de loading y error
- [ ] API routes validan input con Zod
- [ ] Columns tienen sorting habilitado
- [ ] Page usa Server Component para fetch
- [ ] Ejecuté `npm run lint && npm run typecheck`

## Agregar al Sidebar (Opcional)

Editar `components/layout/app-sidebar.tsx`:

```typescript
const navigationItems = [
  // ... items existentes
  {
    title: 'Entity Names',
    url: '/entity-names',
    icon: IconName, // de lucide-react
  },
]
```
