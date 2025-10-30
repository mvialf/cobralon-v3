
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

