### ❌ Anti-Pattern 6: Premature Optimization

**Problem:** Agregar cache/memoization antes de medir.

```typescript
// ❌ INCORRECTO: Optimizar sin medir
const MemoizedComponent = React.memo(ProductCard)
const memoizedValue = useMemo(() => expensiveCalc(data), [data])
```

**Solution:** Mide primero, optimiza después.

```typescript
// ✅ CORRECTO: Start simple
function ProductCard({ product }) {
  return <div>{product.name}</div>
}

// Solo optimiza si:
// - Profiler muestra slow render
// - Users reportan lag
// - Métricas muestran problema
```
