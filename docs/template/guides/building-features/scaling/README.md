# Scaling Your Codebase

Cuándo refactorizar según crece tu código.

## 📈 Fases de Crecimiento

### 1. [From 1 to 10 Components](1-to-10-components.md)

**Signals:**

- Copying same transformation 2+ times
- Components growing >200 lines

**Actions:**

- Extract transformers
- Create shared types
- Write tests

---

### 2. [From 10 to 50 Components](10-to-50-components.md)

**Signals:**

- Same fetching logic in 3+ places
- Complex client-side state

**Actions:**

- Custom hooks
- Server-side caching
- Business logic modules

---

### 3. [When to Refactor](when-to-refactor.md)

**Refactor when:**

- 🔴 Bugs repeatedly
- 🔴 Takes >2h to add simple feature
- 🔴 New devs struggle

**Don't refactor when:**

- 🟢 Code works fine
- 🟢 No bugs
- 🟢 Easy to maintain

---

## 🎯 Philosophy

**Progressive Enhancement:**

```
Phase 1: Inline everything
    ↓ (feels pain)
Phase 2: Extract transformers
    ↓ (more reuse needed)
Phase 3: Custom hooks
    ↓ (complex state)
Phase 4: Service layer
```

**Start at Phase 1. Move up only when pain signals appear.**

## 🔗 Related

- [Core Principle: Extract When It Hurts](../core-principles/2-extract-when-it-hurts.md)
