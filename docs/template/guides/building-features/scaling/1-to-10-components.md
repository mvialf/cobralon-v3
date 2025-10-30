### From 1 to 10 Components

**Signals:**

- ✅ Copying same transformation logic 2+ times
- ✅ Components growing >200 lines
- ✅ Testing becomes difficult

**Actions:**

1. Extract repeated transformations to `lib/transformers/`
2. Create shared types in `lib/types/`
3. Write tests for transformers (easy wins)

**Don't worry about:**

- ❌ Service Layer (not needed yet)
- ❌ Custom hooks (props are fine)
- ❌ Over-optimization

---
