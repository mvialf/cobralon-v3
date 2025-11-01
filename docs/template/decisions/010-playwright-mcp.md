# ADR-010: Playwright MCP + @playwright/test para E2E Testing

## Estado

**Aceptado**

**Fecha:** 2025-10-21

## Contexto

Necesitábamos una solución de E2E testing que:

- Aproveche la IA de Claude para escribir tests
- Genere tests persistentes (.spec.ts) versionados en Git
- Soporte multi-browser testing (Chrome, Firefox, Safari)
- Sea ejecutable en CI/CD sin Claude
- Tenga ecosystem robusto (trace viewer, codegen, debugging tools)

## Decisión

Adoptar **Playwright MCP** + **@playwright/test** como estrategia dual para E2E testing:

1. **Playwright MCP**: Claude escribe y debuggea tests conversacionalmente
2. **@playwright/test**: Ejecuta tests generados de forma independiente

**Arquitectura:**

```
┌────────────────────────────────────────────┐
│   Playwright MCP (Testing con Claude)     │
│   - Claude genera tests                   │
│   - Debugging interactivo                 │
│   - Exploración con IA                    │
└────────────────────────────────────────────┘
                  ↓
         Genera tests/.spec.ts
                  ↓
┌────────────────────────────────────────────┐
│   @playwright/test (Ejecución)            │
│   - CI/CD pipelines                       │
│   - Regression testing                    │
│   - Multi-browser                         │
└────────────────────────────────────────────┘
```

## Alternativas Consideradas

### Alternativa 1: Solo @playwright/test (Sin IA)

- **Pros:**
  - Solución estándar de la industria
  - Documentación exhaustiva
  - Community support masivo
  - Tooling maduro (codegen, trace viewer, etc.)
  - Multi-browser out-of-the-box
  - CI/CD friendly
- **Contras:**
  - Requiere escribir tests manualmente
  - Curva de aprendizaje de API
  - No aprovecha Claude para generación/debugging
- **Por qué NO (como única opción):** Playwright MCP ofrece lo mejor de ambos mundos - generación con IA + tooling tradicional

### Alternativa 2: Cypress

- **Pros:**
  - Muy popular
  - Excelente DX
  - Time-travel debugging
  - Screenshots/videos automáticos
- **Contras:**
  - Más lento que Playwright
  - Solo Chrome-based browsers nativamente
  - Sin soporte nativo para IA/MCP
  - Network stubbing más complejo
- **Por qué NO:** Playwright es técnicamente superior y tiene MCP integration

### Alternativa 3: Testing Library + Happy DOM

- **Pros:**
  - Ligero y rápido
  - Sin browser real (sin overhead)
  - Ya usamos Testing Library en Vitest
- **Contras:**
  - No es E2E real (no browser)
  - No detecta issues de rendering/CSS
  - No valida JavaScript del navegador
  - Sin soporte para workflows complejos
- **Por qué NO:** Necesitamos E2E real con browser para validar experiencia completa

### Alternativa 4: Solo Playwright MCP (Sin @playwright/test)

- **Pros:**
  - Simplifica stack (solo MCP)
  - Claude maneja todo
- **Contras:**
  - **Dependencia de Claude** para ejecutar tests
  - **No CI/CD** sin servidor MCP en pipeline
  - Tooling limitado (no trace viewer standalone)
- **Por qué NO:** @playwright/test es esencial para CI/CD y testing independiente

## Consecuencias

### Positivas ✅

1. **Tests Persistentes y Versionados**

   ```typescript
   // tests/e2e/login.spec.ts (generado por Claude con Playwright MCP)
   import { test, expect } from '@playwright/test'

   test('login exitoso', async ({ page }) => {
     await page.goto('/login')
     await page.getByLabel('Email').fill('user@example.com')
     await page.getByLabel('Password').fill('password123')
     await page.getByRole('button', { name: 'Sign in' }).click()
     await expect(page).toHaveURL('/dashboard')
   })
   ```

   - Tests guardados en Git
   - Code review posible
   - Reutilizables y versionados

