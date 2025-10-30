### When to Refactor

**Refactor when you feel pain:**

- 🔴 Bugs in same component repeatedly
- 🔴 Taking >2 hours to add simple feature
- 🔴 New developers struggle to understand
- 🔴 Tests are hard to write

**Don't refactor when:**

- 🟢 Code works fine
- 🟢 No bugs
- 🟢 Easy to maintain
- 🟢 Tests pass

**Philosophy:** "If it ain't broke, don't fix it."

---

### Progressive Enhancement

```
Phase 1: Inline everything
    ↓ (feels pain)
Phase 2: Extract transformers
    ↓ (more reuse needed)
Phase 3: Create custom hooks
    ↓ (complex state management)
Phase 4: Add service layer
    ↓ (only if necessary)
```

**Start at Phase 1.** Move to next phase only when you feel the pain.

---
