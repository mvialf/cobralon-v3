# Principle 4: Test What Matters

**Regla:** Testea pure functions primero, componentes solo si son críticos.

## Filosofía: Test what breaks, not what works

No busques 100% coverage desde día 1. Enfócate en:

1. **Pure functions** (transformers) - High value, easy to test
2. **Business logic crítica** (API routes) - Medium value, medium effort
3. **Componentes críticos** - Solo si son business-critical

## Priority Pyramid

```
       /\
      /  \    3. Component Tests
     /    \   (only if critical)
    /------\
   /        \  2. API Route Tests
  /          \ (business logic)
 /------------\
/              \ 1. Transformer Tests
/________________\ (pure functions)
```

**Bottom up:** Empieza por la base, sube solo si necesitas.

## 1. Transformers (ALWAYS test these)

### Por qué

- ✅ **Easy to test** - Pure functions, no mocks
- ✅ **Fast to write** - ~5 min por test
- ✅ **Fast to run** - <1ms por test
- ✅ **High confidence** - Catch logic bugs early

### Ejemplo

```typescript
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
        stock: 15,
      },
    ]

    const result = enrichProducts(input)

    expect(result[0].priceFormatted).toBe('$1.000')
    expect(result[0].profit).toBe(400)
    expect(result[0].profitMargin).toBe(40)
    expect(result[0].stockStatus).toBe('In Stock')
  })

  it('should calculate stock status', () => {
    const highStock = [{ stock: 20, /* ... */ }]
    const lowStock = [{ stock: 5, /* ... */ }]
    const outStock = [{ stock: 0, /* ... */ }]

    expect(enrichProducts(highStock)[0].stockStatus).toBe('In Stock')
    expect(enrichProducts(lowStock)[0].stockStatus).toBe('Low Stock')
    expect(enrichProducts(outStock)[0].stockStatus).toBe('Out of Stock')
  })

  it('should handle edge cases', () => {
    const zeroPriceProduct = [{ price: 0, cost: 0, /* ... */ }]
    const result = enrichProducts(zeroPriceProduct)

    expect(result[0].profit).toBe(0)
    expect(result[0].profitMargin).toBe(0) // No division by zero
  })
})
```

**Benefits:**
- ✅ Sin mocks - pure input/output
- ✅ Rápidos - <1ms cada test
- ✅ Fáciles de escribir - ~5 min total
- ✅ Alta confianza - catches bugs en cálculos

---

## 2. API Routes (Test if critical)

### Por qué

- ⚠️ **Medium value** - Business logic importante
- ⚠️ **Medium effort** - Requiere setup de Request/Response
- ✅ **Prevent regressions** - Valida validaciones y edge cases

### Ejemplo

```typescript
// app/api/products/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { productSchema } from '@/lib/validations/product-validations'
import { z } from 'zod'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = productSchema.parse(body) // ← Validación

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

// app/api/products/__tests__/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '../route'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  db: {
    product: {
      create: vi.fn()
    }
  }
}))

describe('POST /api/products', () => {
  it('should create product with valid data', async () => {
    const mockProduct = { id: '1', name: 'Test Product', price: 1000 }
    db.product.create.mockResolvedValue(mockProduct)

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
        name: '', // ❌ Invalid: required
        price: -10, // ❌ Invalid: negative
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Validation error')
  })

  it('should handle database errors', async () => {
    db.product.create.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ /* valid data */ }),
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
  })
})
```

**Benefits:**
- ✅ Valida schema de validación
- ✅ Catch edge cases (negativos, vacíos, etc.)
- ✅ Prevent regressions

---

## 3. Components (Only if critical)

### Cuándo NO testear componentes

❌ **Skip tests para:**

- Componentes simples que solo renderizan props
- UI puro sin lógica
- Third-party components (ya están testeados)
- Componentes triviales (<10 líneas)

### Cuándo SÍ testear componentes

✅ **Test solo si:**

- **Business-critical** (checkout flow, payment form)
- **Complex UI logic** (multi-step wizard, complex validations)
- **Many edge cases** (diferentes estados, permisos, etc.)

### Ejemplo (solo si crítico)

