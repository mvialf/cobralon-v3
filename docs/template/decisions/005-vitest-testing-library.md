# ADR-005: Vitest + React Testing Library

## Estado

**Aceptado**

**Fecha:** 2025-01-13

## Contexto

Necesitábamos elegir un framework de testing para unit e integration tests que fuera:

- Rápido en ejecución y desarrollo (fast feedback loop)
- Compatible con Next.js 14 + App Router
- Con soporte para React Server Components y Client Components
- Buena integración con TypeScript
- Moderno y bien mantenido

Además, el template originalmente NO tenía testing configurado, por lo que esta es la primera implementación.

## Decisión

Usar **Vitest 1.6.0** como test runner + **React Testing Library 16.2.0** para testing de componentes React.

## Alternativas Consideradas

### Alternativa 1: Jest + React Testing Library

- **Pros:**
  - Más maduro y ampliamente adoptado
  - Más recursos y ejemplos en la comunidad
  - Ecosystem grande de plugins
- **Contras:**
  - **Más lento** que Vitest (especialmente en proyectos grandes)
  - Configuración más compleja para Next.js + TypeScript
  - Requiere `ts-jest` o Babel para TypeScript
  - No usa ESM nativamente (necesita transformaciones)
- **Por qué NO:** Vitest es significativamente más rápido y tiene mejor integración con Vite/Next.js moderno.

### Alternativa 2: AVA

- **Pros:**
  - Extremadamente minimalista
  - Tests paralelos por defecto
  - Buen soporte TypeScript
- **Contras:**
  - Menor adopción que Jest/Vitest
  - Menos recursos para React testing
  - API menos familiar para desarrolladores de Jest
- **Por qué NO:** Menos adoption + menos recursos específicos para React.

### Alternativa 3: uvu

- **Pros:**
  - **El más rápido** de todos
  - Bundle size mínimo
  - Sin dependencias
- **Contras:**
  - API muy minimalista (a veces demasiado)
  - No incluye mocking out-of-the-box
  - Menos features que Vitest/Jest
  - Comunidad pequeña
- **Por qué NO:** Demasiado bare-bones. Preferimos un balance entre speed y features.

### Alternativa 4: Node.js Test Runner Nativo

- **Pros:**
  - Sin dependencias externas
  - Integrado en Node.js 20+
  - Rápido
- **Contras:**
  - Muy nuevo y con features limitadas
  - No incluye assertions (necesitas `node:assert`)
  - No incluye mocking robusto
  - No incluye coverage out-of-the-box
- **Por qué NO:** Demasiado inmaduro para producción. Vitest ofrece mejor DX.

### Alternativa 5: Mantener Jest (del proyecto anterior)

- **Contras:**
  - El template ya tenía tests escritos en Jest
  - Al migrar a Vitest, tuvimos que adaptar los tests existentes
  - **Por qué NO migrar:** Jest es más lento y Vitest tiene mejor integración con Next.js + Vite

## Consecuencias

### Positivas ✅

1. **Velocidad Superior**
   - Tests ejecutan ~2-3x más rápido que Jest
   - Hot Module Replacement (HMR) para tests
   - Watch mode ultra-rápido
   - Ejemplo: Test de Button (18 tests) en 308ms

2. **Integración con Vite/Next.js**
   - Next.js usa Vite internamente en development
   - Path aliases (`@/*`) funcionan sin configuración extra
   - No requiere Babel o ts-jest

3. **API Compatible con Jest**

   ```typescript
   // Migrar de Jest a Vitest es trivial:
   jest.fn() → vi.fn()
   jest.useFakeTimers() → vi.useFakeTimers()
   jest.advanceTimersByTime() → vi.advanceTimersByTime()
   ```

4. **Developer Experience**
   - UI mode interactiva: `npm test:ui`
   - Coverage out-of-the-box
   - TypeScript first-class support
   - ESM nativo (no transformaciones)

5. **React Testing Library Compatible**
   - Misma API que con Jest
   - `renderHook`, `render`, `screen`, `userEvent` funcionan igual
   - Testing de componentes Client y Server (con limitaciones)

6. **Ecosystem Moderno**
   - Mantenido activamente (v3.2.4 release reciente)
   - Inspirado en Vitest
   - Compatible con plugins de Vite

### Negativas / Trade-offs ⚠️

1. **Menor Adopción que Jest**
   - Jest tiene ~40M descargas/semana
   - Vitest tiene ~9M descargas/semana
   - **Mitigación:** API casi idéntica, fácil encontrar recursos de Jest aplicables

