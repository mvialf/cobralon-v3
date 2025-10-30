# When To Extract Transformers

### When to Extract Transformers

**Extract to `lib/transformers/` if:**

- ✅ Logic is >10 lines
- ✅ Used in 2+ places
- ✅ Pure transformation (input → output, no side effects)
- ✅ You want to test it easily

**Keep inline if:**

- ❌ Simple map/filter (<5 lines)
- ❌ Used only once
- ❌ Just formatting (dates, currency)

```typescript
// ✅ EXTRACT: Complex logic (>10 lines, reusable)
export function enrichProducts(products: ProductFromDB[]) {
  return products.map((p) => ({
    // ... 15 líneas de transformación
  }))
}

// ✅ INLINE: Simple transformation (<5 lines)
const formatted = products.map((p) => ({ ...p, name: p.name.toUpperCase() }))
```