2. **Generación con IA + Ejecución Independiente**

   ```
   Con Claude:
   Usuario: "Claude, crea test para flujo de pago"
   Claude (usa Playwright MCP):
     1. Navega por app
     2. Escribe tests/e2e/payment.spec.ts
     3. Ejecuta y valida

   Sin Claude (CI/CD):
   $ npx playwright test  # Ejecuta todos los tests
   ```

3. **Multi-Browser Testing**

   ```typescript
   // playwright.config.ts
   projects: [
     { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
     { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
     { name: 'webkit', use: { ...devices['Desktop Safari'] } },
     { name: 'mobile', use: { ...devices['Pixel 5'] } },
   ]
   ```

   - Valida en Chrome, Firefox, Safari
   - Tests mobile responsive
   - Detecta bugs browser-specific

4. **Ecosystem Completo de Playwright**
   - **Trace Viewer**: Debugging visual post-mortem
   - **Codegen**: Genera código grabando interacciones
   - **UI Mode**: Interfaz visual para ejecutar tests
   - **Inspector**: Debugging paso a paso
   - **Screenshots/Videos**: Evidencia automática
   - **Network mocking**: Control de requests
   - **Test parallelization**: Ejecución rápida

5. **CI/CD Friendly**

   ```yaml
   # .github/workflows/e2e.yml
   - name: Run Playwright tests
     run: npx playwright test
   - name: Upload test results
     uses: actions/upload-artifact@v4
     if: always()
     with:
       name: playwright-report
   ```

   - Ejecutable en pipelines
   - Headless mode
   - Parallelization automática

6. **Debugging Superior**
   - Playwright Inspector (paso a paso)
   - Trace viewer (replay completo)
   - Screenshots en failures automáticos
   - Console logs capturados
   - Network requests trackeados

7. **Auto-Waiting y Reliability**
   - Espera automática de elementos
   - Retry logic built-in
   - Auto-scrolling
   - Menos flakiness que Selenium/Cypress

### Negativas / Trade-offs ⚠️

1. **Dos Herramientas en Stack**
   - Playwright MCP + @playwright/test
   - **Impacto:** Complejidad ligeramente mayor
   - **Mitigación:** Ambas son del mismo ecosystem (Playwright). API compatible

2. **Requiere Configuración Inicial**

   ```bash
   npm install -D @playwright/test
   npx playwright install
   # + playwright.config.ts
   ```

   - **Impacto:** ~15 min de setup inicial
   - **Mitigación:** Documentado en guía paso a paso

3. **Tests MÁS Lentos que Unit Tests**
   - E2E tests arrancan browser real
   - Más lentos que Vitest (segundos vs milisegundos)
   - **Mitigación:** Solo testear flujos críticos en E2E, resto en unit tests

4. **Curva de Aprendizaje de Playwright API**
   - Locators, auto-waiting, aserciones específicas
   - **Mitigación:** Claude ayuda a escribir tests con Playwright MCP, aprende la API gradualmente

5. **Browser Dependencies**
   - Requiere instalar browsers (Chromium, Firefox, WebKit)
   - ~500MB de espacio
   - **Mitigación:** Solo en dev/CI. Producción no necesita browsers

## Implementación

### Fase 1: Instalación @playwright/test

```bash
npm install -D @playwright/test
npx playwright install
```

### Fase 2: Configuración playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
})
```

### Fase 3: Configuración Playwright MCP

Playwright MCP ya debe estar configurado en `.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

### Fase 4: Scripts npm

```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:codegen": "playwright codegen http://localhost:3000"
  }
}
```

### Fase 5: Crear Primer Test con Claude

```
Usuario: "Claude, usa Playwright MCP para crear un test del formulario de login"

Claude (usa Playwright MCP):
1. Navega a /login
2. Interactúa con el form
3. Genera tests/e2e/login.spec.ts:

import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('login exitoso', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/dashboard');
  });
});

Test ejecutado: ✅ PASS
Archivo creado: tests/e2e/login.spec.ts
```

### Fase 6: Ejecutar Tests Independientemente

```bash
# Sin Claude
npx playwright test

# Modo UI
npx playwright test --ui

# Solo un test
npx playwright test login.spec.ts

# Debug mode
npx playwright test --debug
```

## Casos de Uso

### ✅ Usar Playwright MCP (con Claude) para:

