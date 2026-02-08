---
name: cobralon-e2e-playwright
description: Patrones de E2E testing con Playwright para Cobralon.
---

<!-- USAR CUANDO: escribir tests E2E nuevos, refactorizar tests E2E existentes,
debuggear tests flaky, o decidir cómo estructurar un test E2E.

USAR SIEMPRE JUNTO CON: cobralon-testing-strategy (para auth setup,
cleanup patterns, comandos, y decisión de qué testear).

NO CUBRE: unit tests, mocking de Prisma, coverage (ver cobralon-testing-strategy). -->

# E2E Testing con Playwright - Cobralon

## Workflow: Explorar antes de codear

**Si tienes Playwright MCP disponible, SIEMPRE explorar la UI antes de escribir tests:**

1. Navegar a la página objetivo
2. Tomar snapshot para ver estructura real del DOM
3. Interactuar con formularios/elementos para verificar el flujo exacto
4. Documentar selectores reales de los snapshots
5. Solo después de explorar, escribir el test con selectores verificados

**Si MCP NO disponible:** Analizar el código fuente del componente para entender la UI.

**Nunca asumir cómo funciona la UI.** Los tests deben reflejar el comportamiento real.

## Estructura de archivos

```
tests/e2e/
├── auth.setup.ts              # Auth compartida (ver cobralon-testing-strategy)
├── helpers/
│   ├── cleanup.ts             # Cleanup via API (ver cobralon-testing-strategy)
│   └── wait-for-table.ts      # Helpers de DataTable
├── {modulo}.spec.ts           # Tests del módulo
└── pages/                     # Page Objects (crear si no existe)
    ├── base-page.ts
    └── {modulo}-page.ts
```

## Selectores - Prioridad obligatoria

```typescript
// 1. MEJOR - getByRole para elementos interactivos
page.getByRole('button', { name: /nuevo cliente/i })
page.getByRole('heading', { name: 'Clientes', level: 1 })
page.getByRole('dialog')
page.getByRole('cell', { name: customerName })
page.getByRole('menuitem', { name: /editar/i })

// 2. MEJOR - getByLabel para form controls
page.getByLabel(/nombre/i)
page.getByLabel(/teléfono/i)

// 3. ACEPTABLE - getByPlaceholder para búsquedas
page.getByPlaceholder(/buscar cliente.../i)

// 4. ACEPTABLE - getByText para contenido estático
page.getByText(/no se encontraron resultados/i)

// 5. ULTIMO RECURSO - getByTestId
page.getByTestId('credit-balance')

// PROHIBIDO - Selectores frágiles
page.locator('.btn-primary')           // NO: clase CSS
page.locator('#email')                 // NO: ID
page.locator('div > form > input')     // NO: estructura DOM
page.locator('table tbody tr').first() // NO: posición
```

## Waiting - Qué usar y qué NO

```typescript
// CORRECTO - Esperar condiciones específicas
await expect(page.getByRole('heading')).toBeVisible()
await expect(dialog).not.toBeVisible({ timeout: 15000 })
await page.waitForURL('/customer')

// CORRECTO - Esperar respuesta de API
const responsePromise = page.waitForResponse(
  resp => resp.url().includes('/api/customer') && resp.ok()
)
await page.getByRole('button', { name: /guardar/i }).click()
await responsePromise

// CORRECTO - Para debounce de búsqueda (600ms en Cobralon)
// Esperar a que la tabla se actualice en vez de timeout fijo
await searchInTable(page, 'término')  // helper que maneja el debounce
// O esperar respuesta de API:
const searchResponse = page.waitForResponse(r => r.url().includes('/api/customer'))
await page.getByPlaceholder(/buscar/i).fill('término')
await searchResponse

// PROHIBIDO
await page.waitForTimeout(600)              // NO: timer arbitrario
await page.waitForTimeout(1000)             // NO: timer arbitrario
await page.waitForLoadState('networkidle')  // NO: unreliable, se cuelga
```

## Tests determinísticos - Reglas

```typescript
// CORRECTO - El test controla sus propios datos
test('debe crear y buscar cliente', async ({ page }) => {
  const name = `E2E Test Customer ${Date.now()}`

  // Crear dato de test
  await createCustomer(page, { name, phone: '912345678' })

  // Verificar el dato creado
  await searchInTable(page, name)
  await expect(page.getByRole('cell', { name })).toBeVisible()
})

// PROHIBIDO - Depender de datos existentes en la DB
test('debe buscar clientes', async ({ page }) => {
  const firstRow = page.locator('table tbody tr').first()
  const exists = await firstRow.isVisible().catch(() => false)
  if (exists) {  // NO: si la DB está vacía, el test no hace nada
    // ...
  }
})

// PROHIBIDO - Test que no assertiona nada concreto
test('paginación', async ({ page }) => {
  const hasNext = await nextButton.isEnabled().catch(() => false)
  if (hasNext) { await nextButton.click() }  // NO: no verifica resultado
})
```

## Patrón de test completo en Cobralon

```typescript
import { test, expect } from '@playwright/test'
import { cleanupE2ECustomers } from './helpers/cleanup'

test.describe('Módulo de Clientes', () => {
  // Warmup obligatorio
  test.beforeAll(async ({ request }) => {
    const resp = await request.get('http://localhost:3000/api/health/warmup')
    expect(resp.ok()).toBeTruthy()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/customer')
    await expect(page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible()
  })

  test('debe crear cliente exitosamente', async ({ page }) => {
    const name = `E2E Test Customer ${Date.now()}`

    // Acción
    await page.getByRole('button', { name: /nuevo cliente/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Llenar formulario
    await dialog.getByLabel(/nombre/i).fill(name)
    await dialog.getByLabel(/teléfono/i).fill('912345678')

    // Submit y esperar respuesta
    const saveResponse = page.waitForResponse(
      r => r.url().includes('/api/customer') && r.request().method() === 'POST'
    )
    await dialog.getByRole('button', { name: /crear/i }).click()
    await saveResponse

    // Verificar resultado
    await expect(dialog).not.toBeVisible({ timeout: 15000 })
  })

  // Cleanup SIEMPRE
  test.afterAll(async ({ request }) => {
    await cleanupE2ECustomers(request)
  })
})
```

## Anti-patrones frecuentes en Cobralon

| Anti-patrón | Problema | Solución |
|------------|---------|----------|
| `waitForTimeout(600)` | Flaky en máquinas lentas | `waitForResponse` o helper con retry |
| `if (exists) { ... }` | Test no determinístico | Crear datos propios antes de verificar |
| `locator('table tbody tr').first()` | Depende del orden de la DB | Buscar por contenido específico |
| `waitForLoadState('networkidle')` | Se cuelga o no espera suficiente | Esperar elemento específico |
| Selectores duplicados en cada test | Maintenance hell | Page Objects |
| Test sin assertions útiles | Falsa confianza | Cada test debe verificar resultado concreto |

## Page Objects y Network Mocking

Para patrones detallados de:
- **Page Object Model** adaptado a Cobralon (BasePage, páginas específicas, reutilización)
- **Network mocking** (simular errores de API, respuestas lentas)
- **Test tags** (@critical, @smoke) para organizar suites
- **Flaky test debugging** (checklist de diagnóstico)

Ver [references/advanced-patterns.md](references/advanced-patterns.md)

## Relación con otros skills

| Recurso | Qué usar de ahí |
|---------|------------------|
| `cobralon-testing-strategy` | Auth setup, cleanup, helpers, decisión de qué testear |
| API de Playwright | Consultar Context7 o docs oficiales |
| Este skill | HOW-TO de escritura de tests E2E de calidad |
