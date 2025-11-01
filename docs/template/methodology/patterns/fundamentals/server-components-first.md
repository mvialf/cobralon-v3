# Server Components por Defecto

## Regla

**Solo usa `"use client"` cuando necesites interactividad del navegador.**

## ✅ Correcto

```tsx
// Server Component por defecto
export default function MyPage() {
  return <div>Server-rendered content</div>
}
```

## ❌ Incorrecto

```tsx
// NO usar "use client" innecesariamente
'use client'
export default function MyPage() {
  return <div>Static content</div>
}
```

## Por Qué

### Ventajas de Server Components

1. **Mejor performance** - HTML pre-renderizado en el servidor
2. **Mejor SEO** - Contenido completo visible para crawlers
3. **Menos JavaScript** - Bundle size reducido en el cliente
4. **Data fetching directo** - Sin necesidad de APIs intermedias

### Cuándo Usar Client Components

Usa `"use client"` SOLO cuando necesites:

- ✅ **Interactividad:** `onClick`, `onChange`, event handlers
- ✅ **Browser APIs:** `localStorage`, `navigator`, `window`
- ✅ **React Hooks:** `useState`, `useEffect`, `useContext`
- ✅ **Third-party libraries** que dependan del browser

## Ejemplos

### Server Component para Fetching

```tsx
// ✅ CORRECTO: Fetch en Server Component
export default async function ProductsPage() {
  const products = await db.product.findMany()

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

### Client Component para Interactividad

```tsx
// ✅ CORRECTO: Client Component para interactividad
'use client'

export function ProductCard({ product }) {
  const [isLiked, setIsLiked] = useState(false)

  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => setIsLiked(!isLiked)}>{isLiked ? '❤️' : '🤍'}</button>
    </div>
  )
}
```

### Hybrid Approach (Recomendado)

```tsx
// Server Component (padre)
export default async function ProductsPage() {
  const products = await db.product.findMany()

  return (
    <div>
      {/* Client Component solo donde se necesita */}
      <ProductsList products={products} />
    </div>
  )
}

// Client Component (hijo)
;('use client')
function ProductsList({ products }) {
  const [search, setSearch] = useState('')
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {filtered.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </>
  )
}
```

## Referencias

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [When to Use Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)

---

[← Volver al índice](../README.md) | [Siguiente: Path Aliases →](path-aliases.md)
