# Pattern 2: CRUD Operations

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

\n---

## Related

- [Core Principle: Data Down, Events Up](../core-principles/3-data-down-events-up.md)
- [Pattern 1: Read-Only Display](1-read-only-data-display.md)
- [Pattern 3: Modal/Dialog](3-modal-dialog-interactions.md)

---

**Next:** [Pattern 3: Modal/Dialog Interactions](3-modal-dialog-interactions.md)
