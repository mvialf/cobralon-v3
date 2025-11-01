# ADR-005: Vitest + React Testing Library

## Decisión

Usar **Vitest 3.2.4** como test runner + **React Testing Library 16.3.0** para testing de componentes React.

## Contexto

Necesitábamos un framework de testing para unit e integration tests que fuera:
- **Rápido:** Fast feedback loop en desarrollo
- **Compatible:** Con Next.js 15 + App Router y TypeScript
- **Moderno:** Bien mantenido y con features actuales
- **DX excelente:** Fácil de usar y configurar

## Alternativa Principal

**Jest + React Testing Library:** Más maduro y ampliamente adoptado.

**Por qué NO:** Vitest es ~2-3x más rápido que Jest. Path aliases (`@/*`) funcionan sin configuración extra en Vitest. Jest requiere `ts-jest` o Babel para TypeScript y no usa ESM nativamente. API es casi idéntica (migrar de Jest es trivial: `jest.fn()` → `vi.fn()`).

## Consecuencias

### Beneficios ✅

1. **Velocidad superior:** Tests ~2-3x más rápidos que Jest. Hot Module Replacement (HMR) para tests. Watch mode ultra-rápido.

2. **Zero config con Next.js:** Path aliases (`@/*`) funcionan automáticamente. No requiere Babel o ts-jest. ESM nativo.

3. **API compatible con Jest:** Migración trivial. `jest.fn()` → `vi.fn()`, `jest.useFakeTimers()` → `vi.useFakeTimers()`.

4. **DX superior:**
   ```bash
   npm test         # Run tests
   npm test:ui      # UI mode interactiva
   npm test:coverage  # Coverage report
   ```

5. **React Testing Library integrado:** Misma API que con Jest. `render`, `screen`, `userEvent` funcionan igual.

### Trade-offs ⚠️

1. **Menor adopción que Jest:** Vitest ~9M downloads/sem vs Jest ~40M/sem
   - **Mitigación:** API casi idéntica. Recursos de Jest son aplicables a Vitest.

2. **Radix UI components problemáticos:** Requieren mocks extensos (DOMRect, ResizeObserver, PointerEvent)
   - **Mitigación:** Mocks configurados en `vitest.setup.ts`. Para tests complejos de UI, usar Playwright MCP.

3. **jsdom limitations:** No es browser real. MediaQueryList y layout calculations limitados.
   - **Mitigación:** Tests dinámicos (resize, matchMedia) comentados en ejemplos. E2E tests para validación real de browser.

## Quick Start

```bash
# 1. Ejecutar tests
npm test              # Run all tests
npm test:ui           # UI interactiva
npm test:coverage     # Coverage report

# 2. Watch mode
npm test -- --watch   # Re-ejecuta en cambios
```

```typescript
// Ejemplo de test de componente
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('debe manejar onClick', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

// Ejemplo de test de hook
import { renderHook } from '@testing-library/react'
import { useIsMobile } from '../use-mobile'

describe('useIsMobile', () => {
  it('debe retornar false en desktop', () => {
    global.innerWidth = 1024
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })
})
```

## Tests de Ejemplo Incluidos

El template incluye 57 tests de ejemplo que pasan:

- `lib/__tests__/utils.test.ts` (6 tests) - Función `cn()`
- `components/ui/__tests__/button.test.tsx` (18 tests) - Variantes, onClick, disabled
- `components/ui/__tests__/card.test.tsx` (19 tests) - Card, CardHeader, composición
- `hooks/__tests__/use-mobile.test.tsx` (14 tests) - Hook useIsMobile

```bash
$ npm test
✓ 57 tests passed
```

## Referencias

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Strategy](../methodology/testing.md) - Guía completa de testing
- [ADR-010: Playwright MCP](010-playwright-mcp.md) - E2E testing complementario

---

**Última actualización:** 2025-01-13
