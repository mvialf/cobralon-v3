### ❌ Anti-Pattern 4: Testing Everything

**Problem:** Intentar 100% coverage desde día 1.

```typescript
// ❌ INCORRECTO: Testear componente simple
describe('ProductCard', () => {
  it('should render name', () => { ... })
  it('should render price', () => { ... })
  it('should render image', () => { ... })
  // ... 20 tests más
})
```

**Solution:** Testea transformers (fácil), luego componentes críticos.

```typescript
// ✅ CORRECTO: Testea transformers primero
describe('enrichProducts', () => {
  it('should calculate profit', () => { ... })
  it('should format price', () => { ... })
})

// Component tests solo si es crítico
```

**Why it matters:** Tests de transformers son:

- Más fáciles de escribir (no mocks)
- Más valiosos (catch logic bugs)
- Más rápidos de ejecutar

---
