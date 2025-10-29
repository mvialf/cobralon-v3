# DataTable - Sistema de Tablas Avanzadas

Sistema completo de tablas de datos con funcionalidades avanzadas construido sobre **TanStack Table v8** y **shadcn/ui**.

## Ubicación

[components/data-table/](../../../components/data-table/) (también en `components/custom/data-table/` en algunos proyectos)

## Features Principales

✅ **Sorting multi-columna** - Ordenamiento por una o más columnas
✅ **Búsqueda global** - Filtrado por texto en columna específica
✅ **Filtros facetados** - Filtros tipo dropdown por categoría
✅ **Visibilidad de columnas** - Ocultar/mostrar columnas dinámicamente
✅ **Paginación** - Navegación por páginas con control de filas
✅ **Row selection** - Selección múltiple de filas con checkbox
✅ **Acciones por fila** - Dropdown menu por cada registro
✅ **Responsive** - Mobile-friendly design
✅ **Type-safe** - TypeScript completo
✅ **Extensible** - Custom cell renderers y filtros

## Archivos del Sistema

El sistema está compuesto por 7 archivos:

```
components/data-table/
├── data-table.tsx                    # Componente principal
├── data-table-toolbar.tsx            # Barra de herramientas (búsqueda, filtros)
├── data-table-pagination.tsx         # Controles de paginación
├── data-table-column-header.tsx      # Headers con sorting
├── data-table-faceted-filter.tsx     # Filtros dropdown
├── data-table-row-actions.tsx        # Menú de acciones por fila
└── index.ts                          # Exports
```

## Uso Básico

### 1. Definir Columnas

Crea un archivo `columns.tsx` con la definición de columnas:

```tsx
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table'

export type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  },
  {
    accessorKey: 'role',
    header: 'Rol',
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
]
```

### 2. Usar DataTable en Página

```tsx
'use client'

import { DataTable } from '@/components/data-table'
import { columns, type User } from './columns'

export default function UsersPage() {
  const data: User[] = [
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      role: 'admin',
    },
    // Más datos...
  ]

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Usuarios</h1>

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Buscar por nombre..."
        filterableColumns={[
          {
            id: 'role',
            title: 'Rol',
            options: [
              { label: 'Admin', value: 'admin' },
              { label: 'Usuario', value: 'user' },
              { label: 'Invitado', value: 'guest' },
            ],
          },
        ]}
      />
    </div>
  )
}
```

## Props del Componente

### `<DataTable>`

| Prop                   | Tipo                      | Default       | Descripción                             |
| ---------------------- | ------------------------- | ------------- | --------------------------------------- |
| `columns`              | `ColumnDef<TData>[]`      | **Required**  | Definición de columnas (TanStack Table) |
| `data`                 | `TData[]`                 | **Required**  | Array de datos a mostrar                |
| `searchKey`            | `string`                  | `""`          | ID de columna para búsqueda global      |
| `searchPlaceholder`    | `string`                  | `"Buscar..."` | Placeholder del input de búsqueda       |
| `filterableColumns`    | `FilterableColumn[]`      | `[]`          | Columnas con filtros facetados          |
| `onRowSelectionChange` | `(rows: TData[]) => void` | `undefined`   | Callback cuando cambia selección        |
| `enableRowSelection`   | `boolean`                 | `false`       | Habilitar selección de filas            |
| `meta`                 | `any`                     | `undefined`   | Metadata adicional para columnas        |

### `FilterableColumn` Interface

```typescript
interface FilterableColumn {
  id: string // ID de la columna
  title: string // Título del filtro
  options: {
    // Opciones del dropdown
    label: string // Texto visible
    value: string // Valor interno
  }[]
}
```

## Casos de Uso Avanzados

### Con Selección de Filas

```tsx
'use client'

import { useState } from 'react'
import { DataTable } from '@/components/data-table'
import { columns, type Product } from './columns'
import { Button } from '@/components/ui/button'

export default function ProductsPage() {
  const [selectedRows, setSelectedRows] = useState<Product[]>([])

  return (
    <div>
      {selectedRows.length > 0 && (
        <Button variant="destructive">Eliminar {selectedRows.length} seleccionados</Button>
      )}

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        enableRowSelection={true}
        onRowSelectionChange={setSelectedRows}
      />
    </div>
  )
}
```

### Con Custom Cell Renderers

```tsx
{
  accessorKey: "price",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Precio" />
  ),
  cell: ({ row }) => {
    const price = row.getValue("price") as number
    const formatted = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(price)
    return <div className="text-right font-medium">{formatted}</div>
  },
}
```

### Con Acciones por Fila

```tsx
import { MoreHorizontal, SquarePen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

{
  id: "actions",
  enableHiding: false,
  cell: ({ row }) => {
    const item = row.original

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleEdit(item)}>
            <SquarePen className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(item)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
}
```

## Dependencias

### NPM Packages

- **@tanstack/react-table** ^8.21.3 - Lógica de tablas headless
- **@radix-ui/react-icons** ^1.3.2 - Iconos Radix
- **lucide-react** ^0.475.0 - Iconos Lucide

