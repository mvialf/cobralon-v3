# Principle 2: Extract When It Hurts

**Regla:** Mantén lógica inline inicialmente. Extrae cuando duela.

## Filosofía: YAGNI

**YAGNI** = "You Aren't Gonna Need It"

No extraigas código "por si acaso". Extrae cuando:

1. **Duele mantenerlo inline** (>10 líneas)
2. **Se repite** (usado en 2+ lugares)
3. **Quieres testearlo** (pure function fácil de testear)

## Cuándo Extrae a `lib/transformers/`

### ✅ SÍ extraer cuando:

- **Lógica es >10 líneas**
  ```typescript
  // Si esto crece a 10+ líneas → extrae
  const enriched = products.map(p => ({
    ...p,
    displayName: `${p.name} (${p.category.name})`,
    priceFormatted: formatCurrency(p.price),
    stockStatus: p.stock > 10 ? 'In Stock' : 'Low',
    profit: p.price - p.cost,
    profitMargin: ((p.price - p.cost) / p.price) * 100,
    daysInStock: calculateDaysInStock(p.createdAt),
    // ... más transformaciones
  }))
  ```

- **Se usa en 2+ lugares**
  ```typescript
  // ❌ Duplicado en ProductsPage Y ProductDetailsPage
  const formatted = products.map(p => ({ ...p, price: `$${p.price}` }))
  ```

- **Es transformación pura** (input → output, sin side effects)
  ```typescript
  // ✅ Pure function - perfecto para extraer
  function enrichProducts(products) {
    return products.map(transform) // No side effects
  }
  ```

- **Quieres testearla fácilmente**
  ```typescript
  // ✅ Easy to test en isolation
  expect(enrichProducts([input])[0].profit).toBe(400)
  ```

---

### ❌ NO extraigas cuando:

- **Simple map/filter (<5 líneas)**
  ```typescript
  // ✅ Keep inline - demasiado simple para extraer
  const active = users.filter(u => u.active)
  const names = users.map(u => u.name.toUpperCase())
  ```

- **Se usa solo 1 vez**
  ```typescript
  // ✅ Keep inline - no hay reuso
  const displayName = `${user.firstName} ${user.lastName}`
  ```

- **Es solo formateo básico**
  ```typescript
  // ✅ Keep inline - trivial
  const formatted = new Date(timestamp).toLocaleDateString()
  ```

---

## Ejemplo Completo: Cuándo Extraer

### Fase 1: Inline (componente simple)

```typescript
// components/products/product-card.tsx
export function ProductCard({ product }) {
  const price = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(product.price)

  return <div>{product.name} - {price}</div>
}
```

**Estado:** ✅ Está bien inline (simple, usado 1 vez)

---

### Fase 2: Crece complejidad (>10 líneas)

```typescript
// components/products/product-card.tsx
export function ProductCard({ product }) {
  // 🚨 Esto creció a 15+ líneas
  const enriched = {
    ...product,
    displayName: `${product.name} (${product.category.name})`,
    priceFormatted: new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(product.price),
    stockStatus: product.stock > 10
      ? 'In Stock'
      : product.stock > 0
        ? 'Low Stock'
        : 'Out of Stock',
    profit: product.price - product.cost,
    profitMargin: ((product.price - product.cost) / product.price) * 100,
    daysInStock: Math.floor(
      (Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }

  return <div>{enriched.displayName} - {enriched.priceFormatted}</div>
}
```

**Estado:** ⚠️ **DUELE** - tiempo de extraer!

---

### Fase 3: Extraer a transformer

```typescript
// lib/transformers/product-transformers.ts
export function enrichProduct(product: ProductFromDB): ProductDisplay {
  return {
    ...product,
    displayName: `${product.name} (${product.category.name})`,
    priceFormatted: new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(product.price),
    stockStatus: calculateStockStatus(product.stock),
    profit: product.price - product.cost,
    profitMargin: ((product.price - product.cost) / product.price) * 100,
    daysInStock: calculateDaysInStock(product.createdAt),
  }
}

function calculateStockStatus(stock: number): string {
  if (stock > 10) return 'In Stock'
  if (stock > 0) return 'Low Stock'
  return 'Out of Stock'
}

function calculateDaysInStock(createdAt: Date): number {
  return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
}

// components/products/product-card.tsx
import { enrichProduct } from '@/lib/transformers/product-transformers'

export function ProductCard({ product }) {
  const enriched = enrichProduct(product) // ← Clean!
  return <div>{enriched.displayName} - {enriched.priceFormatted}</div>
}
```

