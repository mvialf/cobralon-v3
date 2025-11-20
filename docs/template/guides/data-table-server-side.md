# Guía: DataTable con Paginación Server-Side

**Versión:** 1.0.0
**Última actualización:** Noviembre 2025
**Tiempo estimado:** 1-2 horas

---

## 📋 Tabla de Contenidos

- [Overview](#-overview)
- [Prerequisites](#-prerequisites)
- [Step-by-Step Implementation](#-step-by-step-implementation)
- [Patterns & Best Practices](#-patterns--best-practices)
- [Troubleshooting](#-troubleshooting)
- [Advanced Topics](#-advanced-topics)

---

## 🎯 Overview

Esta guía te enseña cómo implementar **paginación server-side escalable** con DataTable, React Query y prefetching automático.

### ¿Qué vas a construir?

Una página con tabla de datos que:

- ✅ Escala a **millones de registros** (no solo 1000)
- ✅ **Cache automático** por página (navegación instantánea)
- ✅ **Prefetching** de página siguiente en background
- ✅ **Búsqueda debounced** (reduce requests al servidor)
- ✅ **Smooth transitions** (sin flickering al cambiar página)

### Cuándo usar esta guía

Implementa server-side pagination cuando:

- ✅ Tu dataset tiene **>1000 registros**
- ✅ Los datos cambian frecuentemente (alta concurrencia)
- ✅ Necesitas búsqueda escalable (filtrado en DB)
- ✅ Tu backend ya soporta paginación (`page`, `limit`)

**❌ NO uses server-side si:**

- Tienes <500 registros estáticos → client-side es más simple
- Backend NO soporta paginación → implementa backend primero

---

## 🚨 Prerequisites

Antes de empezar, asegúrate de tener:

### 1. DataTable System Instalado

```bash
# Verificar que existe
ls components/data-table/

# Debe mostrar:
# data-table.tsx
# data-table-toolbar.tsx
# data-table-pagination.tsx
# etc.
```

Si NO existe, sigue [DataTable README](../../components/data-table/README.md).

### 2. React Query Configurado

```bash
npm list @tanstack/react-query
# Debe mostrar: @tanstack/react-query@5.x.x
```

**Setup de React Query:**

```tsx
// app/layout.tsx o app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            gcTime: 5 * 60 * 1000, // 5 minutos
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

### 3. Hook useDebounce

```bash
# Verificar que existe
ls hooks/use-debounce.ts
```

Si NO existe, crea `hooks/use-debounce.ts`:

```typescript
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
```

### 4. API Route con Paginación

Tu backend debe retornar estructura como esta:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

---

## 🚀 Step-by-Step Implementation

Vamos a implementar una página de **Productos** con server-side pagination completa.

### Step 1: API Route

Crea `app/api/products/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' // O tu DB client

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Parse query params
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100
  const search = searchParams.get('search') || undefined

  try {
    // Build where clause
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    // Fetch data + count (parallel)
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Error al cargar productos' }, { status: 500 })
  }
}
```

**Testear API:**

```bash
curl "http://localhost:3000/api/products?page=1&limit=20&search=laptop"
```

---

### Step 2: React Query Hook

Crea `hooks/queries/use-products.ts`:

````typescript
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types
export interface Product {
  id: string
  name: string
  price: number
  stock: number
  category: string
  createdAt: Date
}

export interface ProductsQueryParams {
  page?: number
  limit?: number
  search?: string
}

export interface ProductsResponse {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// QUERY: GET LIST (with server-side pagination)
// ============================================================================

/**
 * Hook para obtener lista de productos con paginación server-side
 *
 * @param params - Filtros opcionales (page, limit, search)
 * @returns Query con products y paginación
 *
 * @example
 * ```tsx
 * const { data, isLoading, isPlaceholderData } = useProducts({
 *   page: 1,
 *   limit: 20,
 *   search: 'laptop'
 * })
 * ```
 */
export function useProducts(params: ProductsQueryParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async (): Promise<ProductsResponse> => {
      const searchParams = new URLSearchParams()

      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))
      if (params.search) searchParams.set('search', params.search)

      const response = await fetch(`/api/products?${searchParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al cargar productos')
      }

      return response.json()
    },
    placeholderData: keepPreviousData, // ← CRÍTICO: Smooth transitions
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  })
}

// ============================================================================
// MUTATION: CREATE (ejemplo)
// ============================================================================

export interface CreateProductData {
  name: string
  price: number
  stock: number
  category: string
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateProductData): Promise<Product> => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear producto')
      }

      return response.json()
    },
    onSuccess: () => {
      // Invalidar todas las queries de products
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto creado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
      console.error('Error creating product:', error)
    },
  })
}
````

---

### Step 3: Page Component

