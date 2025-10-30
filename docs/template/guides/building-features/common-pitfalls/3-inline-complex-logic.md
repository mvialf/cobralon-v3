### ❌ Anti-Pattern 3: Inline Complex Logic

**Problem:** 50+ líneas de transformación dentro del componente.

```typescript
// ❌ INCORRECTO: 30 líneas inline
export function ProductsTable({ products }) {
  const enriched = products.map(p => ({
    ...p,
    displayName: `${p.name} (${p.category.name})`,
    priceFormatted: new Intl.NumberFormat(...).format(p.price),
    stockStatus: p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out',
    profit: p.price - p.cost,
    profitMargin: ((p.price - p.cost) / p.price) * 100,
    // ... 20 líneas más
  }))

  return <table>...</table>
}
```

**Solution:** Extracta a transformers cuando >10 líneas.

```typescript
// ✅ CORRECTO: Lógica extraída
// lib/transformers/product-transformers.ts
export function enrichProducts(products) {
  // ... lógica compleja aquí
}

// Componente limpio
export function ProductsTable({ products }) {
  const enriched = enrichProducts(products)
  return <table>...</table>
}
```