### Componentes shadcn/ui Requeridos

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add badge
npx shadcn@latest add table
npx shadcn@latest add separator
npx shadcn@latest add dropdown-menu
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add checkbox
```

## Tech Stack

- **TanStack Table** v8.21.3 - Lógica de tablas
- **Shadcn/ui** - Componentes UI
- **Radix UI** - Primitives
- **Tailwind CSS** - Styling
- **Lucide React** + **Radix Icons** - Iconografía

## Portabilidad

Este componente es **portable** y puede copiarse a otros proyectos. Requisitos:

1. Shadcn/ui configurado
2. 9 componentes shadcn/ui instalados (ver arriba)
3. Dependencias NPM instaladas
4. Path alias `@/*` configurado en tsconfig.json
5. Función `cn()` en `lib/utils.ts` (o equivalente)

**Documentación completa de portabilidad:** Ver [components/data-table/README.md](../../../components/data-table/README.md)

## Best Practices

### Handling Horizontal Overflow

Cuando tu DataTable tiene muchas columnas (típicamente 8+), necesitas prevenir el **scroll horizontal duplicado** (scroll a nivel de página completa + scroll a nivel de tabla).

#### El Problema

Sin manejo adecuado del overflow, cuando la tabla excede el ancho del viewport:

- ❌ **Scroll a nivel de página:** Toda la aplicación (sidebar, header, contenido) se mueve horizontalmente
- ❌ **Scroll a nivel de tabla:** La tabla también tiene su propio scroll
- ❌ **UX pobre:** Usuario confundido por scroll duplicado, especialmente en mobile

#### La Solución

Envuelve el DataTable con clases específicas de Tailwind para **contener** el overflow:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
;<Card className="overflow-hidden">
  {' '}
  {/* ← Contiene el overflow */}
  <CardHeader>
    <CardTitle>Mis Datos</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    {' '}
    {/* ← Permite scroll interno */}
    <DataTable columns={columns} data={data} />
  </CardContent>
</Card>
```

#### Por Qué Funciona

1. **`overflow-hidden` en Card:**
   - Previene que el contenido interno "escape" del contenedor
   - Elimina el scroll horizontal a nivel de página
   - El Card actúa como contenedor de contención

2. **`overflow-x-auto` en CardContent:**
   - Permite scroll horizontal SOLO dentro del contenedor
   - Se activa automáticamente cuando la tabla excede el ancho disponible
   - Mantiene el scroll vertical normal

#### Resultado

✅ **Scroll horizontal:** Solo dentro del Card (donde está la tabla)
✅ **Página:** Sin scroll horizontal, solo vertical
✅ **Mobile:** La tabla es scrollable horizontalmente dentro del Card
✅ **Desktop:** Si la ventana es suficientemente ancha, no hay scroll

#### Casos de Uso

**Aplica este patrón cuando:**

- ✅ Tu DataTable tiene 8+ columnas
- ✅ Columnas con contenido variable (nombres largos, descripciones, etc.)
- ✅ Múltiples columnas numéricas (precios, cantidades, porcentajes)
- ✅ Columnas de acciones (dropdowns, botones)

**Ejemplo completo:**

```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { columns } from './columns'

export default function ProjectsPage() {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Proyectos (10 columnas)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <DataTable
          columns={columns} // 10 columnas
          data={projectsData}
          searchKey="name"
          enableRowSelection
        />
      </CardContent>
    </Card>
  )
}
```

#### Otros Casos de Contenido Wide

Este mismo patrón aplica a **cualquier contenido wide** que pueda exceder el viewport:

- 📊 Tablas largas (no DataTable)
- 🖼️ Imágenes muy anchas
- 💻 Code blocks largos
- 📈 Gráficas horizontales

```tsx
// Patrón general para contenido wide
<Card className="overflow-hidden">
  <CardContent className="overflow-x-auto">{/* Contenido wide aquí */}</CardContent>
</Card>
```

#### Demo Interactiva

Ver ejemplo completo en [/examples/data-table](../../../app/examples/data-table/page.tsx) - DataTable con 10 columnas demostrando este patrón.

## Troubleshooting

### Error: Cannot find module '@/lib/utils'

**Solución:** Asegúrate de tener la función `cn()` en `lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Error: Cannot find module '@/components/ui/button'

**Solución:** Instala los componentes shadcn/ui necesarios (ver sección Dependencias).

### Estilos no se aplican

**Solución:** Verifica que Tailwind CSS esté configurado correctamente y que los paths en `tailwind.config.js` incluyan los archivos del data-table.

## Referencias

- **Documentación completa:** [components/data-table/README.md](../../../components/data-table/README.md)
- **TanStack Table:** https://tanstack.com/table
- **Shadcn/ui Table:** https://ui.shadcn.com/docs/components/data-table

## Ver También

- [UI Components](ui-components.md) - Otros componentes del template
- [Stack](../architecture/stack.md) - Stack tecnológico completo
