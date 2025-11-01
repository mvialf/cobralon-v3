# ADR-010: Playwright MCP + @playwright/test para E2E Testing

## Decisión

Adoptar **Playwright MCP + @playwright/test** como estrategia dual para E2E testing:

- **Playwright MCP:** Claude genera tests conversacionalmente
- **@playwright/test:** Ejecuta tests de forma independiente (CI/CD)

## Contexto

Necesitábamos E2E testing que:

- Aproveche IA de Claude para escribir tests
- Genere tests persistentes (.spec.ts) versionados en Git
- Soporte multi-browser (Chrome, Firefox, Safari)
- Sea ejecutable en CI/CD sin Claude

## Alternativa Principal

**Solo @playwright/test (sin IA):** Testing tradicional escribiendo tests manualmente.

**Por qué agregamos MCP:** Playwright MCP genera tests conversacionalmente y permite debugging interactivo con Claude, manteniendo todos los beneficios de @playwright/test. Lo mejor de ambos mundos.

## Consecuencias

### Beneficios ✅

1. **Tests persistentes y versionados:** Claude genera archivos `.spec.ts` que se guardan en Git. Code review posible.

2. **Generación con IA + Ejecución independiente:**

   ```
   Con Claude (Playwright MCP):
   - Usuario: "Crea test para flujo de pago"
   - Claude: Navega, escribe test, ejecuta, valida
   - Resultado: tests/e2e/payment.spec.ts ✅

   Sin Claude (CI/CD):
   - $ npx playwright test
   - Ejecuta todos los tests generados
   ```

3. **Multi-browser testing:** Chrome, Firefox, Safari, Mobile. Un test = validación en 4+ browsers.

4. **Ecosystem completo de Playwright:**
   - Trace Viewer (debugging visual post-mortem)
   - UI Mode (interfaz visual para desarrollar)
   - Inspector (debugging paso a paso)
   - Auto-waiting y retry logic (menos flakiness)

5. **CI/CD ready:** Ejecutable en pipelines, headless mode, paralelización automática.

### Trade-offs ⚠️

1. **Dos herramientas en stack:** Playwright MCP + @playwright/test
   - **Mitigación:** Ambas del mismo ecosystem (API compatible). MCP genera, @playwright/test ejecuta.

2. **Tests más lentos que unit tests:** E2E arranca browser real (~segundos vs milisegundos)
   - **Mitigación:** Solo testear flujos críticos en E2E, resto en unit tests (Vitest).

3. **Browser dependencies:** Requiere instalar browsers (~500MB)
   - **Mitigación:** Solo en dev/CI. Producción no necesita browsers.

## Quick Start

```bash
# 1. Instalar Playwright
npm install -D @playwright/test
npx playwright install

# 2. Crear test con Claude (Playwright MCP)
# Usuario: "Claude, crea test E2E para login"
# Claude genera: tests/e2e/login.spec.ts

# 3. Ejecutar tests (sin Claude)
npx playwright test              # Todos los tests
npx playwright test --ui         # Modo UI interactivo
npx playwright test --debug      # Debug mode

# 4. Ver resultados
npx playwright show-report       # Ver último reporte
```

```typescript
// tests/e2e/login.spec.ts (ejemplo generado por Claude con Playwright MCP)
import { test, expect } from '@playwright/test'

test('login exitoso', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/dashboard')
})
```

## Casos de Uso

**✅ Usar Playwright MCP (con Claude) para:**

- Generar tests iniciales rápidamente
- Debugging interactivo de tests
- Exploración de bugs con IA

**✅ Usar @playwright/test (sin Claude) para:**

- CI/CD regression testing
- Pre-commit hooks
- Desarrollo local (watch mode)
- Cross-browser validation

## Referencias

- [Playwright Documentation](https://playwright.dev/)
- [Playwright MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/playwright)
- [Testing Strategy](../methodology/testing.md#e2e-tests) - Cuándo usar E2E vs Unit
- [ADR-005: Vitest](005-vitest-testing-library.md) - Testing complementario

---

**Última actualización:** 2025-10-21
