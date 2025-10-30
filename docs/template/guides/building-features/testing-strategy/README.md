# Testing Strategy

Qué testear y cómo.

## 📊 Testing Pyramid

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

## 📚 Secciones

1. [**Testing Pyramid**](testing-pyramid.md) - Prioridades
2. [**What to Test First**](what-to-test-first.md) - Transformers → APIs → Components
3. [**Running Tests**](running-tests.md) - Comandos y workflow

## 🎯 Priority

1. **Transformers** - High value, easy
2. **API Routes** - Medium value, medium effort
3. **Components** - Only if critical

## 🔗 Related

- [Core Principle: Test What Matters](../core-principles/4-test-what-matters.md)
- [Methodology: Testing](../../../methodology/testing.md)
