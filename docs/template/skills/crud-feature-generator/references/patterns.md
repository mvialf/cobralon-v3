# CRUD Feature Patterns - SaaS Template

Este documento contiene los patrones exactos usados en el SaaS Template para features CRUD completos.

## Arquitectura CRUD Completa

Un feature CRUD completo en este template sigue esta estructura de 7 archivos:

```
1. Prisma Schema      → prisma/schema.prisma (model Entity)
2. Zod Validation     → lib/validations/entity-validations.ts
3. Form Component     → components/forms/entity/entity-form.tsx
4. Dialog Component   → components/dialogs/entity/new-entity-dialog.tsx
5. API Routes         → app/api/entities/route.ts
6. DataTable Columns  → app/entities/columns.tsx
7. Page Component     → app/entities/page.tsx
```

---

## 1. Prisma Schema Pattern

**Ubicación:** `prisma/schema.prisma`

```prisma
model Entity {
  id        String   @id @default(cuid())
  field1    String
  field2    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations (si aplica)
  relationEntity   RelationEntity? @relation(fields: [relationEntityId], references: [id])
  relationEntityId String?

  @@index([field1])
}
```

**Después de agregar:** Correr `npm run db:generate && npm run db:push`

---

## 2. Zod Validation Pattern

**Ubicación:** `lib/validations/entity-validations.ts`

```typescript
import { z } from 'zod'

/**
 * Schema de validación para entity
 */
export const entitySchema = z.object({
  field1: z.string().min(2, 'El field1 debe tener al menos 2 caracteres'),
  field2: z.string().min(1, 'El field2 es requerido'),
  field3: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
})

export type EntityFormData = z.infer<typeof entitySchema>
```

**Características:**

- Campos obligatorios: `.min(1, 'mensaje')`
- Campos opcionales: `.optional().or(z.literal(''))`
- Validaciones custom: `.email()`, `.url()`, `.regex()`
- Mensajes de error en español
- Type inference con `z.infer<typeof schema>`

---

## 3. Form Component Pattern

**Ubicación:** `components/forms/entity/entity-form.tsx`

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { entitySchema, type EntityFormData } from '@/lib/validations/entity-validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRoot,
} from '@/components/ui/form'

interface EntityFormProps {
  onSubmit: (data: EntityFormData) => void
  defaultValues?: Partial<EntityFormData>
  submitLabel?: string
}

export function EntityForm({
  onSubmit,
  defaultValues,
  submitLabel = 'Guardar',
}: EntityFormProps) {
  const form = useForm<EntityFormData>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      field1: defaultValues?.field1 || '',
      field2: defaultValues?.field2 || '',
    },
  })

  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(onSubmit)}>
        {/* Field 1 */}
        <FormField
          control={form.control}
          name="field1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field 1</FormLabel>
              <FormControl>
                <Input placeholder="Placeholder" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Field 2 */}
        <FormField
          control={form.control}
          name="field2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Field 2</FormLabel>
              <FormControl>
                <Input placeholder="Placeholder" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {submitLabel}
        </Button>
      </FormRoot>
    </Form>
  )
}
```

**Componentes de Input Disponibles:**

- `<Input />` - Text input básico
- `<PhoneInput />` - Teléfono (de `@/components/ui/phone-input`)
- `<Textarea />` - Texto largo
- `<Select />` - Dropdown
- `<Checkbox />` - Checkbox
- `<Combobox />` - Autocomplete

---

## 4. Dialog Component Pattern

**Ubicación:** `components/dialogs/entity/new-entity-dialog.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { EntityForm } from '@/components/forms/entity/entity-form'
import { type EntityFormData } from '@/lib/validations/entity-validations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface NewEntityDialogProps {
  onEntityCreated?: (entity: EntityFormData) => void
}

