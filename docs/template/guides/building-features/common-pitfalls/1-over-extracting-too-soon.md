### ❌ Anti-Pattern 1: Over-Extracting Too Soon

**Problem:** Crear transformers/hooks antes de necesitarlos.

```typescript
// ❌ INCORRECTO: Extraer prematuramente
// lib/transformers/user-transformers.ts
export function formatUserName(user: User) {
  return user.name.toUpperCase() // 1 línea, usado 1 vez
}

// Usar en componente:
const formatted = formatUserName(user)
```

**Solution:** Wait until it hurts (YAGNI).

```typescript
// ✅ CORRECTO: Keep inline hasta que duela
const formatted = user.name.toUpperCase()

// Solo extrae cuando:
// - Se usa en 2+ lugares
// - Crece a >10 líneas
// - Necesitas testearlo
```

**Why it matters:** Menos archivos = más fácil navegar codebase.

---
