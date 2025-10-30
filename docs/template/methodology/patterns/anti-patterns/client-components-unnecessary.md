# Anti-Patrón: Client Components Innecesarios

## El Problema

Marcar componentes con `"use client"` cuando no es necesario genera JavaScript innecesario en el cliente y degrada performance.

## ❌ Incorrecto

```tsx
// app/products/page.tsx
'use client' // ❌ Innecesario

export default function ProductsPage() {
  return (
    <div>
      <h1>Productos</h1>
      <p>Static content sin interactividad</p>
    </div>
  )
}
```

**Problemas:**

- ❌ JavaScript adicional enviado al cliente
- ❌ Peor performance (no pre-renderizado)
- ❌ Peor SEO (HTML incompleto desde el server)
- ❌ No aprovecha Server Components

## ✅ Correcto

```tsx
// app/products/page.tsx
// Sin "use client" - Server Component por defecto

export default async function ProductsPage() {
  // Fetch directo desde server
  const products = await db.product.findMany()

  return (
    <div>
      <h1>Productos</h1>
      <ProductsList products={products} />
    </div>
  )
}
```

**Ventajas:**

- ✅ HTML completo pre-renderizado
- ✅ Mejor SEO
- ✅ Menor bundle size
- ✅ Fetch sin APIs intermedias

## Cuándo SÍ Usar "use client"

**Solo cuando necesites:**

1. **Interactividad del navegador**
   ```tsx
   'use client'

   export function Counter() {
     const [count, setCount] = useState(0)

     return <button onClick={() => setCount(count + 1)}>{count}</button>
   }
   ```

2. **Browser APIs**
   ```tsx
   'use client'

   export function ThemeToggle() {
     const [theme, setTheme] = useState(localStorage.getItem('theme'))
     // localStorage solo existe en el navegador
   }
   ```

3. **React Hooks**
   ```tsx
   'use client'

   export function SearchForm() {
     const [search, setSearch] = useState('')
     useEffect(() => {
       // Effect solo corre en cliente
     }, [search])
   }
   ```

4. **Event Handlers**
   ```tsx
   'use client'

   export function SubmitButton() {
     return <button onClick={() => alert('Clicked!')}>Submit</button>
   }
   ```

## Patrón Híbrido (Recomendado)

Combina Server Components (fetching) con Client Components (interactividad):

```tsx
// app/products/page.tsx
// Server Component (NO "use client")

export default async function ProductsPage() {
  // Fetch en server
  const products = await db.product.findMany()

  return (
    <div>
      <h1>Productos</h1>
      {/* Client Component solo donde se necesita */}
      <ProductsSearch products={products} />
    </div>
  )
}

// components/products-search.tsx
'use client' // Solo este componente es cliente

export function ProductsSearch({ products }) {
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

**Ventajas del híbrido:**

- ✅ Fetch en server (más rápido, sin loading states)
- ✅ Interactividad solo donde se necesita
- ✅ Mejor performance general
- ✅ Los `children` del layout pueden ser Server Components

## Regla de Oro

> **Server Components por defecto. Client Components solo cuando sea absolutamente necesario.**

## Checklist: ¿Necesito "use client"?

Pregúntate:

- [ ] ¿Usa `useState`, `useEffect`, u otros hooks de React?
- [ ] ¿Tiene event handlers (`onClick`, `onChange`, etc.)?
- [ ] ¿Accede a browser APIs (`localStorage`, `navigator`, etc.)?
- [ ] ¿Necesita Context Consumer que dependa de state?

**Si todas son NO → NO uses `"use client"`**

## Referencias

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [When to Use Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns)
- [Patrón: Server Components First](../fundamentals/server-components-first.md)

---

[← Volver al índice](README.md) | [Siguiente: Props Drilling →](props-drilling.md)
