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
