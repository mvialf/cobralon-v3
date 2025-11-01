# When To Create Service Layer

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