**Estado:** ✅ **Mucho mejor!**

**Beneficios:**
- Componente limpio (1 línea)
- Lógica testeable (pure function)
- Reutilizable (otros componentes pueden usarlo)

---

## Testing Benefits

### Antes (inline - difícil de testear)

```typescript
// ❌ Necesitas renderizar componente completo para testear lógica
import { render } from '@testing-library/react'

test('should calculate profit', () => {
  const { getByText } = render(<ProductCard product={mockProduct} />)
  // ... buscar texto en DOM, parsing strings... 😫
})
```

---

### Después (extracted - fácil de testear)

```typescript
// ✅ Test puro, sin mocks, sin DOM
import { enrichProduct } from './product-transformers'

test('should calculate profit', () => {
  const result = enrichProduct({ price: 1000, cost: 600, ... })
  expect(result.profit).toBe(400)
  expect(result.profitMargin).toBe(40)
})
```

**Beneficios:**
- ✅ Sin mocks
- ✅ Sin renderizar componentes
- ✅ Tests rápidos (<1ms)
- ✅ Fáciles de escribir (~5 min)

---

## Common Mistakes

### ❌ Mistake 1: Extraer prematuramente

```typescript
// ❌ INCORRECTO: Extraer 1 línea usada 1 vez
// lib/transformers/user-transformers.ts
export function formatUserName(user: User) {
  return user.name.toUpperCase() // ← Demasiado simple
}

// components/user-card.tsx
import { formatUserName } from '@/lib/transformers/user-transformers'
const name = formatUserName(user) // ← Overkill
```

**Fix:** Keep inline hasta que duela:

```typescript
// ✅ CORRECTO: Inline simple
const name = user.name.toUpperCase()
```

**Cuándo extraer:** Cuando crece a 5+ líneas O se usa en 2+ lugares.

---

### ❌ Mistake 2: Transformer con side effects

```typescript
// ❌ INCORRECTO: No es pure function
export function enrichProduct(product) {
  console.log('Enriching', product.id) // ← Side effect!
  saveToLocalStorage(product) // ← Side effect!

  return {
    ...product,
    formatted: formatPrice(product.price)
  }
}
```

**Fix:** Transformers deben ser **pure functions**:

```typescript
// ✅ CORRECTO: Pure function
export function enrichProduct(product) {
  return {
    ...product,
    formatted: formatPrice(product.price)
  }
}
```

**Pure function = input → output, sin side effects**

---

## Progressive Enhancement

### Fase 1: Inline everything

```typescript
export function Component() {
  const data = rawData.map(x => ({ ...x, formatted: format(x) }))
  return <div>{data.map(...)}</div>
}
```

**Estado:** ✅ Start simple

---

### Fase 2: Extraction cuando duele (>10 líneas O 2+ usos)

```typescript
// lib/transformers/data-transformers.ts
export function enrichData(data) {
  return data.map(x => ({ ...x, formatted: format(x) }))
}

export function Component() {
  const data = enrichData(rawData) // ← Extracted
  return <div>{data.map(...)}</div>
}
```

**Estado:** ⚠️ Solo si duele!

---

### Fase 3: Más reuso → Más abstracción

```typescript
// lib/transformers/data-transformers.ts
export function enrichData(data: RawData[]): EnrichedData[] {
  return data.map(enrichItem)
}

function enrichItem(item: RawData): EnrichedData {
  return {
    ...item,
    formatted: formatValue(item.value),
    categorized: categorize(item.type),
    validated: validate(item),
  }
}
```

**Estado:** ✅ Solo cuando tengas 3+ lugares usando esto.

---

## Checklist: ¿Debo extraer?

Antes de crear `lib/transformers/xxx-transformers.ts`, verifica:

- [ ] ¿Lógica es >10 líneas?
- [ ] ¿Se usa en 2+ lugares?
- [ ] ¿Es pure function (sin side effects)?
- [ ] ¿Quiero testearlo fácilmente?

**Si 2+ respuestas son SÍ → Extrae**

**Si todas son NO → Keep inline**

---

## Related

- [Pattern 1: Read-Only Display](../patterns/1-read-only-data-display.md#step-3-when-to-extract-transformers) - Ejemplo práctico
- [Testing Strategy](../testing-strategy/what-to-test-first.md#1-transformers-high-value-easy) - Testing transformers
- [Anti-Pattern: Over-Extracting Too Soon](../common-pitfalls/1-over-extracting-too-soon.md)

---

**Remember:** YAGNI - Don't extract until it hurts. Start inline, refactor when pain signals appear.
