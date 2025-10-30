# Server Vs Client


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

