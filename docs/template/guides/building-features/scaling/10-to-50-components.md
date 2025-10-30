### From 10 to 50 Components

**Signals:**

- ✅ Same fetching logic in 3+ places
- ✅ Complex client-side state
- ✅ Real-time updates needed

**Actions:**

1. Consider custom hooks for reusable client logic
2. Add server-side caching (React `cache()`)
3. Extract business logic to dedicated modules

**You might need:**

- ⚠️ Custom hooks (for complex state)
- ⚠️ Service layer (if abstracting APIs)
- ⚠️ State management (Zustand, Jotai)

---
