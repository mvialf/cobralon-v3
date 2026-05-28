# E2E Testing en Cobralon

## Configuración de Playwright

- **Test dir:** `tests/e2e/`
- **Workers:** 1 (evitar race conditions con compilación Next.js)
- **Browsers:** Chromium + Firefox (WebKit deshabilitado en WSL)
- **Timeout:** 60s por test
- **Web server:** Levanta `npm run dev` automáticamente

## Auth setup

El proyecto usa Better Auth. La sesión se comparte entre tests.

**Archivo:** `tests/e2e/auth.setup.ts`

```typescript
setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'mvial@decoplast.cl'
  const password = process.env.TEST_USER_PASSWORD || 'Pirula84'

  await page.goto('/login')
  await page.getByPlaceholder('tu@email.com').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Iniciar Sesion' }).click()

  await page.context().storageState({ path: authFile })
})
```

Los tests de Chromium y Firefox dependen del proyecto `setup` (auth).

## Cleanup de datos

Convención de nombres para datos de test: prefijos identificables.

```typescript
// tests/e2e/helpers/cleanup.ts
export const E2E_PATTERNS = {
  customer: ['E2E Test Customer', 'E2E Test No Email', 'E2E Duplicate Test', 'Test MCP'],
  project: ['Test E2E Crítico', 'E2E Test Project'],
  aftersale: ['E2E Test Aftersale', 'E2E Test Delete'],
  payment: ['REF-TEST-', 'REF-CRITICAL-', 'REF-CLIENTE-', 'REF-E2E-'],
  paymentMethod: ['E2E Test Method'],
}
```

Siempre limpiar en `test.afterAll()`:

```typescript
test.afterAll(async ({ request }) => {
  await cleanupAllE2EData(request)
})
```

El cleanup llama a `DELETE /api/test/cleanup` que borra datos por patrón de nombre.

## Page objects y helpers

- Page objects existentes: `tests/e2e/page-objects/*.page.ts`
- Dialog objects: `tests/e2e/page-objects/dialogs/*.dialog.ts`
- Cleanup: `tests/e2e/helpers/cleanup.ts`
- Datos reutilizables: `tests/e2e/helpers/test-data-factory.ts`

No existe helper global de DataTable; esperar por elementos accesibles, page objects existentes o `page.waitForResponse()` contra el endpoint real.

## Estructura de un test E2E

```typescript
import { test, expect } from '@playwright/test'
import { cleanupE2ECustomers } from './helpers/cleanup'

test.describe('Módulo de Clientes', () => {
  // Warmup del servidor antes de todos los tests
  test.beforeAll(async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health/warmup')
    expect(response.ok()).toBeTruthy()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/customer')
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible()
  })

  test('debe cargar página de clientes', async ({ page }) => {
    await expect(page.getByPlaceholder(/buscar/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /nuevo cliente/i })).toBeVisible()
  })

  test('debe crear nuevo cliente', async ({ page }) => {
    await page.getByRole('button', { name: /nuevo cliente/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/nombre/i).fill('E2E Test Customer')
    // ... llenar campos
    await dialog.getByRole('button', { name: /guardar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 15000 })
  })
})

// SIEMPRE limpiar datos de test
test.afterAll(async ({ request }) => {
  await cleanupE2ECustomers(request)
})
```

## Fixtures Excel

Los fixtures Excel viven versionados en `tests/fixtures/*.xlsx`:

- `clientes-test.xlsx`, `clientes-mixtos.xlsx`
- `proyectos-test.xlsx`, `proyectos-mixtos.xlsx`
- `pagos-test.xlsx`, `pagos-mixtos.xlsx`, `pagos-invalido.xlsx`

No hay generador versionado de fixtures Excel; usar los `.xlsx` existentes salvo que se cree uno explícitamente.

## Debugging

```bash
npx playwright test --ui              # UI interactiva (recomendado)
npx playwright test --debug            # Paso a paso con inspector
npx playwright test --trace on         # Grabar trace para analysis
npx playwright show-report             # Ver último reporte HTML
```

**Trace viewer:** Cuando un test falla en CI, baja el trace y ábrelo con `npx playwright show-trace trace.zip`.

## Timeouts

| Contexto | Timeout | Razón |
|----------|---------|-------|
| Test global | 60s | Latencia de compilación + DB |
| waitForTableReady | 15s | HydrationBoundary + query |
| Dialog visible | 15s | Animación + fetch de datos |
| Search debounce | 600ms | useDebounce del proyecto |
