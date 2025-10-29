# Cómo Crear una Nueva Página con DataTable

Guía paso a paso para implementar una tabla completa siguiendo el patrón de 2 archivos del proyecto.

## 📋 Índice

1. [Quick Start](#quick-start)
2. [Paso 1: Crear Estructura](#paso-1-crear-estructura)
3. [Paso 2: Definir columns.tsx](#paso-2-definir-columnstsx)
4. [Paso 3: Crear page.tsx](#paso-3-crear-pagetsx)
5. [Paso 4: Agregar Búsqueda Avanzada](#paso-4-agregar-búsqueda-avanzada-opcional)
6. [Paso 5: Agregar Filtros Faceted](#paso-5-agregar-filtros-faceted-opcional)
7. [Paso 6: Agregar Acciones Complejas](#paso-6-agregar-acciones-complejas-opcional)
8. [Checklist de Verificación](#checklist-de-verificación)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Crear estructura
mkdir app/entities
touch app/entities/columns.tsx
touch app/entities/page.tsx

# 2. Copiar templates de abajo
# 3. Adaptar a tu entidad
# 4. ¡Listo!
```

---

## Paso 1: Crear Estructura

### 1.1 Crear Directorios

```bash
# Crear directorio para tu entidad (ejemplo: products)
mkdir app/products

# Crear archivos base
touch app/products/columns.tsx
touch app/products/page.tsx
```

### 1.2 Estructura Final

```
app/products/
  ├── columns.tsx       → Contract + Presentation
  └── page.tsx          → Data + Orchestration
```

---

## Paso 2: Definir columns.tsx

### 2.1 Template Base

Copia este template y adapta a tu entidad:

```tsx
'use client'

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { formatDate, formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1️⃣ DEFINIR TIPO (ajusta según tu entidad)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  category: {
    id: string
    name: string
  }
  status: 'active' | 'inactive'
  createdAt: Date | string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2️⃣ PROPS DE CONFIGURACIÓN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ColumnsProps {
  onProductUpdated?: () => void
  onViewDetails?: (product: Product) => void
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3️⃣ FACTORY FUNCTION (createColumns)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const createColumns = ({
  onProductUpdated,
  onViewDetails,
}: ColumnsProps = {}): ColumnDef<Product>[] => [
  // ──────────────────────────────────────────────────────────
  // COLUMNA: Nombre (texto izquierda)
  // ──────────────────────────────────────────────────────────
  {
    accessorKey: 'name',
    header: 'Producto',
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },

  // ──────────────────────────────────────────────────────────
  // COLUMNA: SKU (texto izquierda)
  // ──────────────────────────────────────────────────────────
  {
    accessorKey: 'sku',
    header: 'SKU',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('sku')}</span>,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },

  // ──────────────────────────────────────────────────────────
  // COLUMNA: Categoría (texto izquierda)
  // ──────────────────────────────────────────────────────────
  {
    accessorKey: 'category.name',
    header: 'Categoría',
    cell: ({ row }) => row.original.category.name,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },

  // ──────────────────────────────────────────────────────────
  // COLUMNA: Precio (número derecha, sortable)
  // ──────────────────────────────────────────────────────────
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" className="justify-end" />
    ),
    cell: ({ row }) => {
      const price = row.getValue('price') as number
      return <div className="text-right font-semibold">{formatCurrency(price, 'CLP')}</div>
    },
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },

  // ──────────────────────────────────────────────────────────
  // COLUMNA: Stock (número derecha, sortable)
  // ──────────────────────────────────────────────────────────
  {
    accessorKey: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" className="justify-end" />
    ),
    cell: ({ row }) => {
      const stock = row.getValue('stock') as number
      const variant = stock > 10 ? 'success' : stock > 0 ? 'default' : 'destructive'

      return (
        <div className="flex items-center justify-end gap-2">
          <span>{stock}</span>
          <Badge variant={variant}>{stock > 10 ? 'OK' : stock > 0 ? 'Bajo' : 'Agotado'}</Badge>
        </div>
      )
    },
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },

  // ──────────────────────────────────────────────────────────
  // COLUMNA: Estado (badge centrado)
  // ──────────────────────────────────────────────────────────
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as 'active' | 'inactive'
      return (
        <Badge variant={status === 'active' ? 'success' : 'secondary'}>
          {status === 'active' ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    filterFn: (row, _id, filterValue) => {
      return filterValue.includes(row.getValue('status'))
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },

  // ──────────────────────────────────────────────────────────
  // COLUMNA: Fecha (centrada, sortable)
  // ──────────────────────────────────────────────────────────
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Creación" />,
    cell: ({ row }) => {
      return formatDate(row.getValue('createdAt'), 'short', 'es-CL')
    },
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },

  // ──────────────────────────────────────────────────────────
  // COLUMNA: Acciones (centrada, dropdown)
  // ──────────────────────────────────────────────────────────
  {
    id: 'actions',
    cell: ({ row }) => (
      <ProductActionsCell
        product={row.original}
        onProductUpdated={onProductUpdated}
        onViewDetails={onViewDetails}
      />
    ),
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4️⃣ COMPONENTE DE ACCIONES (separado, best practice)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ProductActionsCell({
  product,
  onProductUpdated,
  onViewDetails,
}: {
  product: Product
  onProductUpdated?: () => void
  onViewDetails?: (product: Product) => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar ${product.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar producto')
      }

      toast.success('Producto eliminado exitosamente')
      onProductUpdated?.()
    } catch (error) {
      console.error('Error al eliminar producto:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar producto')
    }
  }

  return (
    <>
      <DataTableDropdown>
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => onViewDetails?.(product)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalles
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>

        <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DataTableDropdown>

      {/* Agregar dialogs aquí si es necesario */}
    </>
  )
}
```

### 2.2 Checklist columns.tsx

Antes de pasar al siguiente paso, verifica:

- [ ] Interface `Product` definida con todos los campos
- [ ] `createColumns` exportada con factory pattern
- [ ] Todas las columnas tienen `meta.headerClassName` y `meta.cellClassName`
- [ ] Alineaciones correctas según tipo de dato
- [ ] Formateo de fechas con `formatDate()`
- [ ] Formateo de moneda con `formatCurrency()`
- [ ] `ProductActionsCell` como componente separado
- [ ] Confirmación antes de eliminar

---

## Paso 3: Crear page.tsx

### 3.1 Template Base

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns, type Product } from './columns'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PÁGINA PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ProductsPage() {
  // ──────────────────────────────────────────────────────────
  // 1️⃣ ESTADO DE DATOS
  // ──────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ──────────────────────────────────────────────────────────
  // 2️⃣ FETCH DATOS (con useCallback para deps estables)
  // ──────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/products')

      if (!response.ok) {
        throw new Error('Error al cargar productos')
      }

      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar productos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ──────────────────────────────────────────────────────────
  // 3️⃣ CARGAR DATOS AL MONTAR
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // ──────────────────────────────────────────────────────────
  // 4️⃣ CALLBACKS PARA COLUMNAS
  // ──────────────────────────────────────────────────────────
  const handleProductUpdated = () => {
    fetchProducts()
  }

  const handleViewDetails = (product: Product) => {
    console.log('Ver detalles de:', product)
    // Implementar modal/sheet de detalles
  }

  // ──────────────────────────────────────────────────────────
  // 5️⃣ CREAR COLUMNAS (con callbacks)
  // ──────────────────────────────────────────────────────────
  const columns = createColumns({
    onProductUpdated: handleProductUpdated,
    onViewDetails: handleViewDetails,
  })

  // ──────────────────────────────────────────────────────────
  // 6️⃣ RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <AppLayout
      pageTitle="Productos"
      pageDescription="Gestiona tu inventario de productos"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Productos' }]}
      action={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      }
    >
      {/*
        IMPORTANTE: Handling de Overflow Horizontal

        Cuando tu DataTable tiene 8+ columnas, envuélvelo con estas clases
        para prevenir scroll horizontal duplicado (página + tabla):

        - overflow-hidden en Card: Contiene el overflow
        - overflow-x-auto en CardContent: Permite scroll interno

        Ver docs/template/components/data-table.md#handling-horizontal-overflow
      */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Listado de Productos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Cargando productos...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={products}
              searchKey="name"
              searchPlaceholder="Buscar por nombre o SKU..."
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  )
}
```

### 3.2 Patrón de Overflow para Tablas Anchas

**⚠️ IMPORTANTE:** Si tu DataTable tiene **8+ columnas**, SIEMPRE envuélvelo con este patrón:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
;<Card className="overflow-hidden">
  {' '}
  {/* ← Contiene el overflow */}
  <CardHeader>
    <CardTitle>Título de la Tabla</CardTitle>
  </CardHeader>
  <CardContent className="overflow-x-auto">
    {' '}
    {/* ← Permite scroll interno */}
    <DataTable columns={columns} data={data} />
  </CardContent>
</Card>
```

**Por qué es necesario:**

- ❌ **Sin este patrón:** Scroll horizontal duplicado (página completa + tabla)
- ✅ **Con este patrón:** Scroll horizontal SOLO dentro del Card

**Cuándo aplicarlo:**

- ✅ Tu DataTable tiene 8+ columnas
- ✅ Columnas con contenido variable (nombres largos, descripciones)
- ✅ Múltiples columnas numéricas (precios, cantidades, porcentajes)
- ✅ Columnas de acciones (dropdowns, botones)

**Documentación completa:** [data-table.md - Best Practices](../components/data-table.md#handling-horizontal-overflow)

### 3.3 Checklist page.tsx

- [ ] Estado `products` y `isLoading` definidos
- [ ] `fetchProducts` con `useCallback`
- [ ] `useEffect` para cargar al montar
- [ ] Callbacks para refetch implementados
- [ ] `createColumns` con props correctas
- [ ] `AppLayout` con breadcrumbs
- [ ] Loading state con mensaje
- [ ] `DataTable` con searchKey y placeholder
- [ ] **Patrón de overflow:** `Card` con `overflow-hidden` + `CardContent` con `overflow-x-auto` (si 8+ columnas)

---

## Paso 4: Agregar Búsqueda Avanzada (Opcional)

Si necesitas búsqueda en múltiples campos:

### 4.1 Agregar globalFilterFn

```tsx
// En page.tsx, ANTES del return

// ──────────────────────────────────────────────────────────
// FILTRO GLOBAL CUSTOM (búsqueda multi-campo)
// ──────────────────────────────────────────────────────────
import { Row } from '@tanstack/react-table'

const globalFilterFn = (row: Row<Product>, _columnId: string, filterValue: string) => {
  const product = row.original
  const searchValue = filterValue.toLowerCase()

  // Buscar en múltiples campos
  return (
    product.name.toLowerCase().includes(searchValue) ||
    product.sku.toLowerCase().includes(searchValue) ||
    product.category.name.toLowerCase().includes(searchValue)
  )
}
```

### 4.2 Usar en DataTable

```tsx
<DataTable
  columns={columns}
  data={products}
  searchKey="search"
  searchPlaceholder="Buscar por nombre, SKU o categoría..."
  enableGlobalFilter={true}
  globalFilterFn={globalFilterFn}
/>
```

---

## Paso 5: Agregar Filtros Faceted (Opcional)

Para filtros multi-select con badges:

### 5.1 Configurar Opciones

```tsx
// En page.tsx, ANTES del return

// ──────────────────────────────────────────────────────────
// CONFIGURAR FILTROS FACETED
// ──────────────────────────────────────────────────────────

const filterableColumns = [
  // Filtro de Estado
  {
    id: 'status',
    title: 'Estado',
    options: [
      { label: 'Activo', value: 'active' },
      { label: 'Inactivo', value: 'inactive' },
    ],
  },
  // Filtro de Categoría (dinámico desde API)
  {
    id: 'category.name',
    title: 'Categoría',
    options: categories.map((cat) => ({
      label: cat.name,
      value: cat.name,
    })),
  },
]
```

### 5.2 Pasar a DataTable

```tsx
<DataTable
  columns={columns}
  data={products}
  searchKey="name"
  searchPlaceholder="Buscar productos..."
  filterableColumns={filterableColumns}
/>
```

### 5.3 Si necesitas fetch metadata

```tsx
// Estado adicional
const [categories, setCategories] = useState([])

// En fetchProducts
const fetchProducts = useCallback(async () => {
  try {
    setIsLoading(true)

    // Fetch combinado: productos + metadata
    const response = await fetch('/api/products-with-metadata')
    const data = await response.json()

    setProducts(data.products)
    setCategories(data.categories) // ← Metadata para filtros
  } catch (error) {
    toast.error('Error al cargar')
  } finally {
    setIsLoading(false)
  }
}, [])
```

---

## Paso 6: Agregar Acciones Complejas (Opcional)

Para acciones con múltiples dialogs/sheets:

### 6.1 En columns.tsx (ya implementado)

El componente `ProductActionsCell` ya está configurado en el template. Solo necesitas agregar los dialogs:

```tsx
function ProductActionsCell({ product, onProductUpdated, onViewDetails }) {
  // Estados locales para dialogs
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Handlers
  const handleDelete = async () => { ... }

  return (
    <>
      <DataTableDropdown>
        {/* Acciones */}
      </DataTableDropdown>

      {/* Dialogs asociados */}
      <ProductDetailsSheet
        productId={product.id}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      <EditProductDialog
        product={product}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onProductUpdated}
      />
    </>
  )
}
```

### 6.2 Crear Dialogs

```bash
# Crear componentes de dialogs
mkdir -p components/dialogs/products
touch components/dialogs/products/product-details-sheet.tsx
touch components/dialogs/products/edit-product-dialog.tsx
```

---

## Checklist de Verificación

Antes de considerar la implementación completa:

### Estructura de Archivos

- [ ] `app/entities/columns.tsx` creado
- [ ] `app/entities/page.tsx` creado
- [ ] Imports correctos en ambos archivos

### columns.tsx

- [ ] Interface TypeScript definida y exportada
- [ ] `createColumns` con factory pattern
- [ ] Todas las columnas tienen `meta` (headerClassName, cellClassName)
- [ ] Alineaciones correctas según tipo de dato:
  - [ ] Texto → `text-left`
  - [ ] Números/Moneda → `text-right`
  - [ ] Fechas/Badges → `text-center`
  - [ ] Acciones → `text-center`
- [ ] Formateo de fechas con `formatDate()`
- [ ] Formateo de moneda con `formatCurrency()` o `Intl.NumberFormat`
- [ ] Columna de acciones con componente separado
- [ ] `EntityActionsCell` implementado correctamente

### page.tsx

- [ ] Estado de datos (`entities`, `isLoading`)
- [ ] Función `fetchEntities` con `useCallback`
- [ ] `useEffect` para cargar al montar
- [ ] Callbacks implementados:
  - [ ] `handleEntityUpdated`
  - [ ] `handleViewDetails` (si aplica)
- [ ] `createColumns` con props correctas
- [ ] Loading state con mensaje
- [ ] `AppLayout` configurado:
  - [ ] `pageTitle`
  - [ ] `pageDescription`
  - [ ] `breadcrumbs`
  - [ ] `action` button (si aplica)
- [ ] `DataTable` configurado:
  - [ ] `columns`
  - [ ] `data`
  - [ ] `searchKey`
  - [ ] `searchPlaceholder`
- [ ] **Overflow handling** (si 8+ columnas):
  - [ ] `Card` con `className="overflow-hidden"`
  - [ ] `CardContent` con `className="overflow-x-auto"`

### Funcionalidad

- [ ] Fetching funciona correctamente
- [ ] Loading state se muestra
- [ ] Búsqueda funciona
- [ ] Sorting funciona (columnas con `DataTableColumnHeader`)
- [ ] Filtros funcionan (si aplica)
- [ ] Acciones funcionan:
  - [ ] Ver detalles
  - [ ] Editar
  - [ ] Eliminar con confirmación
- [ ] Toast notifications:
  - [ ] Success en operaciones exitosas
  - [ ] Error en fallos
- [ ] Refetch después de mutaciones

### UX

- [ ] Confirmación para operaciones destructivas
- [ ] Feedback visual durante operaciones
- [ ] Mensajes de error informativos
- [ ] Placeholder descriptivo en búsqueda
- [ ] Loading state no bloquea UI innecesariamente

---

## Troubleshooting

### Error: "Cannot read property 'name' of undefined"

**Causa:** Datos anidados no existen (ej: `product.category` es null)

**Solución:**

```tsx
// En columns.tsx, cell con optional chaining
cell: ({ row }) => row.original.category?.name || 'Sin categoría'
```

---

### Error: "Column with id X not found"

**Causa:** `searchKey` o `filterableColumns.id` no coincide con `accessorKey`

**Solución:**

```tsx
// Si usas nested access:
{
  accessorKey: 'category.name',  // ← Debe coincidir
  id: 'category.name',           // ← Opcional pero ayuda
}

// En page.tsx:
filterableColumns={[
  { id: 'category.name', ... }  // ← Mismo ID
]}
```

---

### Problema: Filtros no funcionan

**Causa:** Falta `filterFn` custom para datos complejos

**Solución:**

```tsx
// En columns.tsx
{
  accessorKey: 'status',
  header: 'Estado',
  cell: ({ row }) => <Badge>{row.getValue('status')}</Badge>,
  filterFn: (row, _id, filterValue) => {
    const status = row.getValue('status') as string
    return filterValue.includes(status)  // ← Custom logic
  },
}
```

---

### Problema: Sorting no funciona en fechas

**Causa:** Fechas como string sin parsear

**Solución 1 (backend):**

```tsx
// En API, devolver Date objects
date: new Date(dateString)
```

**Solución 2 (frontend):**

```tsx
// En columns.tsx, accessorFn para convertir
{
  id: 'createdAt',
  accessorFn: (row) => new Date(row.createdAt),
  header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
  cell: ({ row }) => formatDate(row.getValue('createdAt'), 'short'),
}
```

---

### Problema: Refetch no funciona después de eliminar

**Causa:** Callback no conectado correctamente

**Solución:**

```tsx
// En page.tsx: asegúrate de pasar el callback
const columns = createColumns({
  onEntityUpdated: fetchEntities, // ← Conectar aquí
})

// En columns.tsx: llamar el callback
const handleDelete = async () => {
  await fetch(`/api/entities/${entity.id}`, { method: 'DELETE' })
  onEntityUpdated?.() // ← Invocar aquí
}
```

---

### Problema: Meta no aplica clases

**Causa:** Extensión de `ColumnMeta` no está en data-table.tsx

**Solución:** Ya debería estar implementado, pero verifica:

```tsx
// En data-table.tsx (ya existe en el proyecto)
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}
```

---

## Ejemplos Reales del Proyecto

### Ejemplo 1: Tabla Simple (Customers)

Ver: `app/customer/` (implementación más simple)

### Ejemplo 2: Tabla con Filtros (Projects)

Ver: `app/projects/` (implementación completa con filtros faceted, estado editable, acciones complejas)

**Highlights:**

- Global filter multi-campo
- Filtros faceted con colores
- EditableBadge para estado
- ActionsCell con múltiples dialogs

### Ejemplo 3: Tabla con Tipos de Pago (Payments)

Ver: `app/payments/` (implementación con tipos diferentes de registros)

**Highlights:**

- Columna "Tipo" con badge
- Lógica condicional en actions
- Custom rendering según tipo

---

## Próximos Pasos

Después de implementar tu tabla:

1. **Agregar Tests**
   - Unit tests para `createColumns`
   - Integration tests para page.tsx

2. **Mejorar UX**
   - Skeleton states en lugar de "Cargando..."
   - Optimistic UI updates
   - Debounced search

3. **Performance**
   - React Query para caching
   - Virtualization para tablas grandes (>1000 rows)
   - Lazy loading de dialogs

4. **Documentar**
   - Actualizar `docs/project/implementation/2025-current.md`
   - Agregar screenshots si es relevante

---

## Referencias

- **Guía conceptual:** [data-table-pattern.md](../components/data-table-pattern.md)
- **Componente base:** [data-table.md](../components/data-table.md)
- **Ejemplo completo:** `app/projects/` (código real del proyecto)
- **TanStack Table:** https://tanstack.com/table

---

**¡Listo!** Ahora tienes una tabla completa con búsqueda, filtros, acciones y más. 🎉

**Última actualización:** 2025-01-29
