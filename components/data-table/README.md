# 📊 Data Table System - Portable Component

**Versión:** 1.0.0
**Última actualización:** Octubre 2025
**Stack:** TanStack Table 8.21.3 + Shadcn/ui + Next.js 15

---

## 📋 Tabla de Contenidos

- [Overview](#-overview)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage Examples](#-usage-examples)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)
- [Code Snippets](#-code-snippets)
- [Quick Start Checklist](#-quick-start-checklist)

---

## 🎯 Overview

Sistema completo de tablas de datos con funcionalidades avanzadas construido sobre **TanStack Table v8** y **Shadcn/ui**.

### Features Principales

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

### Tech Stack

- **TanStack Table** v8.21.3 - Lógica de tablas headless
- **Shadcn/ui** - Componentes UI accesibles
- **Radix UI** - Primitives base
- **Tailwind CSS** - Styling utility-first
- **Lucide React** + **Radix Icons** - Iconografía

---

## 🚨 Prerequisites

**IMPORTANTE:** Este sistema NO es un componente standalone. Requiere infraestructura significativa.

### 1. Shadcn/ui Setup (Obligatorio)

Si tu proyecto NO tiene Shadcn/ui configurado, ejecuta:

```bash
npx shadcn-ui@latest init
```

Responde a las preguntas de configuración:

- **Style:** Default (o tu preferencia)
- **Base color:** Slate (recomendado)
- **CSS variables:** Yes (recomendado)

### 2. Componentes Shadcn Requeridos (9 componentes)

Ejecuta estos comandos para instalar los componentes UI necesarios:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add table
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add command
npx shadcn-ui@latest add checkbox
```

**Verificación:** Deberías tener estos archivos creados:

```
src/components/ui/
├── button.tsx
├── input.tsx
├── badge.tsx
├── table.tsx
├── separator.tsx
├── dropdown-menu.tsx
├── popover.tsx
├── command.tsx
└── checkbox.tsx
```

### 3. Dependencias NPM (Obligatorias)

Instala las siguientes dependencias con versiones específicas:

```bash
# Core
npm install @tanstack/react-table@^8.21.3

# Iconos (ambos requeridos)
npm install @radix-ui/react-icons@^1.3.2
npm install lucide-react@^0.475.0

# Utilidades
npm install clsx@^2.1.1
npm install tailwind-merge@^3.0.1
```

### 4. Función cn() Helper (Crítica)

Crea el archivo `src/utils/tailwind-helpers.ts` con este contenido:

```typescript
// src/utils/tailwind-helpers.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Función de utilidad para combinar clases CSS de Tailwind
 * Evita conflictos y mantiene la especificidad correcta
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 5. TypeScript Path Alias (Requerido)

Verifica que tu `tsconfig.json` tenga configurado el alias `@/*`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 6. Tailwind CSS (Obligatorio)

Asegúrate de tener Tailwind CSS configurado. Tu `tailwind.config.js` debe incluir:

```javascript
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

## 📦 Installation

### Paso 1: Copiar Carpeta Completa

```bash
# Desde el proyecto fuente (CalReact)
cp -r src/components/custom/data-table/ <tu-proyecto>/src/components/custom/

# O manualmente: copiar toda la carpeta data-table/
```

### Paso 2: Verificar Función cn()

Asegúrate de que el archivo `src/utils/tailwind-helpers.ts` existe con el contenido correcto (ver Prerequisites, punto 4).

### Paso 3: Verificar Imports

Abre cualquier archivo de `data-table/` y verifica que los imports se resuelven:

```typescript
// Estos imports deben resolverse sin errores
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/tailwind-helpers'
```

**Si TypeScript muestra errores:**

1. Verifica que el path alias `@/*` está configurado en `tsconfig.json`
2. Reinicia el servidor de desarrollo (`npm run dev`)
3. Reinicia el TypeScript language server (VS Code: `Cmd+Shift+P` → "Restart TS Server")

### Paso 4: Build Test (Recomendado)

```bash
npm run build
```

Si el build pasa sin errores, la instalación fue exitosa.

---

## 🚀 Usage Examples

### Ejemplo 1: Tabla Básica de Usuarios

#### Archivo: `app/users/columns.tsx`

```typescript
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/custom/data-table"
import { Badge } from "@/components/ui/badge"

export type User = {
  id: string
  name: string
  email: string
  role: "admin" | "user" | "guest"
  status: "active" | "inactive"
  createdAt: Date
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre" />
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      return (
        <Badge variant={role === "admin" ? "default" : "secondary"}>
          {role}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={status === "active" ? "default" : "secondary"}>
          {status}
        </Badge>
      )
    },
  },
]
```

#### Archivo: `app/users/page.tsx`

```typescript
"use client"

import { DataTable } from "@/components/custom/data-table"
import { columns, type User } from "./columns"

export default function UsersPage() {
  // En producción: fetch de API o database
  const data: User[] = [
    {
      id: "1",
      name: "Juan Pérez",
      email: "juan@example.com",
      role: "admin",
      status: "active",
      createdAt: new Date(),
    },
    {
      id: "2",
      name: "María García",
      email: "maria@example.com",
      role: "user",
      status: "active",
      createdAt: new Date(),
    },
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
            id: "role",
            title: "Rol",
            options: [
              { label: "Admin", value: "admin" },
              { label: "Usuario", value: "user" },
              { label: "Invitado", value: "guest" },
            ]
          },
          {
            id: "status",
            title: "Estado",
            options: [
              { label: "Activo", value: "active" },
              { label: "Inactivo", value: "inactive" },
            ]
          }
        ]}
      />
    </div>
  )
}
```

---

### Ejemplo 2: Tabla Avanzada con Selección de Filas

#### Archivo: `app/products/columns.tsx`

```typescript
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/custom/data-table"
import { DataTableRowActions } from "@/components/custom/data-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, SquarePen, Trash2 } from "lucide-react"

export type Product = {
  id: string
  name: string
  price: number
  stock: number
  category: string
}

interface ProductColumnsProps {
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export const createProductColumns = ({
  onEdit,
  onDelete,
}: ProductColumnsProps): ColumnDef<Product>[] => [
  // Columna de selección
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todo"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Producto" />
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" className="justify-end" />
    ),
    cell: ({ row }) => {
      const price = row.getValue("price") as number
      const formatted = new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(price)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" className="justify-center" />
    ),
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("stock")}</div>
    ),
  },
  {
    accessorKey: "category",
    header: "Categoría",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  // Columna de acciones
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const product = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(product)}>
              <SquarePen className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(product)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

#### Archivo: `app/products/page.tsx`

```typescript
"use client"

import React from "react"
import { DataTable } from "@/components/custom/data-table"
import { createProductColumns, type Product } from "./columns"
import { Button } from "@/components/ui/button"

export default function ProductsPage() {
  const [selectedProducts, setSelectedProducts] = React.useState<Product[]>([])

  const data: Product[] = [
    { id: "1", name: "Laptop", price: 999, stock: 15, category: "electronics" },
    { id: "2", name: "Mouse", price: 29, stock: 50, category: "electronics" },
    { id: "3", name: "Teclado", price: 79, stock: 30, category: "electronics" },
  ]

  const handleEdit = (product: Product) => {
    console.log("Editar producto:", product)
  }

  const handleDelete = (product: Product) => {
    console.log("Eliminar producto:", product)
  }

  const columns = React.useMemo(
    () => createProductColumns({ onEdit: handleEdit, onDelete: handleDelete }),
    []
  )

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Productos</h1>
        {selectedProducts.length > 0 && (
          <Button variant="destructive">
            Eliminar {selectedProducts.length} seleccionados
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Buscar productos..."
        filterableColumns={[
          {
            id: "category",
            title: "Categoría",
            options: [
              { label: "Electrónicos", value: "electronics" },
              { label: "Ropa", value: "clothing" },
              { label: "Alimentos", value: "food" },
            ]
          }
        ]}
        onRowSelectionChange={setSelectedProducts}
        enableRowSelection={true}
      />
    </div>
  )
}
```

---

## 📖 API Reference

### `<DataTable>` Component

Props principales del componente `DataTable`:

| Prop                   | Tipo                         | Default       | Descripción                             |
| ---------------------- | ---------------------------- | ------------- | --------------------------------------- |
| `columns`              | `ColumnDef<TData, TValue>[]` | **Required**  | Definición de columnas (TanStack Table) |
| `data`                 | `TData[]`                    | **Required**  | Array de datos a mostrar                |
| `searchKey`            | `string`                     | `""`          | ID de columna para búsqueda global      |
| `searchPlaceholder`    | `string`                     | `"Buscar..."` | Placeholder del input de búsqueda       |
| `filterableColumns`    | `FilterableColumn[]`         | `[]`          | Columnas con filtros facetados          |
| `onRowSelectionChange` | `(rows: TData[]) => void`    | `undefined`   | Callback cuando cambia selección        |
| `enableRowSelection`   | `boolean`                    | `false`       | Habilitar selección de filas            |
| `meta`                 | `any`                        | `undefined`   | Metadata adicional para columnas        |

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

### `<DataTableColumnHeader>` Component

Props para headers de columnas con sorting:

| Prop        | Tipo                    | Descripción                       |
| ----------- | ----------------------- | --------------------------------- |
| `column`    | `Column<TData, TValue>` | Instancia de columna TanStack     |
| `title`     | `string`                | Título visible de la columna      |
| `className` | `string`                | Clases CSS adicionales (opcional) |

### Custom Cell Renderers

Usa la prop `cell` en `ColumnDef` para renderizado custom:

```typescript
{
  accessorKey: "status",
  header: "Estado",
  cell: ({ row }) => {
    const status = row.getValue("status") as string
    return <CustomBadge status={status} />
  }
}
```

### Meta Property (Advanced)

Puedes pasar callbacks u objetos de estado via `meta`:

```typescript
<DataTable
  columns={columns}
  data={data}
  meta={{
    handleStatusChange: (id, status) => { /* lógica */ },
    updateMutation: mutation,
  }}
