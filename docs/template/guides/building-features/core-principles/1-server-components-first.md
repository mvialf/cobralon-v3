# Principle 1: Server Components First

**Regla:** Usa Server Components para fetching de datos cuando sea posible.

## Por qué

- ✅ **Mejor performance** - HTML pre-renderizado desde el server
- ✅ **Mejor SEO** - Contenido completo disponible para crawlers
- ✅ **Menos JavaScript** - Reduce el bundle size enviado al cliente
- ✅ **Fetch más rápido** - Acceso directo a database sin round-trip HTTP

## Cuándo usar Client Component

Solo cuando necesites:

- **Interactividad** - useState, useEffect, event handlers
- **Browser APIs** - localStorage, navigator, window
- **Hooks de React** - Cualquier hook personalizado que dependa de client state
- **Real-time updates** - WebSockets, subscriptions

## Ejemplos

### ✅ CORRECTO: Server Component para fetching

```typescript
// app/products/page.tsx
import { db } from '@/lib/db'
import { ProductsTable } from '@/components/tables/products-table'

export default async function ProductsPage() {
  // Fetch server-side - NO loading state needed
  const products = await db.product.findMany({
    include: {
      category: true,
      supplier: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return <ProductsTable data={products} />
}
```

**Por qué esto funciona:**
- Fetch completa ANTES de enviar HTML al cliente
- No hay flash de loading spinner
- SEO ve contenido completo
- Usuario ve data instantáneamente

---

### ❌ INCORRECTO: Client Component para fetching simple

```typescript
// app/products/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { ProductsTable } from '@/components/tables/products-table'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>

  return <ProductsTable data={products} />
}
```

**Por qué está MAL:**
- ❌ Doble round-trip: HTML vacío → fetch API → render data
- ❌ Usuario ve loading spinner innecesario
- ❌ SEO NO ve contenido (HTML inicial vacío)
- ❌ Más JavaScript enviado al cliente (useState, useEffect)

---

## Patrón Híbrido: Server + Client

Lo IDEAL es combinar ambos:

```typescript
// app/products/page.tsx (Server Component)
export default async function ProductsPage() {
  const products = await db.product.findMany() // ← Server fetch
  return <ProductsTable data={products} />     // ← Pass as props
}

// components/tables/products-table.tsx (Client Component)
'use client'

import { useState } from 'react'
import { DataTable } from '@/components/custom/data-table'

export function ProductsTable({ data }) {
  const [search, setSearch] = useState('') // ← Client interactivity

  const filtered = data.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search..."
      />
      <DataTable data={filtered} />
    </>
  )
}
```

**Lo mejor de ambos mundos:**
- ✅ Fetch en server (performance)
- ✅ Interactividad en client (UX)
- ✅ Data down, events up (clean architecture)

---

## Casos especiales

### Caso 1: Datos que cambian frecuentemente (Real-time)

Si necesitas updates en tiempo real:

```typescript
'use client'

export function LiveOrdersTable() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    const ws = new WebSocket('wss://api.example.com/orders')
    ws.onmessage = (msg) => setOrders(JSON.parse(msg.data))
    return () => ws.close()
  }, [])

  return <OrdersTable data={orders} />
}
```

**Justificación:** WebSockets requieren client-side. Esto es CORRECTO.

---

### Caso 2: Datos privados del usuario (localStorage)

```typescript
'use client'

export function UserPreferences() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setTheme(saved)
  }, [])

  return <ThemeToggle theme={theme} onChange={setTheme} />
}
```

**Justificación:** localStorage solo existe en client. Esto es CORRECTO.

---

## Checklist

Antes de marcar un componente como `"use client"`, pregunta:

- [ ] ¿Necesito useState o useEffect?
- [ ] ¿Accedo a browser APIs (localStorage, window)?
- [ ] ¿Necesito event handlers interactivos?
- [ ] ¿Es imposible hacerlo en server?

Si respondiste NO a todo → **NO uses** `"use client"`

---

## Trade-offs

### Ventajas de Server Components

| Aspecto | Server | Client |
|---------|--------|--------|
| Performance | ✅ Rápido | ⚠️ Más lento |
| SEO | ✅ Excelente | ❌ Limitado |
| Bundle size | ✅ Mínimo | ❌ Mayor |
| Hydration | ✅ No necesaria | ⚠️ Sí necesaria |

### Cuándo Client es mejor

- Interactividad rica (drag & drop, animations)
- Real-time updates (WebSockets, polling)
- Browser APIs (geolocation, camera)
- Third-party widgets que requieren client

---

## Common Mistakes

### ❌ Mistake 1: "use client" en root layout

```typescript
// app/layout.tsx
'use client' // ❌ TODO el app es client ahora

export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>
}
```

**Fix:** Solo marca client lo que NECESITA ser client.

---

### ❌ Mistake 2: Fetch en useEffect sin razón

```typescript
'use client'

export default function Page() {
  const [data, setData] = useState([])

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])

  return <div>{data.map(...)}</div>
}
```

**Fix:** Si NO hay interactividad, usa Server Component:

```typescript
export default async function Page() {
  const data = await db.data.findMany()
  return <div>{data.map(...)}</div>
}
```

---

## Related

- [Pattern 1: Read-Only Data Display](../patterns/1-read-only-data-display.md) - Server Components en acción
- [Anti-Pattern: Client Component for Everything](../common-pitfalls/2-client-component-for-everything.md)
- [Decision Framework: Server vs Client](../decision-framework/server-vs-client.md)

---

**Remember:** Default to Server Components. Only go Client when you have a clear reason.
