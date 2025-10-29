# Building Features - Practical Guide

Una guía práctica para construir features en proyectos basados en este template SaaS.

**Tiempo de lectura:** 60 min completo | 15 min skimming

---

## 📋 Contenido

1. [Introduction](#introduction)
2. [Core Principles](#core-principles)
3. [Pattern 1: Read-Only Data Display](#pattern-1-read-only-data-display)
4. [Pattern 2: CRUD Operations](#pattern-2-crud-operations)
5. [Pattern 3: Modal/Dialog Interactions](#pattern-3-modaldialog-interactions)
6. [Pattern 4: Complex Relations](#pattern-4-complex-relations-nm)
7. [Decision Framework](#decision-framework)
8. [Common Pitfalls](#common-pitfalls)
9. [Testing Strategy](#testing-strategy)
10. [Scaling Your Codebase](#scaling-your-codebase)
11. [Quick Reference](#quick-reference)

---

## Introduction

### What This Guide Covers

Esta guía te muestra **cómo construir los features más comunes** en un SaaS:

- ✅ Tablas de solo lectura (mostrar datos)
- ✅ CRUD operations (crear, editar, eliminar)
- ✅ Modal/Dialog interactions
- ✅ Relaciones complejas (N:M)

**NO cubre:**

- ❌ Setup inicial (ver [Installation](../getting-started/installation.md))
- ❌ Autenticación (ver [Authentication Setup](authentication-setup.md))
- ❌ Testing exhaustivo (ver [Testing](../methodology/testing.md))

### Who Should Read This

- Developers que clonaron el template
- Quieres construir features rápidamente
- Necesitas dirección clara sobre arquitectura

### Prerequisites

- Next.js 15 + App Router conocimiento básico
- TypeScript fundamentals
- React Server Components concepts
- Template ya instalado y funcionando

---

## Core Principles

Estos 4 principios guían todas las decisiones arquitecturales en el template:

### 1. Server Components First

**Regla:** Usa Server Components para fetching de datos cuando sea posible.

**Por qué:**

- ✅ Mejor performance (pre-renderizado)
- ✅ Mejor SEO (HTML completo desde el server)
- ✅ Menos JavaScript al cliente

**Cuándo usar Client Component:**

- Solo cuando necesites interactividad
- Browser APIs (localStorage, navigator)
- Hooks de React (useState, useEffect)

```typescript
// ✅ CORRECTO: Server Component para fetching
export default async function ProductsPage() {
  const products = await db.product.findMany()
  return <ProductsTable data={products} />
}

// ❌ INCORRECTO: Client Component para fetching simple
'use client'
export default function ProductsPage() {
  const [products, setProducts] = useState([])
  useEffect(() => {
    fetch('/api/products').then(...)
  }, [])
  // ...
}
```

---

### 2. Extract When It Hurts

**Regla:** Mantén lógica inline inicialmente. Extrae cuando duela.

**Extrae a `lib/transformers/` cuando:**

- ✅ Lógica es >10 líneas
- ✅ Se usa en 2+ lugares
- ✅ Es transformación pura (input → output, sin side effects)
- ✅ Quieres testearla fácilmente

**NO extraigas si:**

- ❌ Es simple map/filter (<5 líneas)
- ❌ Se usa solo 1 vez
- ❌ Es solo formateo (fechas, montos)

```typescript
// ✅ CORRECTO: Extraer lógica compleja
// lib/transformers/product-transformers.ts
export function enrichProducts(products: ProductFromDB[]): ProductDisplay[] {
  return products.map((p) => ({
    ...p,
    displayName: `${p.name} (${p.category.name})`,
    priceFormatted: new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(p.price),
    stockStatus: p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock',
    profit: p.price - p.cost,
    profitMargin: ((p.price - p.cost) / p.price) * 100,
  }))
}

// ❌ INCORRECTO: Inline 15+ líneas de lógica en componente
export function ProductsTable({ products }) {
  const enriched = products.map((p) => ({
    ...p,
    displayName: `${p.name} (${p.category.name})`,
    // ... 15 líneas más ...
  }))
  // ...
}
```

**Filosofía:** YAGNI (You Aren't Gonna Need It) - No optimices anticipadamente.

---

### 3. Data Down, Events Up

**Regla:** Componentes reciben data como props, emiten eventos vía callbacks.

**Pattern:**

```
[Parent Component]
    ↓ data (props)
[Child Component]
    ↑ events (callbacks)
[Parent Component]
```

```typescript
// ✅ CORRECTO: Data down, events up
interface ProductFormProps {
  initialData?: Product // Data down
  onSuccess: () => void // Events up
  onCancel: () => void // Events up
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  // Form logic
  const handleSubmit = async (data) => {
    await saveProduct(data)
    onSuccess() // Emit event up
  }
  // ...
}

// ❌ INCORRECTO: Componente maneja su propio estado global
export function ProductForm() {
  const [products, setProducts] = useGlobalProducts() // Tight coupling
  const handleSubmit = async (data) => {
    await saveProduct(data)
    setProducts([...products, data]) // Modifica estado global
  }
}
```

**Beneficios:**

- ✅ Componentes reutilizables
- ✅ Testing más fácil
- ✅ Menos acoplamiento

---

### 4. Test What Matters

**Regla:** Testea pure functions primero, componentes solo si son críticos.

**Priority:**

1. **Transformers (pure functions)** - High value, easy to test
2. **API Routes** - Medium value, medium effort
3. **Components** - Only if business-critical

```typescript
// ✅ FÁCIL de testear: Pure function
describe('enrichProducts', () => {
  it('should format price correctly', () => {
    const input = [{ name: 'Widget', price: 1000, cost: 600 }]
    const result = enrichProducts(input)
    expect(result[0].priceFormatted).toBe('$1,000')
    expect(result[0].profit).toBe(400)
  })
})

// ⚠️ MÁS DIFÍCIL: Component test (solo si es crítico)
describe('ProductForm', () => {
  it('should submit form', async () => {
    render(<ProductForm onSuccess={mockSuccess} />)
    // ... setup, interactions, assertions
  })
})
```

**Filosofía:** Test what breaks, not what works.

---

## Pattern 1: Read-Only Data Display

### When to Use

- Mostrando lista de items desde database
- No edición inline
- Opcional: sorting, filtering, pagination

**Ejemplos:**

- Lista de productos
- Tabla de órdenes
- Dashboard con métricas

---

### Architecture

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

### Step-by-Step Example: Products List

#### Step 1: Server Component (Fetching)

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

#### Step 2: Client Component (Rendering)

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

#### Step 3: When to Extract Transformers

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

### Testing

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

## Pattern 2: CRUD Operations

### When to Use

- Creating new records
- Editing existing records
- Form con validación
- Submission a database

**Ejemplos:**

- Create product
- Edit user profile
- Add team member

---

### Architecture

```
┌─────────────────────────┐
│  Dialog Component       │
│  (trigger + content)    │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Form Component         │
│  (React Hook Form)      │
│                         │
│  1. Validation (Zod)    │
│  2. Submit to API       │
│  3. Handle response     │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  API Route              │
│  (app/api/products/     │
│   route.ts)             │
│                         │
│  1. Validate again      │
│  2. Save to DB          │
│  3. Return response     │
└─────────────────────────┘
```

---

### Step-by-Step Example: Create Product

#### Step 1: Validation Schema

```typescript
// lib/validations/product-validations.ts
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  cost: z.number().min(0, 'Cost must be positive'),
  stock: z.number().int().min(0),
  categoryId: z.string().uuid('Invalid category'),
  supplierId: z.string().uuid('Invalid supplier').optional(),
  sku: z.string().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>
```

**Por qué Zod:**

- ✅ Validación en frontend Y backend (mismo schema)
- ✅ Type inference automático
- ✅ Mensajes de error customizables

---

#### Step 2: Form Component

```typescript
// components/forms/products/product-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormData } from '@/lib/validations/product-validations'
import { Button } from '@/components/ui/button'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  onSuccess: () => void
  onCancel?: () => void
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      price: 0,
      cost: 0,
      stock: 0,
      categoryId: '',
      sku: ''
    }
  })

  async function onSubmit(data: ProductFormData) {
    try {
      const response = await fetch('/api/products', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save product')
      }

      toast.success(initialData ? 'Product updated' : 'Product created')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Más fields... */}

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

---

#### Step 3: API Route

```typescript
// app/api/products/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { productSchema } from '@/lib/validations/product-validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate (backend validation - ALWAYS)
    const validated = productSchema.parse(body)

    // Create in database
    const product = await db.product.create({
      data: validated,
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating product:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')

  const products = await db.product.findMany({
    take: limit,
    skip: (page - 1) * limit,
    include: { category: true },
  })

  return NextResponse.json({ products })
}
```

---

#### Step 4: Wrap in Dialog

```typescript
// components/dialogs/products/new-product-dialog.tsx
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ProductForm } from '@/components/forms/products/product-form'
import { Plus } from 'lucide-react'

export function NewProductDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>
        <ProductForm
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
```

---

### Testing

```typescript
// app/api/products/__tests__/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { POST } from '../route'

describe('POST /api/products', () => {
  it('should create product with valid data', async () => {
    const request = new Request('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Product',
        price: 1000,
        cost: 600,
        stock: 10,
        categoryId: 'valid-uuid',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe('Test Product')
  })

  it('should reject invalid data', async () => {
    const request = new Request('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: '', // Invalid: required
        price: -10, // Invalid: negative
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

---

## Pattern 3: Modal/Dialog Interactions

### When to Use

- Confirmaciones (delete, cancel)
- Forms pequeños (quick create)
- Detalles adicionales (view more)
- Actions destructivas

**Ejemplos:**

- Confirm delete
- Quick add note
- View order details

---

### Architecture

```
┌─────────────────────────┐
│  Trigger Component      │
│  (Button, MenuItem)     │
└────────────┬────────────┘
             ↓ opens
┌─────────────────────────┐
│  Dialog Component       │
│                         │
│  ├─ Header (title)      │
│  ├─ Content (body)      │
│  └─ Footer (actions)    │
└────────────┬────────────┘
             ↓ action
┌─────────────────────────┐
│  Callback / API call    │
└─────────────────────────┘
```

---

### Example 1: Confirm Delete

```typescript
// components/dialogs/confirm-delete-dialog.tsx
'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface ConfirmDeleteDialogProps {
  onConfirm: () => void | Promise<void>
  children: React.ReactNode  // Trigger button
  title?: string
  description?: string
}

export function ConfirmDeleteDialog({
  onConfirm,
  children,
  title = 'Are you sure?',
  description = 'This action cannot be undone.'
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Uso
<ConfirmDeleteDialog
  onConfirm={async () => {
    await deleteProduct(product.id)
    toast.success('Product deleted')
  }}
>
  <Button variant="destructive">Delete</Button>
</ConfirmDeleteDialog>
```

---

### Example 2: View Details Dialog

```typescript
// components/dialogs/products/view-product-dialog.tsx
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Product } from '@/lib/types/product.types'

interface ViewProductDialogProps {
  product: Product
  children: React.ReactNode
}

export function ViewProductDialog({ product, children }: ViewProductDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p>{product.description || 'No description'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="font-semibold">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock</p>
              <p className="font-semibold">{product.stock} units</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Uso
<ViewProductDialog product={product}>
  <Button variant="ghost">View Details</Button>
</ViewProductDialog>
```

---

## Pattern 4: Complex Relations (N:M)

### When to Use

- Many-to-many relationships
- Allocation/assignment scenarios
- Join tables con data adicional
- Aggregations complejas

**Ejemplos:**

- Order con OrderItems (Order ← OrderItem → Product)
- Project con Payments vía Allocations
- User con Roles vía UserRole

---

### Architecture

```
┌─────────────────────────┐
│  Server Component       │
│                         │
│  1. Fetch with includes │
│  2. Transform N:M       │
│  3. Pass processed data │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Transformer (optional) │
│                         │
│  - Flatten structure    │
│  - Calculate aggregates │
│  - Group/filter         │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  Client Component       │
│                         │
│  Display data           │
└─────────────────────────┘
```

---

### Example: Order with Line Items

**Database schema:**

```prisma
model Order {
  id          String      @id @default(uuid())
  orderNumber String      @unique
  customerId  String
  customer    Customer    @relation(fields: [customerId], references: [id])
  items       OrderItem[]
  createdAt   DateTime    @default(now())
}

model OrderItem {
  id         String  @id @default(uuid())
  orderId    String
  order      Order   @relation(fields: [orderId], references: [id])
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  quantity   Int
  unitPrice  Decimal @db.Decimal(12, 2)
}

model Product {
  id    String @id @default(uuid())
  name  String
  price Decimal @db.Decimal(12, 2)
}
```

---

#### Step 1: Fetch with Includes

```typescript
// app/orders/[id]/page.tsx
import { db } from '@/lib/db'
import { calculateOrderTotals } from '@/lib/transformers/order-transformers'
import { OrderDetailsView } from '@/components/orders/order-details-view'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      }
    }
  })

  if (!order) {
    return <div>Order not found</div>
  }

  // Transform if complex (>10 lines)
  const totals = calculateOrderTotals(order)

  return (
    <AppLayout pageTitle={`Order #${order.orderNumber}`}>
      <OrderDetailsView order={order} totals={totals} />
    </AppLayout>
  )
}
```

---

#### Step 2: Transformer (Pure Functions)

```typescript
// lib/transformers/order-transformers.ts
import type { OrderWithItems } from '@/lib/types/order.types'

export interface OrderTotals {
  subtotal: number
  tax: number
  total: number
  itemCount: number
}

/**
 * Calculate order totals from line items
 */
export function calculateOrderTotals(order: OrderWithItems): OrderTotals {
  const subtotal = order.items.reduce((sum, item) => {
    return sum + item.quantity * Number(item.unitPrice)
  }, 0)

  const tax = subtotal * 0.19 // 19% IVA

  return {
    subtotal,
    tax,
    total: subtotal + tax,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

/**
 * Group order items by product category
 */
export function groupItemsByCategory(items: OrderItem[]): Record<string, OrderItem[]> {
  return items.reduce(
    (acc, item) => {
      const category = item.product.category.name
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    },
    {} as Record<string, OrderItem[]>
  )
}
```

---

#### Step 3: Display Components

```typescript
// components/orders/order-details-view.tsx
'use client'

import type { OrderWithItems, OrderTotals } from '@/lib/types/order.types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  order: OrderWithItems
  totals: OrderTotals
}

export function OrderDetailsView({ order, totals }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Order #{order.orderNumber}</h2>
        <p className="text-muted-foreground">
          Customer: {order.customer.name}
        </p>
      </div>

      <OrderItemsTable items={order.items} />

      <OrderSummary totals={totals} />
    </div>
  )
}

function OrderItemsTable({ items }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.product.name}</td>
            <td>{item.quantity}</td>
            <td>{formatCurrency(item.unitPrice)}</td>
            <td>{formatCurrency(item.quantity * item.unitPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function OrderSummary({ totals }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Subtotal ({totals.itemCount} items)</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax (19%)</span>
        <span>{formatCurrency(totals.tax)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>{formatCurrency(totals.total)}</span>
      </div>
    </div>
  )
}
```

---

### Testing N:M Transformers

```typescript
// lib/transformers/__tests__/order-transformers.test.ts
import { describe, it, expect } from 'vitest'
import { calculateOrderTotals } from '../order-transformers'

describe('calculateOrderTotals', () => {
  it('should calculate totals correctly', () => {
    const order = {
      id: '1',
      items: [
        { quantity: 2, unitPrice: 1000, product: { name: 'A' } },
        { quantity: 1, unitPrice: 500, product: { name: 'B' } },
      ],
    }

    const totals = calculateOrderTotals(order)

    expect(totals.subtotal).toBe(2500)
    expect(totals.tax).toBe(475) // 19% of 2500
    expect(totals.total).toBe(2975)
    expect(totals.itemCount).toBe(3)
  })

  it('should handle empty order', () => {
    const order = { id: '1', items: [] }
    const totals = calculateOrderTotals(order)

    expect(totals.subtotal).toBe(0)
    expect(totals.total).toBe(0)
    expect(totals.itemCount).toBe(0)
  })
})
```

---

## Decision Framework

Esta sección responde las preguntas que te haces TODO EL TIEMPO:

### When to Extract Transformers

**Extract to `lib/transformers/` if:**

- ✅ Logic is >10 lines
- ✅ Used in 2+ places
- ✅ Pure transformation (input → output, no side effects)
- ✅ You want to test it easily

**Keep inline if:**

- ❌ Simple map/filter (<5 lines)
- ❌ Used only once
- ❌ Just formatting (dates, currency)

```typescript
// ✅ EXTRACT: Complex logic (>10 lines, reusable)
export function enrichProducts(products: ProductFromDB[]) {
  return products.map((p) => ({
    // ... 15 líneas de transformación
  }))
}

// ✅ INLINE: Simple transformation (<5 lines)
const formatted = products.map((p) => ({ ...p, name: p.name.toUpperCase() }))
```

---

### When to Create Custom Hooks

**Create hook if:**

- ✅ Complex client-side state management
- ✅ Reusable logic across 3+ components
- ✅ Side effects (fetch, localStorage, WebSocket)

**Don't create hook if:**

- ❌ Component receives data as props (use that)
- ❌ Logic is just transformations (use transformers)
- ❌ Used only once (keep inline)

```typescript
// ✅ HOOK: Complex state + side effects
export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  return { products, loading }
}

// ❌ NO HOOK: Just props
function ProductsTable({ data }) {  // ← Recibe data, no necesita hook
  return <table>...</table>
}
```

---

### Server vs Client Component

**Use Server Component if:**

- ✅ Just displaying data (no interactivity)
- ✅ Fetching from database
- ✅ SEO matters

**Use Client Component if:**

- ✅ User interaction (forms, buttons, state)
- ✅ Browser APIs (localStorage, navigator)
- ✅ Real-time updates

```typescript
// ✅ SERVER: Just displaying
export default async function ProductsPage() {
  const products = await db.product.findMany()
  return <ProductsList products={products} />
}

// ✅ CLIENT: Interactivity
'use client'
export function ProductsList({ products }) {
  const [search, setSearch] = useState('')
  const filtered = products.filter(p => p.name.includes(search))
  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.map(...)}
    </>
  )
}
```

---

### When to Create Service Layer

**Create service if:**

- ✅ Abstraction over third-party API
- ✅ Complex retry/error handling logic
- ✅ Need to mock in tests

**Don't create service if:**

- ❌ Simple Prisma queries (use directly)
- ❌ Just wrapping fetch (use Server Components)
- ❌ One-off operations

```typescript
// ✅ SERVICE: Third-party API abstraction
export class StripeService {
  async createPaymentIntent(amount: number) {
    // Retry logic, error handling, etc.
  }
}

// ❌ NO SERVICE: Simple Prisma (use directly)
// No necesitas esto:
export class ProductService {
  async getAll() {
    return await db.product.findMany()
  }
}

// Mejor esto:
const products = await db.product.findMany()
```

---

## Common Pitfalls

### ❌ Anti-Pattern 1: Over-Extracting Too Soon

**Problem:** Crear transformers/hooks antes de necesitarlos.

```typescript
// ❌ INCORRECTO: Extraer prematuramente
// lib/transformers/user-transformers.ts
export function formatUserName(user: User) {
  return user.name.toUpperCase() // 1 línea, usado 1 vez
}

// Usar en componente:
const formatted = formatUserName(user)
```

**Solution:** Wait until it hurts (YAGNI).

```typescript
// ✅ CORRECTO: Keep inline hasta que duela
const formatted = user.name.toUpperCase()

// Solo extrae cuando:
// - Se usa en 2+ lugares
// - Crece a >10 líneas
// - Necesitas testearlo
```

**Why it matters:** Menos archivos = más fácil navegar codebase.

---

### ❌ Anti-Pattern 2: Client Component for Everything

**Problem:** Marcar todo como `"use client"`.

```typescript
// ❌ INCORRECTO: Client Component innecesario
'use client'
export default function ProductsPage() {
  // No hay interactividad, solo display
  return <div>Static content</div>
}
```

**Solution:** Server Components por defecto.

```typescript
// ✅ CORRECTO: Server Component (sin "use client")
export default async function ProductsPage() {
  const products = await db.product.findMany()
  return <ProductsTable data={products} />
}
```

**Why it matters:**

- Menos JavaScript al cliente
- Mejor performance
- Mejor SEO

---

### ❌ Anti-Pattern 3: Inline Complex Logic

**Problem:** 50+ líneas de transformación dentro del componente.

```typescript
// ❌ INCORRECTO: 30 líneas inline
export function ProductsTable({ products }) {
  const enriched = products.map(p => ({
    ...p,
    displayName: `${p.name} (${p.category.name})`,
    priceFormatted: new Intl.NumberFormat(...).format(p.price),
    stockStatus: p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out',
    profit: p.price - p.cost,
    profitMargin: ((p.price - p.cost) / p.price) * 100,
    // ... 20 líneas más
  }))

  return <table>...</table>
}
```

**Solution:** Extracta a transformers cuando >10 líneas.

```typescript
// ✅ CORRECTO: Lógica extraída
// lib/transformers/product-transformers.ts
export function enrichProducts(products) {
  // ... lógica compleja aquí
}

// Componente limpio
export function ProductsTable({ products }) {
  const enriched = enrichProducts(products)
  return <table>...</table>
}
```

---

### ❌ Anti-Pattern 4: Testing Everything

**Problem:** Intentar 100% coverage desde día 1.

```typescript
// ❌ INCORRECTO: Testear componente simple
describe('ProductCard', () => {
  it('should render name', () => { ... })
  it('should render price', () => { ... })
  it('should render image', () => { ... })
  // ... 20 tests más
})
```

**Solution:** Testea transformers (fácil), luego componentes críticos.

```typescript
// ✅ CORRECTO: Testea transformers primero
describe('enrichProducts', () => {
  it('should calculate profit', () => { ... })
  it('should format price', () => { ... })
})

// Component tests solo si es crítico
```

**Why it matters:** Tests de transformers son:

- Más fáciles de escribir (no mocks)
- Más valiosos (catch logic bugs)
- Más rápidos de ejecutar

---

### ❌ Anti-Pattern 5: Not Using Server Components

**Problem:** Fetch client-side cuando podrías hacer server-side.

```typescript
// ❌ INCORRECTO: Client-side fetch
'use client'
export default function ProductsPage() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(setProducts)
  }, [])

  return <ProductsTable data={products} />
}
```

**Solution:** Usa Server Components para fetching.

```typescript
// ✅ CORRECTO: Server-side fetch
export default async function ProductsPage() {
  const products = await db.product.findMany()
  return <ProductsTable data={products} />
}
```

**Why it matters:**

- Más rápido (pre-renderizado)
- Mejor SEO
- Menos código

---

### ❌ Anti-Pattern 6: Premature Optimization

**Problem:** Agregar cache/memoization antes de medir.

```typescript
// ❌ INCORRECTO: Optimizar sin medir
const MemoizedComponent = React.memo(ProductCard)
const memoizedValue = useMemo(() => expensiveCalc(data), [data])
```

**Solution:** Mide primero, optimiza después.

```typescript
// ✅ CORRECTO: Start simple
function ProductCard({ product }) {
  return <div>{product.name}</div>
}

// Solo optimiza si:
// - Profiler muestra slow render
// - Users reportan lag
// - Métricas muestran problema
```

---

### ❌ Anti-Pattern 7: Mixing Concerns in Components

**Problem:** Componente que fetchea + transforma + renderiza.

```typescript
// ❌ INCORRECTO: Todas las responsabilidades mezcladas
'use client'
export function ProductsTable() {
  const [data, setData] = useState([])

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(products => {
        // Transformación inline
        const enriched = products.map(p => ({ ... }))
        setData(enriched)
      })
  }, [])

  return <table>...</table>
}
```

**Solution:** Separa concerns (Server Component → Transformer → Client Component).

```typescript
// ✅ CORRECTO: Concerns separados

// 1. Server Component (fetching)
export default async function ProductsPage() {
  const products = await db.product.findMany()
  const enriched = enrichProducts(products)  // 2. Transformer
  return <ProductsTable data={enriched} />  // 3. Client Component
}
```

---

## Testing Strategy

### Testing Pyramid

```
       /\
      /  \    Component Tests
     /    \   (if critical)
    /------\
   /        \  Transformer Tests
  /          \ (pure functions)
 /------------\
/              \ E2E Tests
/                \ (critical flows)
```

**Priority:**

1. **Transformers** (high value, easy)
2. **API Routes** (medium value, medium effort)
3. **Components** (only if critical)

---

### What to Test First

#### 1. Transformers (High Value, Easy)

```typescript
// lib/transformers/__tests__/product-transformers.test.ts
import { describe, it, expect } from 'vitest'
import { enrichProducts } from '../product-transformers'

describe('enrichProducts', () => {
  it('should format price correctly', () => {
    const input = [{ name: 'Widget', price: 1000, cost: 600 }]
    const result = enrichProducts(input)

    expect(result[0].priceFormatted).toBe('$1,000')
    expect(result[0].profit).toBe(400)
    expect(result[0].profitMargin).toBe(40)
  })

  it('should handle edge cases', () => {
    const input = [{ name: 'Widget', price: 0, cost: 0 }]
    const result = enrichProducts(input)

    expect(result[0].profit).toBe(0)
    expect(result[0].profitMargin).toBe(0) // No division by zero
  })
})
```

**Why test transformers:**

- ✅ Pure functions (no mocks needed)
- ✅ Easy to write (~5 min per test)
- ✅ High confidence (catches logic bugs)
- ✅ Fast to run (<1ms per test)

---

#### 2. API Routes (Medium Value, Medium Effort)

```typescript
// app/api/products/__tests__/route.test.ts
import { describe, it, expect } from 'vitest'
import { POST, GET } from '../route'

describe('POST /api/products', () => {
  it('should create product with valid data', async () => {
    const request = new Request('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Product',
        price: 1000,
        cost: 600,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.name).toBe('Test Product')
  })

  it('should reject invalid data', async () => {
    const request = new Request('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name: '', // Invalid
        price: -10, // Invalid
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

---

#### 3. Components (Only if Critical)

**Only test if:**

- Business-critical component
- Complex UI logic
- Many edge cases

```typescript
// components/forms/__tests__/product-form.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductForm } from '../product-form'

describe('ProductForm', () => {
  it('should show validation errors', async () => {
    const user = userEvent.setup()
    render(<ProductForm onSuccess={() => {}} />)

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Expect validation errors
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })
})
```

---

### What NOT to Test

❌ **Don't test:**

- Simple components (just rendering props)
- Third-party libraries (already tested)
- Trivial transformations (one-liners)
- Every single component

**Philosophy:** Test what breaks, not what works.

---

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test product-transformers

# Generate coverage report
npm test:coverage
```

---

## Scaling Your Codebase

### From 1 to 10 Components

**Signals:**

- ✅ Copying same transformation logic 2+ times
- ✅ Components growing >200 lines
- ✅ Testing becomes difficult

**Actions:**

1. Extract repeated transformations to `lib/transformers/`
2. Create shared types in `lib/types/`
3. Write tests for transformers (easy wins)

**Don't worry about:**

- ❌ Service Layer (not needed yet)
- ❌ Custom hooks (props are fine)
- ❌ Over-optimization

---

### From 10 to 50 Components

**Signals:**

- ✅ Same fetching logic in 3+ places
- ✅ Complex client-side state
- ✅ Real-time updates needed

**Actions:**

1. Consider custom hooks for reusable client logic
2. Add server-side caching (React `cache()`)
3. Extract business logic to dedicated modules

**You might need:**

- ⚠️ Custom hooks (for complex state)
- ⚠️ Service layer (if abstracting APIs)
- ⚠️ State management (Zustand, Jotai)

---

### When to Refactor

**Refactor when you feel pain:**

- 🔴 Bugs in same component repeatedly
- 🔴 Taking >2 hours to add simple feature
- 🔴 New developers struggle to understand
- 🔴 Tests are hard to write

**Don't refactor when:**

- 🟢 Code works fine
- 🟢 No bugs
- 🟢 Easy to maintain
- 🟢 Tests pass

**Philosophy:** "If it ain't broke, don't fix it."

---

### Progressive Enhancement

```
Phase 1: Inline everything
    ↓ (feels pain)
Phase 2: Extract transformers
    ↓ (more reuse needed)
Phase 3: Create custom hooks
    ↓ (complex state management)
Phase 4: Add service layer
    ↓ (only if necessary)
```

**Start at Phase 1.** Move to next phase only when you feel the pain.

---

## Quick Reference

### Checklists

#### Creating a New Feature

- [ ] Is it read-only? → Server Component
- [ ] Needs interactivity? → Client Component
- [ ] Complex transformation (>10 lines)? → Extract to `lib/transformers/`
- [ ] Used in 2+ places? → Definitely extract
- [ ] Create validation schema (`lib/validations/`)
- [ ] Write tests for transformers (if extracted)
- [ ] Manual test in browser

---

#### Before Committing

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Tests pass (if you wrote them)
- [ ] Component renders correctly (manual test)
- [ ] No console errors

---

### Command Reference

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Quality checks
npm run typecheck        # TypeScript validation
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix linting issues

# Testing
npm test                 # Run all tests
npm test:ui              # Interactive test UI
npm test:coverage        # Coverage report

# Database
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma Client
```

---

### File Structure Template

Cuando crees un feature nuevo, usa esta estructura:

```
feature-name/
├── app/
│   └── feature/
│       ├── page.tsx              (Server Component)
│       ├── [id]/page.tsx         (Detail page)
│       └── columns.tsx           (DataTable columns)
│
├── components/
│   ├── forms/feature/
│   │   └── feature-form.tsx      (Client Component form)
│   ├── tables/
│   │   └── feature-table.tsx     (Client Component table)
│   └── dialogs/feature/
│       ├── new-feature-dialog.tsx
│       └── edit-feature-dialog.tsx
│
├── lib/
│   ├── transformers/
│   │   ├── feature-transformers.ts
│   │   └── __tests__/
│   │       └── feature-transformers.test.ts
│   ├── validations/
│   │   └── feature-validations.ts
│   └── types/
│       └── feature.types.ts
│
└── app/api/
    └── feature/
        ├── route.ts              (GET, POST)
        └── [id]/
            └── route.ts          (GET, PUT, DELETE)
```

---

### Pattern Decision Tree

```
Need to build a feature?
    ↓
Is it just displaying data?
    ├─ Yes → Pattern 1: Read-Only Display
    └─ No → Needs user input?
           ├─ Yes → Pattern 2: CRUD Operations
           └─ No → Is it a confirmation/view?
                  ├─ Yes → Pattern 3: Modal/Dialog
                  └─ No → Complex relations?
                         └─ Yes → Pattern 4: N:M Relations
```

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md) - High-level architecture
- [Code Patterns](../methodology/patterns.md) - Specific code patterns
- [Testing Strategy](../methodology/testing.md) - Comprehensive testing guide
- [Create DataTable Page](create-new-datatable-page.md) - DataTable tutorial
- [Database Setup](database-setup.md) - Prisma + Neon setup

---

## Conclusion

Esta guía cubre los 4 patterns más comunes en un SaaS (80% de casos):

1. ✅ Read-Only Display
2. ✅ CRUD Operations
3. ✅ Modal/Dialog Interactions
4. ✅ Complex Relations (N:M)

**Core Principles:**

- Server Components First
- Extract When It Hurts
- Data Down, Events Up
- Test What Matters

**Remember:** Start simple, refactor when it hurts. No premature optimization.

**Next Steps:**

- Build your first feature using Pattern 1
- Add tests for transformers
- Scale gradually as needed

---

**Questions?** Check [Code Patterns](../methodology/patterns.md) for more specific patterns.