2. **Radix UI Components Problemáticos**
   - Componentes de Radix UI (usados por shadcn/ui) no funcionan bien en jsdom
   - Requieren mocks extensos (DOMRect, ResizeObserver, PointerEvent, etc.)
   - Algunos tests complejos pueden tener timeout issues con fake timers
   - **Mitigación:**
     - Mocks configurados en [vitest.setup.ts](../../../vitest.setup.ts)
     - Documentado en [vitest.config.ts](../../../vitest.config.ts#L10-L15)
     - Para tests complejos de UI, usar Chrome DevTools MCP o Playwright

3. **Breaking Changes Ocasionales**
   - Vitest tiene releases mayores frecuentes (actualmente v3.x)
   - **Mitigación:** Versionado pinned en package.json

4. **jsdom Limitations**
   - No es un browser real (limitaciones con eventos, layout, etc.)
   - MediaQueryList no se comporta igual que en browser
   - **Mitigación:** Tests de cambios dinámicos (resize, matchMedia) están comentados en `use-mobile.test.tsx`

## Implementación

### Archivos de Configuración

#### [vitest.config.ts](../../../vitest.config.ts)

```typescript
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    testTimeout: 10000,
    deps: {
      inline: [/@radix-ui/], // Fix para Radix UI + React 18
    },
  },
})
```

#### [vitest.setup.ts](../../../vitest.setup.ts)

Mocks necesarios para Radix UI:

- `ResizeObserver`
- `PointerEvent`
- `HTMLElement.prototype.hasPointerCapture`
- `HTMLElement.prototype.scrollIntoView`
- `IntersectionObserver`
- `DOMRect`
- `Element.prototype.getBoundingClientRect`

### Scripts en package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### Tests de Ejemplo Creados

1. **[lib/**tests**/utils.test.ts](../../../lib/**tests**/utils.test.ts)** (6 tests)
   - Tests de la función `cn()` (className merger)
   - Todos pasan ✅

2. **[components/ui/**tests**/button.test.tsx](../../../components/ui/**tests**/button.test.tsx)** (18 tests)
   - Tests de variantes, sizes, interactividad, disabled state
   - Todos pasan ✅

3. **[components/ui/**tests**/card.test.tsx](../../../components/ui/**tests**/card.test.tsx)** (19 tests)
   - Tests de Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
   - Tests de composición
   - Todos pasan ✅

4. **[hooks/**tests**/use-mobile.test.tsx](../../../hooks/**tests**/use-mobile.test.tsx)** (14 tests)
   - Tests de hook `useIsMobile`
   - Tests de breakpoints (320px - 1920px)
   - Tests de cambios dinámicos comentados (limitaciones de jsdom)
   - Todos pasan ✅

**Total:** 57 tests pasando ✅

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^27.0.0",
    "vitest": "^1.6.0",
    "vite-tsconfig-paths": "^5.2.0"
  }
}
```

## Patrones de Testing Recomendados

### 1. Testing de Componentes UI

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('debe renderizar correctamente', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('debe manejar onClick', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### 2. Testing de Hooks

```typescript
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

### 3. Testing de Utils

```typescript
import { cn } from '../utils'

describe('cn utility', () => {
  it('debe combinar clases', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2')
  })
})
```

## Testing Strategy

### Niveles de Testing

```
┌─────────────────────────────────────┐
│   E2E Tests (Chrome DevTools MCP)   │  ← Exploración manual
├─────────────────────────────────────┤
│   Integration Tests (Vitest)        │  ← Flujos multi-component
├─────────────────────────────────────┤
│   Unit Tests (Vitest)                │  ← Componentes + Utils
└─────────────────────────────────────┘
```

### Cobertura Recomendada

- **Utils/Helpers**: 90%+ (son críticos y fáciles de testear)
- **Componentes UI**: 70%+ (focus en interactividad)
- **Hooks**: 80%+ (lógica reutilizable)
- **Pages**: 50%+ (solo lógica crítica)

## Decisiones Pendientes

- [ ] **Coverage thresholds**: Definir límites mínimos
- [ ] **CI/CD integration**: Configurar GitHub Actions
- [ ] **Visual regression**: Considerar Chromatic o Percy

## Referencias

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest Migration from Jest](https://vitest.dev/guide/migration.html)

---

**Última actualización:** 2025-01-13