```typescript
// components/forms/product-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema } from '@/lib/validations/product-validations'

export function ProductForm({ onSuccess }) {
  const form = useForm({
    resolver: zodResolver(productSchema),
  })

  async function onSubmit(data) {
    await fetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    onSuccess()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      <button type="submit">Save</button>
    </form>
  )
}

// components/forms/__tests__/product-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductForm } from '../product-form'

describe('ProductForm', () => {
  it('should show validation errors for empty name', async () => {
    const user = userEvent.setup()
    render(<ProductForm onSuccess={() => {}} />)

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Expect validation error
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })

  it('should call onSuccess after successful submit', async () => {
    const mockOnSuccess = vi.fn()
    const user = userEvent.setup()

    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: '1' }),
      })
    )

    render(<ProductForm onSuccess={mockOnSuccess} />)

    // Fill form
    await user.type(screen.getByLabelText(/name/i), 'Test Product')
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Expect callback
    expect(mockOnSuccess).toHaveBeenCalled()
  })
})
```

**Nota:** Solo testea si el form es CRÍTICO para negocio. Si es un form simple, skip.

---

## What NOT to Test

❌ **Don't test:**

- **Simple components** (solo renderizan props)
  ```typescript
  // ❌ NO testear esto
  export function UserCard({ user }) {
    return <div>{user.name}</div>
  }
  ```

- **Third-party libraries** (ya están testeados)
  ```typescript
  // ❌ NO testear shadcn/ui components
  import { Button } from '@/components/ui/button'
  ```

- **Trivial transformations** (one-liners)
  ```typescript
  // ❌ NO testear esto
  const uppercase = (str) => str.toUpperCase()
  ```

- **Estilos CSS** (visual regression es otro tema)

---

## Testing Workflow

### Phase 1: Transformers (Always)

```bash
# 1. Crear transformer
lib/transformers/product-transformers.ts

# 2. Crear test
lib/transformers/__tests__/product-transformers.test.ts

# 3. Run test
npm test product-transformers

# 4. Coverage target: 90%+
```

---

### Phase 2: API Routes (If critical)

```bash
# 1. Implementar route
app/api/products/route.ts

# 2. Crear test
app/api/products/__tests__/route.test.ts

# 3. Test cases:
# - Valid data (200/201)
# - Invalid data (400)
# - Server errors (500)
# - Edge cases

# 4. Coverage target: 70%+
```

---

### Phase 3: Components (Only if critical)

```bash
# Solo si:
# - Business-critical (payment, checkout)
# - Complex logic (multi-step, validations)
# - Many edge cases

# Coverage target: 50%+ (selective)
```

---

## Coverage Targets

| Tipo           | Target | Prioridad |
| -------------- | ------ | --------- |
| Transformers   | 90%+   | ✅ Alta   |
| API Routes     | 70%+   | ⚠️ Media  |
| Components     | 50%+   | 🟡 Baja   |
| Utils/Helpers  | 90%+   | ✅ Alta   |

**Nota:** Coverage NO es el único indicador. Preferir **tests significativos** sobre coverage artificial.

---

## Commands

```bash
# Run all tests
npm test

# Run specific file
npm test product-transformers

# Watch mode
npm test -- --watch

# Coverage report
npm test:coverage

# UI mode (interactive)
npm test:ui
```

---

## Common Mistakes

### ❌ Mistake 1: Testing everything (100% coverage goal)

```typescript
// ❌ NO pierdas tiempo testeando esto
describe('UserCard', () => {
  it('should render name', () => { /* ... */ })
  it('should render email', () => { /* ... */ })
  it('should render avatar', () => { /* ... */ })
  // ... 20 tests más para componente trivial
})
```

**Fix:** Solo testea transformers y lógica crítica.

---

### ❌ Mistake 2: Not testing transformers

```typescript
// ❌ Transformer sin tests
export function calculateOrderTotals(order) {
  // 50 líneas de cálculos complejos
  // ← BUG oculto aquí, sin tests que lo detecten
}
```

**Fix:** SIEMPRE testea transformers (son fáciles y valiosos).

---

### ❌ Mistake 3: Tests frágiles (coupled a implementación)

```typescript
// ❌ Test frágil - rompe con cualquier cambio de implementación
it('should call useState with empty array', () => {
  const spy = vi.spyOn(React, 'useState')
  render(<Component />)
  expect(spy).toHaveBeenCalledWith([])
})
```

**Fix:** Testea comportamiento, no implementación.

---

## Related

- [Testing Strategy](../testing-strategy/) - Estrategia completa de testing
- [Pattern 1: Read-Only Display](../patterns/1-read-only-data-display.md#testing) - Ejemplos de tests
- [Anti-Pattern: Testing Everything](../common-pitfalls/4-testing-everything.md)

---

**Remember:** Test what breaks, not what works. Transformers first, components only if critical.