/>

// Acceder en columnas:
cell: ({ row, table }) => {
  const handleChange = (table.options.meta as any)?.handleStatusChange
  // Usar handleChange...
}
```

---

## 🔧 Troubleshooting

### Error: `Cannot find module '@/lib/utils'`

**Causa:** Función `cn()` no copiada o import incorrecto.

**Solución:**

1. Verifica que existe `src/utils/tailwind-helpers.ts`
2. Verifica que el archivo contiene la función `cn()` (ver [Code Snippets](#code-snippets))
3. Asegúrate de que los imports en data-table usan:
   ```typescript
   import { cn } from '@/utils/tailwind-helpers'
   ```

**Fix rápido:**

```bash
# Crear archivo si no existe
mkdir -p src/utils
# Copiar contenido desde Code Snippets section
```

---

### Error: `Cannot find module '@/components/ui/button'`

**Causa:** Componentes Shadcn/ui no instalados.

**Solución:**

```bash
# Instalar todos los componentes necesarios
npx shadcn-ui@latest add button input badge table separator dropdown-menu popover command checkbox
```

**Verificación:**

```bash
# Verificar que existan los archivos
ls src/components/ui/
# Debe mostrar: button.tsx, input.tsx, badge.tsx, etc.
```

---

### Error: `Module not found: @radix-ui/react-icons`

**Causa:** Dependencias de iconos faltantes.

**Solución:**

```bash
npm install @radix-ui/react-icons@^1.3.2 lucide-react@^0.475.0
```

---

### Error: `Cannot find name 'Column'` (TypeScript)

**Causa:** TanStack Table no instalado o versión incorrecta.

**Solución:**

```bash
npm install @tanstack/react-table@^8.21.3
```

**Verificación:**

```bash
npm list @tanstack/react-table
# Debe mostrar: @tanstack/react-table@8.21.3
```

---

### Error: Path alias `@/*` not resolving

**Causa:** TypeScript config incorrecto.

**Solución:**

1. Abre `tsconfig.json`
2. Asegúrate de tener:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```
3. Reinicia TypeScript server (VS Code: `Cmd+Shift+P` → "Restart TS Server")
4. Reinicia el dev server (`npm run dev`)

---

### Warning: `clsx` or `tailwind-merge` not found

**Causa:** Dependencias de utilidades faltantes.

**Solución:**

```bash
npm install clsx@^2.1.1 tailwind-merge@^3.0.1
```

---

### Estilos no se aplican correctamente

**Causa:** Tailwind CSS no configurado o content paths incorrectos.

**Solución:**

1. Verifica `tailwind.config.js`:
   ```javascript
   module.exports = {
     content: ['./src/**/*.{js,ts,jsx,tsx}'],
   }
   ```
2. Reinicia dev server
3. Verifica que `globals.css` importa Tailwind:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

---

## 📄 Code Snippets

### Función cn() Completa

Copiar a `src/utils/tailwind-helpers.ts`:

```typescript
// src/utils/tailwind-helpers.ts
// Funciones de utilidad para la gestión de clases CSS con Tailwind

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Función de utilidad para combinar clases CSS de Tailwind
 * Evita conflictos y mantiene la especificidad correcta
 * @param inputs Array de clases CSS o expresiones condicionales
 * @returns String con todas las clases combinadas y optimizadas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