export function NewEntityDialog({ onEntityCreated }: NewEntityDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSubmit = (data: EntityFormData) => {
    console.log('Nuevo entity:', data)

    // Aqui iria la llamada a tu API
    // await fetch('/api/entities', { method: 'POST', body: JSON.stringify(data) })

    onEntityCreated?.(data)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Entity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Entity</DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo entity. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <EntityForm onSubmit={handleSubmit} submitLabel="Crear Entity" />
      </DialogContent>
    </Dialog>
  )
}
```

**Iconos disponibles (lucide-react):**

- `Plus` - Crear
- `Pencil` - Editar
- `Trash2` - Eliminar
- `Eye` - Ver
- `DollarSign` - Pago
- Ver más: https://lucide.dev/icons/

---

## 5. API Routes Pattern

**Ubicación:** `app/api/entities/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withLogging } from '@/lib/logger-middleware'

/**
 * GET /api/entities
 *
 * Obtiene lista de entities con paginación opcional
 *
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: registros por página (default: 10, max: 100)
 *   - search: buscar por campo
 */
export const GET = withLogging(async (request, logger) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
  const search = searchParams.get('search') || ''

  logger.debug(
    {
      page,
      limit,
      search: search || undefined,
    },
    'Fetching entities with filters'
  )

  const skip = (page - 1) * limit

  try {
    // Construir filtro de búsqueda
    const where = search
      ? {
          OR: [
            { field1: { contains: search, mode: 'insensitive' as const } },
            { field2: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    // Obtener entities y total count
    const [entities, total] = await Promise.all([
      prisma.entity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.entity.count({ where }),
    ])

    logger.info(
      {
        found: entities.length,
        total,
        page,
      },
      'Entities fetched successfully'
    )

    return NextResponse.json({
      entities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching entities')
    return NextResponse.json({ error: 'Error al obtener entities' }, { status: 500 })
  }
})

/**
 * POST /api/entities
 *
 * Crea un nuevo entity
 *
 * Body:
 *   - field1: string (requerido)
 *   - field2: string (requerido)
 */
export const POST = withLogging(async (request, logger) => {
  const body = await request.json()
  const { field1, field2 } = body

  // Child logger con contexto de negocio
  const entityLogger = logger.child({
    field1,
    field2,
  })

  entityLogger.info('Entity creation requested')

  try {
    // Validación básica
    entityLogger.debug('Starting validations')

    if (!field1 || typeof field1 !== 'string' || field1.trim().length === 0) {
      entityLogger.warn('Missing or invalid field1')
      return NextResponse.json({ error: 'El field1 es requerido' }, { status: 400 })
    }

    if (!field2 || typeof field2 !== 'string' || field2.trim().length === 0) {
      entityLogger.warn('Missing or invalid field2')
      return NextResponse.json({ error: 'El field2 es requerido' }, { status: 400 })
    }

    entityLogger.debug('Validations passed')

    // Crear entity
    entityLogger.info('Creating entity in database')
    const entity = await prisma.entity.create({
      data: {
        field1: field1.trim(),
        field2: field2.trim(),
      },
    })

    entityLogger.info(
      {
        entityId: entity.id,
      },
      'Entity created successfully'
    )

    return NextResponse.json(entity, { status: 201 })
  } catch (error) {
    entityLogger.error({ err: error }, 'Error creating entity')
    return NextResponse.json({ error: 'Error al crear entity' }, { status: 500 })
  }
})
```

**Features:**

- `withLogging` middleware para logging estructurado
- Paginación estandarizada (page, limit, totalPages)
- Search con OR conditions
- Child logger con contexto
- Error handling consistente
- HTTP status codes correctos (200, 201, 400, 409, 500)

---

## 6. DataTable Columns Pattern

**Ubicación:** `app/entities/columns.tsx`

```typescript
'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { DataTableDropdown, DataTableColumnHeader } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export interface Entity {
  id: string
  field1: string
  field2: string
  createdAt: Date
}

export const columns: ColumnDef<Entity>[] = [
  {
    accessorKey: 'field1',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Field 1" />,
    enableSorting: true,
  },
  {
    accessorKey: 'field2',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Field 2" />,
    enableSorting: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DataTableDropdown>
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DataTableDropdown>
    ),
  },
]
```

**Características:**

- Type interface exportado
- Sortable headers con `DataTableColumnHeader`
- Actions dropdown con iconos
- Separadores para agrupar acciones
- Clase `text-destructive` para acciones peligrosas

---

## 7. Page Component Pattern

**Ubicación:** `app/entities/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { NewEntityDialog } from '@/components/dialogs/entity/new-entity-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { columns, type Entity } from './columns'
import { type EntityFormData } from '@/lib/validations/entity-validations'

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar entities desde la API
  useEffect(() => {
    fetchEntities()
  }, [])

  const fetchEntities = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/entities')
      if (!response.ok) throw new Error('Error al cargar entities')

      const data = await response.json()
      setEntities(data.entities)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEntityCreated = async (data: EntityFormData) => {
    try {
      const response = await fetch('/api/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear entity')
      }

      const newEntity = await response.json()
      setEntities((prev) => [newEntity, ...prev])
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  return (
    <AppLayout
      pageTitle="Entities"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Entities' }]}
      action={<NewEntityDialog onEntityCreated={handleEntityCreated} />}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando entities...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={entities}
            searchKey="field1"
            searchPlaceholder="Buscar entity..."
          />
        )}
      </div>
    </AppLayout>
  )
}
```

**Características:**

- Client Component (`'use client'`)
- useState para entities + isLoading
- useEffect para fetch inicial
- fetchEntities function reutilizable
- handleEntityCreated actualiza estado optimísticamente
- AppLayout con action slot (botón Nuevo)
- DataTable con loading state
- Error handling en console

---

## Field Type Reference

### Text Field (String)

**Zod:** `z.string().min(2, 'Mínimo 2 caracteres')`
**Form:**

```tsx
<Input placeholder="Placeholder" {...field} />
```

### Email Field

**Zod:** `z.string().email('Email inválido').optional().or(z.literal(''))`
**Form:**

```tsx
<Input type="email" placeholder="correo@ejemplo.com" {...field} />
```

### Phone Field

**Zod:** `z.string().min(1, 'El teléfono es requerido')`
**Form:**

```tsx
import { PhoneInput } from '@/components/ui/phone-input'
;<PhoneInput {...field} />
```

### Number Field

**Zod:** `z.number().positive('Debe ser positivo')`
**Form:**

```tsx
<Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
```

### Currency Field

**Zod:** `z.number().positive('Debe ser positivo')`
**Form:**

```tsx
import { CurrencyInput } from '@/components/ui/currency-input'
;<CurrencyInput {...field} />
```

### Long Text (Textarea)

**Zod:** `z.string().min(10, 'Mínimo 10 caracteres')`
**Form:**

```tsx
import { Textarea } from '@/components/ui/textarea'
;<Textarea placeholder="Descripción..." {...field} />
```

### Boolean (Checkbox)

**Zod:** `z.boolean().default(false)`
**Form:**

```tsx
import { Checkbox } from '@/components/ui/checkbox'
;<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Label</FormLabel>
      </div>
    </FormItem>
  )}
/>
```

---

## Checklist Después de Generar CRUD

Después de generar todos los archivos:

1. ✅ Actualizar Prisma:

   ```bash
   npm run db:generate
   npm run db:push
   ```

2. ✅ Agregar ruta al sidebar (opcional):

   ```typescript
   // components/layout/app-sidebar.tsx
   {
     title: 'Entities',
     href: '/entities',
     icon: Package, // o el icono apropiado
   }
   ```

3. ✅ Verificar TypeScript:

   ```bash
   npm run typecheck
   ```

4. ✅ Verificar ESLint:

   ```bash
   npm run lint
   ```

5. ✅ Probar feature:
   - Navegar a /entities
   - Crear nuevo entity
   - Verificar que aparezca en la tabla
   - Probar search
   - Probar sorting
