# Templates CRUD para Cobralon

Templates de código para los 7 archivos que componen una feature CRUD completa. Reemplaza `EntityName` con el nombre real de la entidad (PascalCase) y `entity-name` con kebab-case.

## 1. Schema de Validación Zod

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

## 2. Componente Form

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

## 3. Dialog Wrapper

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

## 4. API Route GET + POST

**Archivo:** `app/api/entity-names/route.ts`

**Referencia:** `app/api/projects/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'
import { withApiHandler } from '@/lib/api-handler'
import { parsePaginationParams, buildPaginationResponse } from '@/lib/utils/pagination'
import {
  createEntityNameSchema,
  type CreateEntityNameInput,
} from '@/lib/validations/entity-name-validations'

// GET /api/entity-names (withLogging para listas)
export const GET = withLogging(async (request, logger) => {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = parsePaginationParams(searchParams)
    const search = searchParams.get('search') || ''

    const whereCondition = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }] }
      : {}

    const [total, items] = await Promise.all([
      prisma.entityName.count({ where: whereCondition }),
      prisma.entityName.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    logger.info({ total, page, limit }, 'EntityNames fetched')
    return NextResponse.json({
      entityNames: items,
      pagination: buildPaginationResponse(page, limit, total),
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entity names')
    return NextResponse.json({ error: 'Error al obtener entity names' }, { status: 500 })
  }
})

// POST /api/entity-names (withApiHandler para body validation + error handling)
export const POST = withApiHandler<CreateEntityNameInput>(
  async (_request, logger, { body }) => {
    const created = await prisma.entityName.create({ data: body })
    logger.info({ entityNameId: created.id }, 'EntityName created')
    return NextResponse.json(created, { status: 201 })
  },
  { bodySchema: createEntityNameSchema, fallbackError: 'Error al crear entity name' }
)
```

## 5. API Route GET/PUT/DELETE por ID

**Archivo:** `app/api/entity-names/[id]/route.ts`

**Referencia:** `app/api/projects/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiHandler, BusinessError } from '@/lib/api-handler'
import {
  updateEntityNameSchema,
  type UpdateEntityNameInput,
} from '@/lib/validations/entity-name-validations'

// GET /api/entity-names/[id]
export const GET = withApiHandler(
  async (_request, logger, { params }) => {
    const item = await prisma.entityName.findUnique({ where: { id: params.id } })
    if (!item) throw new BusinessError('EntityName no encontrado', 404)
    logger.info({ entityNameId: params.id }, 'EntityName fetched')
    return NextResponse.json(item)
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al obtener entity name' }
)

// PUT /api/entity-names/[id]
export const PUT = withApiHandler<UpdateEntityNameInput>(
  async (_request, logger, { params, body }) => {
    const existing = await prisma.entityName.findUnique({ where: { id: params.id } })
    if (!existing) throw new BusinessError('EntityName no encontrado', 404)

    const updated = await prisma.entityName.update({
      where: { id: params.id },
      data: body,
    })
    logger.info({ entityNameId: params.id }, 'EntityName updated')
    return NextResponse.json(updated)
  },
  {
    bodySchema: updateEntityNameSchema,
    validateUuidParams: ['id'],
    fallbackError: 'Error al actualizar entity name',
  }
)

// DELETE /api/entity-names/[id]
export const DELETE = withApiHandler(
  async (_request, logger, { params }) => {
    const existing = await prisma.entityName.findUnique({ where: { id: params.id } })
    if (!existing) throw new BusinessError('EntityName no encontrado', 404)

    await prisma.entityName.delete({ where: { id: params.id } })
    logger.info({ entityNameId: params.id }, 'EntityName deleted')
    return NextResponse.json({ message: 'EntityName eliminado exitosamente' })
  },
  { validateUuidParams: ['id'], fallbackError: 'Error al eliminar entity name' }
)
```

## 6. Table Columns

**Archivo:** `app/entity-names/columns.tsx`

**Referencia:** `app/projects/columns.tsx`

```typescript
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table'

export const columns: ColumnDef<EntityNameType>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
  },
  // ... más columnas
  {
    id: 'actions',
    cell: ({ row }) => <EntityNameActionsCell entityName={row.original} />,
  },
]
```

## 7. Page

**Archivo:** `app/entity-names/page.tsx`

**Referencia:** `app/projects/page.tsx`

```typescript
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/data-table'
import { columns } from './columns'
import { prisma } from '@/lib/db'

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
