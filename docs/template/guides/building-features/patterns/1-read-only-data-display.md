# Pattern 1: Read-Only Data Display

## When to Use

- Mostrando lista de items desde database
- No edición inline
- Opcional: sorting, filtering, pagination

**Ejemplos:**

- Lista de productos
- Tabla de órdenes
- Dashboard con métricas

---

## Architecture

```
┌─────────────────────────┐
│  Server Component       │
│  (app/products/page.tsx)│
│                         │
│  1. Fetch from DB       │
│  2. Transform (if >10L) │
│  3. Pass as props       │
└────────────┬────────────┘
             ↓
┌────────────────────────────┐
│  Client Component          │
│  (components/products-     │
│   table.tsx)               │
│                            │
│  Receives data as props    │
│  Renders table             │
└────────────────────────────┘
```

---

## Step-by-Step Example: Products List

### Step 1: Server Component (Fetching)

```typescript
// app/products/page.tsx
import { db } from '@/lib/db'
import { AppLayout } from '@/components/layout/app-layout'
import { ProductsTable } from '@/components/tables/products-table'

export default async function ProductsPage() {
  // Fetch server-side (no loading state needed)
  const products = await db.product.findMany({
    include: {
      category: true,
      supplier: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <AppLayout
      pageTitle="Products"
      pageDescription="Manage your product catalog"
    >
      <ProductsTable data={products} />
    </AppLayout>
  )
}
```

**Características:**

- ✅ `async function` - Server Component
- ✅ Fetch directo con Prisma
- ✅ Includes para evitar N+1 queries
- ✅ Pre-renderizado (HTML completo desde server)

---

### Step 2: Client Component (Rendering)

```typescript
// components/tables/products-table.tsx
'use client'

import { DataTable } from '@/components/custom/data-table'
import { columns } from './products-columns'
import type { Product } from '@/lib/types/product.types'

interface ProductsTableProps {
  data: Product[]  // ← Receives pre-fetched data
}

export function ProductsTable({ data }: ProductsTableProps) {
  if (data.length === 0) {
    return <EmptyState message="No products found" />
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
    />
  )
}
```

**Características:**

- ✅ `'use client'` - Solo porque DataTable necesita interactividad
- ✅ Recibe data como props (no fetching)
- ✅ Solo renderiza (presentation logic)
- ✅ Empty state handling

---

### Step 3: When to Extract Transformers

**Si la transformación es simple (<10 líneas)**, mantén inline:

```typescript
// ✅ CORRECTO: Inline simple
const enriched = products.map((p) => ({
  ...p,
  displayName: `${p.name} - ${p.category.name}`,
}))
```

**Si la transformación es compleja (>10 líneas)**, extrae:

```typescript
// lib/transformers/product-transformers.ts
export function enrichProducts(products: ProductFromDB[]): ProductDisplay[] {
  return products.map(p => ({
    ...p,
    displayName: `${p.name} (${p.category.name})`,
    priceFormatted: new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(p.price),
    stockStatus: calculateStockStatus(p.stock),
    profit: p.price - p.cost,
    profitMargin: ((p.price - p.cost) / p.price) * 100,
    daysInStock: Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  }))
}

function calculateStockStatus(stock: number): string {
  if (stock > 10) return 'In Stock'
  if (stock > 0) return 'Low Stock'
  return 'Out of Stock'
}

// En Server Component
const enriched = enrichProducts(products)
return <ProductsTable data={enriched} />
```

---

## Testing

```typescript
// lib/transformers/__tests__/product-transformers.test.ts
import { describe, it, expect } from 'vitest'
import { enrichProducts } from '../product-transformers'

describe('enrichProducts', () => {
  it('should format price correctly', () => {
    const input = [
      {
        name: 'Widget',
        price: 1000,
        cost: 600,
        category: { name: 'Electronics' },
      },
    ]

    const result = enrichProducts(input)

    expect(result[0].priceFormatted).toBe('$1.000')
    expect(result[0].profit).toBe(400)
    expect(result[0].profitMargin).toBe(40)
  })

  it('should calculate stock status', () => {
    const highStock = [{ stock: 20 /* ... */ }]
    const lowStock = [{ stock: 5 /* ... */ }]
    const outStock = [{ stock: 0 /* ... */ }]

    expect(enrichProducts(highStock)[0].stockStatus).toBe('In Stock')
    expect(enrichProducts(lowStock)[0].stockStatus).toBe('Low Stock')
    expect(enrichProducts(outStock)[0].stockStatus).toBe('Out of Stock')
  })
})
```

**Beneficios:**

- ✅ Tests sin mocks (pure functions)
- ✅ Rápidos de escribir (~5 min por test)
- ✅ Alta confianza (catch logic bugs)

---

## Related

- [Core Principle: Server Components First](../core-principles/1-server-components-first.md)
- [Core Principle: Extract When It Hurts](../core-principles/2-extract-when-it-hurts.md)
- [Pattern 2: CRUD Operations](2-crud-operations.md) - Next step
- [DataTable Guide](../../create-new-datatable-page.md) - Advanced tables

---

**Next:** Try [Pattern 2: CRUD Operations](2-crud-operations.md) for forms and editing.
