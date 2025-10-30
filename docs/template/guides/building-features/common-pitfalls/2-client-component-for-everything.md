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
