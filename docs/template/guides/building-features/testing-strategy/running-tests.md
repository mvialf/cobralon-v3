# Running Tests

## Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test product-transformers

# Generate coverage report
npm test:coverage

# Interactive UI
npm test:ui
```

## Workflow

1. Write feature code
2. Write transformer tests (if extracted)
3. Run tests locally
4. Fix failures
5. Commit

## Coverage Targets

| Tipo | Target | Priority |
|------|--------|----------|
| Transformers | 90%+ | ✅ Alta |
| API Routes | 70%+ | ⚠️ Media |
| Components | 50%+ | 🟡 Baja |

## Related

- [What to Test First](what-to-test-first.md)
- [Core Principle: Test What Matters](../core-principles/4-test-what-matters.md)