Crea `app/products/page.tsx`:

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/data-table/data-table'
import { columns } from './columns'
import { useProducts, type ProductsQueryParams } from '@/hooks/queries/use-products'
import { useDebounce } from '@/hooks/use-debounce'

export default function ProductsPage() {
  const queryClient = useQueryClient()

  // 🎯 Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 20,
  })

  // 🔍 Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // 📦 Query params memoizados (evita re-fetches innecesarios)
  const queryParams: ProductsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch]
  )

  // ⚡ React Query: Fetch products con cache automático
  const { data, isLoading, isPlaceholderData } = useProducts(queryParams)

  const products = data?.products || []
  const pageCount = data?.pagination.totalPages || 0

  // 🚀 Prefetch página siguiente para mejor UX
  useEffect(() => {
    if (!isPlaceholderData && data?.pagination) {
      const { page, totalPages } = data.pagination
      const hasNextPage = page < totalPages

      if (hasNextPage) {
        // Prefetch siguiente página en background
        queryClient.prefetchQuery({
          queryKey: ['products', { ...queryParams, page: page + 1 }],
          queryFn: async () => {
            const params = new URLSearchParams({
              page: String(page + 1),
              limit: String(queryParams.limit),
            })
            if (queryParams.search) params.append('search', queryParams.search)

            const response = await fetch(`/api/products?${params}`)
            if (!response.ok) throw new Error('Error al precargar')
            return response.json()
          },
        })
      }
    }
  }, [data, isPlaceholderData, queryClient, queryParams])

  // 🎛️ Handler para búsqueda
  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    // Resetear a página 1 cuando cambia la búsqueda
    if (pagination.pageIndex !== 0) {
      setPagination({ ...pagination, pageIndex: 0 })
    }
  }

  return (
    <AppLayout
      pageTitle="Productos"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Productos' }]}
    >
      <div className="space-y-4">
        {isLoading && !isPlaceholderData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando productos...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={products}
            searchKey="name"
            searchPlaceholder="Buscar producto..."
            // ← Props server-side
            manualPagination={true}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            onSearchChange={handleSearchChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
```

---

### Step 4: Columns Definition

Crea `app/products/columns.tsx`:

```tsx
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Product } from '@/hooks/queries/use-products'
import { formatCurrency } from '@/lib/format'

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Producto" />,
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Precio" className="justify-end" />
    ),
    cell: ({ row }) => {
      const price = row.getValue('price') as number
      return <div className="text-right font-medium">{formatCurrency(price, 'CLP')}</div>
    },
  },
  {
    accessorKey: 'stock',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stock" />,
    cell: ({ row }) => {
      const stock = row.getValue('stock') as number
      return (
        <Badge variant={stock > 10 ? 'default' : stock > 0 ? 'warning' : 'destructive'}>
          {stock} unidades
        </Badge>
      )
    },
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
]
```

---

## ✅ Verificación

Testa tu implementación:

1. **Navegación:**
   - Cambia de página → Debe ser instantánea (cache)
   - Ve a página 2 → Debe cargar rápido (prefetch de página 1)

2. **Búsqueda:**
   - Escribe "laptop" → Espera 500ms → Request enviado
   - Debe resetear a página 1 automáticamente

3. **Loading States:**
   - Primera carga: "Cargando productos..."
   - Cambio de página: Datos anteriores visibles (sin flickering)

4. **DevTools:**
   - Abre React Query DevTools
   - Verifica queries cacheadas: `['products', { page: 1, limit: 20 }]`
   - Verifica que prefetch funciona (página 2 en cache)

---

## 📚 Patterns & Best Practices

### 1. Prefetching Pattern

```typescript
useEffect(() => {
  // ✅ SOLO prefetch si:
  // 1. NO estamos mostrando placeholder data (evita prefetch durante loading)
  // 2. Hay página siguiente disponible
  if (!isPlaceholderData && data?.pagination) {
    const { page, totalPages } = data.pagination
    const hasNextPage = page < totalPages

    if (hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['products', { ...queryParams, page: page + 1 }],
        queryFn: /* ... */,
      })
    }
  }
}, [data, isPlaceholderData, queryClient, queryParams])
```

**❌ Common mistake:**

```typescript
// ❌ MAL: Prefetch sin condición isPlaceholderData
useEffect(() => {
  if (data?.pagination) {
    // Esto prefetch incluso durante loading → requests duplicados
  }
}, [data])
```

---

### 2. Debounced Search Pattern

```typescript
const [searchTerm, setSearchTerm] = useState('')
const debouncedSearch = useDebounce(searchTerm, 500)

const queryParams = useMemo(
  () => ({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: debouncedSearch || undefined, // ← Usar debounced
  }),
  [pagination.pageIndex, pagination.pageSize, debouncedSearch] // ← Incluir en deps
)

