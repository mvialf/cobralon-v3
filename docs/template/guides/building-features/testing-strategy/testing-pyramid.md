### Testing Pyramid

```
       /\
      /  \    Component Tests
     /    \   (if critical)
    /------\
   /        \  Transformer Tests
  /          \ (pure functions)
 /------------\
/              \ E2E Tests
/                \ (critical flows)
```

**Priority:**

1. **Transformers** (high value, easy)
2. **API Routes** (medium value, medium effort)
3. **Components** (only if critical)

---
