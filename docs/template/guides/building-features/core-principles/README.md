# Core Principles

Los 4 principios fundamentales que guían todas las decisiones arquitecturales en el template.

## 📚 Los 4 Principios

### 1. [Server Components First](1-server-components-first.md)

**Regla:** Usa Server Components para fetching de datos cuando sea posible.

**Beneficios:**

- ✅ Mejor performance (pre-renderizado)
- ✅ Mejor SEO (HTML completo desde el server)
- ✅ Menos JavaScript al cliente

**Cuándo usar Client Component:**

- Solo cuando necesites interactividad
- Browser APIs (localStorage, navigator)
- Hooks de React (useState, useEffect)

---

### 2. [Extract When It Hurts](2-extract-when-it-hurts.md)

**Regla:** Mantén lógica inline inicialmente. Extrae cuando duela.

**Extrae cuando:**

- ✅ Lógica es >10 líneas
- ✅ Se usa en 2+ lugares
- ✅ Es transformación pura (input → output)
- ✅ Quieres testearla fácilmente

**Filosofía:** YAGNI (You Aren't Gonna Need It) - No optimices anticipadamente.

---

### 3. [Data Down, Events Up](3-data-down-events-up.md)

**Regla:** Componentes reciben data como props, emiten eventos vía callbacks.

**Pattern:**

```
[Parent Component]
    ↓ data (props)
[Child Component]
    ↑ events (callbacks)
[Parent Component]
```

**Beneficios:**

- ✅ Componentes reutilizables
- ✅ Testing más fácil
- ✅ Menos acoplamiento

---

### 4. [Test What Matters](4-test-what-matters.md)

**Regla:** Testea pure functions primero, componentes solo si son críticos.

**Priority:**

1. **Transformers (pure functions)** - High value, easy to test
2. **API Routes** - Medium value, medium effort
3. **Components** - Only if business-critical

**Filosofía:** Test what breaks, not what works.

---

## 🎯 Por qué estos principios?

Estos 4 principios están diseñados para:

1. **Maximizar performance** - Server Components + menos JavaScript
2. **Mantener simplicidad** - YAGNI, no sobre-ingenierizar
3. **Facilitar mantenimiento** - Componentes desacoplados, testing fácil
4. **Escalar gradualmente** - Empiezas simple, refactorizas cuando duele

---

## 🚀 Cómo usarlos

**Durante desarrollo:**

- Lee los 4 principios antes de empezar (15 min)
- Consúltalos cuando tengas dudas
- Úsalos como checklist en code review

**No los veas como reglas rígidas:**

- Son **guidelines**, no dogma
- Usa tu criterio
- Si romperlos tiene sentido, explica por qué en comments/docs

---

## 🔗 Related

- [Patterns](../patterns/) - Implementación práctica de estos principios
- [Decision Framework](../decision-framework/) - Ayuda a decidir cuándo aplicarlos
- [Common Pitfalls](../common-pitfalls/) - Qué pasa cuando NO los sigues

---

**Next Steps:** Lee cada principio en detalle o ve directamente a [Patterns](../patterns/) para ver ejemplos prácticos.