const handleSearchChange = (search: string) => {
  setSearchTerm(search) // ← Actualiza searchTerm inmediatamente
  if (pagination.pageIndex !== 0) {
    setPagination({ ...pagination, pageIndex: 0 }) // ← Reset a página 1
  }
}
```

**Beneficios:**

- ✅ Usuario escribe "laptop" → 0 requests mientras escribe
- ✅ 500ms después de terminar → 1 request
- ✅ Resetea automáticamente a página 1

---

### 3. Error Handling Pattern

```typescript
const { data, isLoading, isPlaceholderData, error } = useProducts(queryParams)

if (error) {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <p className="text-destructive">Error al cargar productos</p>
      <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}>
        Reintentar
      </Button>
    </div>
  )
}
```

---

### 4. Loading States Pattern

```typescript
{
  isLoading && !isPlaceholderData ? (
    // ← Primera carga: Skeleton completo
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">Cargando productos...</div>
    </div>
  ) : (
    // ← Cambio de página: Datos anteriores visibles
    <DataTable
      columns={columns}
      data={products}
      // ...
    />
  )
}
```

**Explicación:**

- `isLoading`: `true` si NO hay datos cacheados
- `isPlaceholderData`: `true` si se está mostrando datos anteriores mientras carga nuevos
- Primera carga: `isLoading = true, isPlaceholderData = false` → Skeleton
- Cambio de página: `isLoading = false, isPlaceholderData = true` → Datos anteriores

---

## 🔧 Troubleshooting

### Problema 1: Flickering al cambiar página

**Síntoma:** Tabla se vacía y muestra "Cargando..." al cambiar página.

**Causa:** Falta `placeholderData: keepPreviousData` en hook.

**Fix:**

```diff
export function useProducts(params: ProductsQueryParams = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => { /* ... */ },
+   placeholderData: keepPreviousData, // ← Agregar esto
    staleTime: 60 * 1000,
  })
}
```

---

### Problema 2: Búsqueda retorna página vacía

**Síntoma:** Busco "laptop" y muestra página 3 vacía (pero hay 5 resultados en página 1).

**Causa:** NO reseteas `pageIndex` a 0 al buscar.

**Fix:**

```typescript
const handleSearchChange = (search: string) => {
  setSearchTerm(search)
  // ✅ Resetear a página 1
  if (pagination.pageIndex !== 0) {
    setPagination({ ...pagination, pageIndex: 0 })
  }
}
```

---

### Problema 3: Re-fetches innecesarios

**Síntoma:** Cada render hace un nuevo request.

**Causa:** `queryParams` no está memoizado.

**Fix:**

```typescript
// ✅ Memoizar queryParams
const queryParams = useMemo(
  () => ({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    search: debouncedSearch || undefined,
  }),
  [pagination.pageIndex, pagination.pageSize, debouncedSearch] // ← IMPORTANTE: deps correctas
)
```

---

### Problema 4: Prefetch no funciona

**Síntoma:** Navegación a página 2 es lenta (no está precargada).

**Causa:** Prefetch se ejecuta durante loading.

**Fix:**

```typescript
useEffect(() => {
  // ✅ Agregar condición isPlaceholderData
  if (!isPlaceholderData && data?.pagination) {
    const hasNextPage = data.pagination.page < data.pagination.totalPages
    if (hasNextPage) {
      queryClient.prefetchQuery({
        /* ... */
      })
    }
  }
}, [data, isPlaceholderData, queryClient, queryParams])
```

---

## 🚀 Advanced Topics

### Infinite Scroll (Alternativa)

Si prefieres infinite scroll en lugar de paginación:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

export function useInfiniteProducts(params: Omit<ProductsQueryParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['products-infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const searchParams = new URLSearchParams({
        page: String(pageParam),
        limit: String(params.limit || 20),
      })
      if (params.search) searchParams.set('search', params.search)

      const response = await fetch(`/api/products?${searchParams}`)
      return response.json()
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    initialPageParam: 1,
  })
}
```

---

### SSR Considerations

Para Server-Side Rendering con Next.js:

```typescript
// app/products/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export default async function ProductsPage() {
  const queryClient = new QueryClient()

  // Prefetch en servidor
  await queryClient.prefetchQuery({
    queryKey: ['products', { page: 1, limit: 20 }],
    queryFn: async () => {
      const response = await fetch('http://localhost:3000/api/products?page=1&limit=20')
      return response.json()
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsPageClient />
    </HydrationBoundary>
  )
}
```

---

## 📖 Referencias

- [DataTable README](../../components/data-table/README.md)
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [TanStack Table Docs](https://tanstack.com/table/latest)
- [ADR-013: DataTable Server-Side](../decisions/013-datatable-server-side.md)

---

**¿Necesitas ayuda?** Abre un issue o consulta al equipo.

**Última actualización:** Noviembre 2025
