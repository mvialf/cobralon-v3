# Decision Framework

Respuestas a las preguntas que te haces TODO EL TIEMPO.

## 🤔 Las 4 Decisiones Principales

### 1. [When to Extract Transformers](when-to-extract-transformers.md)

**Pregunta:** ¿Inline o `lib/transformers/`?

**Extract cuando:**

- ✅ Logic is >10 lines
- ✅ Used in 2+ places
- ✅ Pure transformation
- ✅ Want to test easily

---

### 2. [When to Create Custom Hooks](when-to-create-hooks.md)

**Pregunta:** ¿Props o `useCustomHook()`?

**Create hook cuando:**

- ✅ Complex client-side state
- ✅ Reusable across 3+ components
- ✅ Side effects (fetch, localStorage)

---

### 3. [Server vs Client Component](server-vs-client.md)

**Pregunta:** ¿`async function` o `"use client"`?

**Server Component si:**

- ✅ Just displaying data
- ✅ Fetching from database
- ✅ SEO matters

**Client Component si:**

- ✅ User interaction
- ✅ Browser APIs
- ✅ Real-time updates

---

### 4. [When to Create Service Layer](when-to-create-service-layer.md)

**Pregunta:** ¿Prisma directo o `ProductService` class?

**Create service si:**

- ✅ Abstraction over third-party API
- ✅ Complex retry/error handling
- ✅ Need to mock in tests

---

## 🎯 How to Use

1. Identifica tu duda
2. Lee la guía correspondiente
3. Aplica el checklist
4. Decide con confianza

## 🔗 Related

- [Core Principles](../core-principles/) - Principios base
- [Patterns](../patterns/) - Implementación práctica
- [Common Pitfalls](../common-pitfalls/) - Qué evitar
