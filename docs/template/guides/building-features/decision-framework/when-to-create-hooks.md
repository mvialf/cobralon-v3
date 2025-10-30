# When To Create Hooks


### When to Create Custom Hooks

**Create hook if:**

- ✅ Complex client-side state management
- ✅ Reusable logic across 3+ components
- ✅ Side effects (fetch, localStorage, WebSocket)

**Don't create hook if:**

- ❌ Component receives data as props (use that)
- ❌ Logic is just transformations (use transformers)
- ❌ Used only once (keep inline)

```typescript
// ✅ HOOK: Complex state + side effects
export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  return { products, loading }
}

// ❌ NO HOOK: Just props
function ProductsTable({ data }) {  // ← Recibe data, no necesita hook
  return <table>...</table>
}
```