### Versiones Exactas (package.json)

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8.21.3",
    "@radix-ui/react-icons": "^1.3.2",
    "lucide-react": "^0.475.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.1"
  }
}
```

**Instalación rápida:**

```bash
npm install @tanstack/react-table@^8.21.3 @radix-ui/react-icons@^1.3.2 lucide-react@^0.475.0 clsx@^2.1.1 tailwind-merge@^3.0.1
```

---

### TypeScript Config Mínimo (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

### Tailwind Config Mínimo (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

### Estructura de Archivos Esperada

```
tu-proyecto/
├── src/
│   ├── components/
│   │   ├── ui/                      # Componentes Shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── table.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── command.tsx
│   │   │   └── checkbox.tsx
│   │   └── custom/
│   │       └── data-table/          # ← Sistema data-table
│   │           ├── data-table.tsx
│   │           ├── data-table-toolbar.tsx
│   │           ├── data-table-pagination.tsx
│   │           ├── data-table-column-header.tsx
│   │           ├── data-table-faceted-filter.tsx
│   │           ├── data-table-row-actions.tsx
│   │           └── index.ts
│   ├── utils/
│   │   └── tailwind-helpers.ts      # ← Función cn()
│   └── app/
│       └── tu-pagina/
│           ├── columns.tsx           # Definición de columnas
│           └── page.tsx              # Página que usa DataTable
├── tsconfig.json
└── tailwind.config.js
```

---

## ✅ Quick Start Checklist

Usa esta checklist para verificar que todo está configurado correctamente:

- [ ] **Shadcn/ui instalado** (`npx shadcn-ui@latest init` ejecutado)
- [ ] **9 componentes Shadcn agregados** (button, input, badge, table, separator, dropdown-menu, popover, command, checkbox)
- [ ] **Dependencias NPM instaladas** (@tanstack/react-table, @radix-ui/react-icons, lucide-react, clsx, tailwind-merge)
- [ ] **Función cn() copiada** (src/utils/tailwind-helpers.ts existe y contiene la función)
- [ ] **Carpeta data-table/ copiada** (src/components/custom/data-table/ con 7 archivos)
- [ ] **Path alias configurado** (tsconfig.json tiene `"@/*": ["./src/*"]`)
- [ ] **Imports resuelven correctamente** (no hay errores TypeScript)
- [ ] **TypeScript compila** (`npm run build` pasa sin errores)
- [ ] **Ejemplo básico funciona** (página de prueba renderiza tabla sin errores)
- [ ] **Estilos se aplican** (tabla tiene estilos correctos de Tailwind)

**Si todos los items están marcados:** ✅ Sistema data-table instalado correctamente.

---

## 🤝 Support

Si encuentras problemas no cubiertos en este README:

1. **Verifica versiones:** Asegúrate de usar las versiones exactas especificadas
2. **Revisa imports:** Todos los paths `@/*` deben resolverse
3. **Revisa consola:** Errores de TypeScript/ESLint dan pistas específicas
4. **Build test:** Ejecuta `npm run build` para verificar producción

---

## 📊 Metadata

**Archivos incluidos:** 7 archivos (646 líneas de código)
**Dependencias externas:** 15+ paquetes
**Componentes Shadcn requeridos:** 9
**Tiempo de setup estimado:** 1-2 horas (primera vez)
**Versión:** 1.0.0

---

**📝 Última actualización:** Octubre 2025
**🏗️ Construido para:** Next.js 15, React 18, TypeScript 5
**📦 Basado en:** TanStack Table v8 + Shadcn/ui
**✅ Validado en:** CalReact project (producción)