1. **Generar tests iniciales**

   ```
   "Claude, crea tests E2E para el flujo de checkout completo"
   → Claude navega, escribe test, lo valida
   ```

2. **Debugging interactivo**

   ```
   "Este test falla en Firefox, ayúdame a debuggearlo"
   → Claude ejecuta, ve error, sugiere fix
   ```

3. **Exploración de bugs**

   ```
   "El botón X no funciona en mobile, investiga"
   → Claude cambia viewport, reproduce, diagnostica
   ```

4. **Generar screenshots/evidencia**
   ```
   "Captura screenshots de todas las páginas"
   → Claude navega y genera evidencia visual
   ```

### ✅ Usar @playwright/test (sin Claude) para:

1. **CI/CD regression testing**

   ```bash
   # GitHub Actions
   npx playwright test --project=chromium,firefox
   ```

2. **Pre-commit hooks**

   ```bash
   # Solo tests críticos
   npx playwright test tests/e2e/critical/
   ```

3. **Desarrollo local**

   ```bash
   # Modo watch (re-ejecuta en cambios)
   npx playwright test --ui
   ```

4. **Cross-browser validation**
   ```bash
   # Ejecutar en todos los browsers
   npx playwright test
   ```

## Integración con Stack Existente

```
┌─────────────────────────────────────────┐
│  Vitest + Testing Library (57 tests)   │  ← Unit/Integration
│  ✅ MANTENER                            │     (componentes, utils)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Playwright MCP                         │  ← Testing con Claude
│  ✅ AGREGAR (genera tests)              │     (debugging, generación)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  @playwright/test                       │  ← E2E en CI/CD
│  ✅ AGREGAR (ejecuta tests)             │     (regression automática)
└─────────────────────────────────────────┘
```

**Workflow completo:**

1. **Desarrollo:** Escribir código + unit tests (Vitest)
2. **Generación E2E:** Claude crea tests con Playwright MCP
3. **Revisión:** Code review de tests generados
4. **Commit:** Tests versionados en Git
5. **CI/CD:** @playwright/test ejecuta regression suite
6. **Deploy:** Con confianza (unit + E2E pass)

## Comandos Quick Reference

```bash
# Testing
npm test              # Unit tests (Vitest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:e2e:ui   # Playwright UI mode
npm run test:e2e:debug  # Debug mode

# Development
npm run test:e2e:codegen  # Generar tests grabando

# CI/CD
npx playwright test --project=chromium  # Solo Chrome
npx playwright test --grep @critical     # Solo tests críticos
```

## Métricas de Éxito

Consideraremos esta decisión exitosa si en 3 meses:

- ✅ Tenemos >10 E2E tests generados con Playwright MCP
- ✅ Tests ejecutan en CI/CD con >95% success rate
- ✅ Detectamos al menos 1 bug con E2E tests antes de producción
- ✅ Time-to-write tests se reduce 50% vs escribir manualmente
- ✅ Cross-browser coverage (Chrome + Firefox + Safari)

## Referencias

- [Playwright Documentation](https://playwright.dev/)
- [Playwright MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/playwright)
- [Best Practices E2E Testing](https://playwright.dev/docs/best-practices)
- [ADR-005: Vitest + Testing Library](005-vitest-testing-library.md)

## Próximos Pasos

- [x] Instalar @playwright/test
- [x] Configurar playwright.config.ts
- [ ] Crear primeros 3 tests críticos con Claude + Playwright MCP:
  - Login flow
  - Crear proyecto
  - Sistema de pagos
- [ ] Integrar en CI/CD (GitHub Actions)
- [ ] Documentar patterns comunes de tests E2E
- [ ] Evaluar en 3 meses: ¿Cumplimos métricas de éxito?

## Conclusión

Playwright MCP + @playwright/test es la combinación ideal para E2E testing porque:

1. **Aprovecha IA:** Claude genera tests conversacionalmente
2. **Tests persisten:** Código versionado en Git
3. **Multi-browser:** Valida en Chrome, Firefox, Safari
4. **CI/CD ready:** Ejecutable sin Claude
5. **Ecosystem robusto:** Trace viewer, codegen, UI mode, etc.
6. **Industry standard:** Playwright es líder en E2E testing moderno

---

**Última actualización:** 2025-11-01
