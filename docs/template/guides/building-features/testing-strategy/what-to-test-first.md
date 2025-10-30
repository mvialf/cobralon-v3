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
