# Patrones Avanzados E2E - Cobralon

## Table of Contents

1. [Page Object Model](#page-object-model)
2. [Network Mocking](#network-mocking)
3. [Test Tags](#test-tags)
4. [Data-Driven Tests](#data-driven-tests)
5. [Flaky Test Debugging](#flaky-test-debugging)

---

## Page Object Model

### BasePage

```typescript
// tests/e2e/page-objects/base.page.ts
import { Page, Locator, expect } from '@playwright/test'

export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string) {
    await this.page.goto(path)
  }

  /** Esperar a que desaparezca el skeleton/loading */
  async waitForContentReady() {
    await expect(this.page.locator('.skeleton').first())
      .not.toBeVisible({ timeout: 15000 })
      .catch(() => {}) // OK si nunca hubo skeleton
  }

  /** Verificar toast de éxito */
  async expectSuccessToast(message?: string) {
    const toast = this.page.locator('[data-sonner-toast][data-type="success"]')
    await expect(toast).toBeVisible({ timeout: 10000 })
    if (message) {
      await expect(toast).toContainText(message)
    }
  }

  /** Verificar toast de error */
  async expectErrorToast(message?: string) {
    const toast = this.page.locator('[data-sonner-toast][data-type="error"]')
    await expect(toast).toBeVisible({ timeout: 10000 })
    if (message) {
      await expect(toast).toContainText(message)
    }
  }
}
```

### Página con DataTable

```typescript
// tests/e2e/page-objects/customers.page.ts
import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

export class CustomersPage extends BasePage {
  readonly heading: Locator
  readonly newButton: Locator
  readonly searchInput: Locator
  readonly table: Locator

  constructor(page: Page) {
    super(page)
    this.heading = page.getByRole('heading', { name: 'Clientes', level: 1 })
    this.newButton = page.getByRole('button', { name: /nuevo cliente/i })
    this.searchInput = page.getByPlaceholder(/buscar cliente.../i)
    this.table = page.locator('table')
  }

  async navigate() {
    await super.goto('/customer', 'Clientes')
  }

  /** Esperar a que la tabla esté lista con datos */
  async waitForTableReady() {
    await expect(this.searchInput).toBeVisible({ timeout: 15000 })
  }

  /** Buscar en tabla esperando la respuesta de API */
  async search(term: string) {
    const responsePromise = this.page.waitForResponse(
      r => r.url().includes('/api/customers') && r.ok()
    )
    await this.searchInput.fill(term)
    await responsePromise
  }

  /** Verificar que una fila existe con el texto dado */
  async expectRowWithText(text: string) {
    await expect(this.page.getByRole('cell', { name: text })).toBeVisible()
  }

  /** Abrir dialog de nuevo cliente */
  async openNewCustomerDialog() {
    await this.newButton.click()
    const dialog = this.page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    return dialog
  }
}
```

### Página con Formulario (Dialog)

```typescript
// tests/e2e/page-objects/dialogs/new-customer.dialog.ts
import { Page, Locator, expect } from '@playwright/test'

interface CustomerFormData {
  name: string
  phone: string
  email?: string
}

export class NewCustomerDialog {
  readonly dialog: Locator
  readonly nameInput: Locator
  readonly phoneInput: Locator
  readonly emailInput: Locator
  readonly submitButton: Locator

  constructor(private page: Page) {
    this.dialog = page.getByRole('dialog')
    this.nameInput = this.dialog.getByLabel(/nombre/i)
    this.phoneInput = this.dialog.getByLabel(/teléfono/i)
    this.emailInput = this.dialog.getByLabel(/correo/i)
    this.submitButton = this.dialog.getByRole('button', { name: /crear cliente/i })
  }

  async fill(data: CustomerFormData) {
    await this.nameInput.fill(data.name)
    await this.phoneInput.fill(data.phone)
    if (data.email) {
      await this.emailInput.fill(data.email)
    }
  }

  /** Submit y esperar que cierre el dialog */
  async submit() {
    const responsePromise = this.page.waitForResponse(
      r => r.url().includes('/api/customers') && r.request().method() === 'POST'
    )
    await this.submitButton.click()
    await responsePromise
    await expect(this.dialog).not.toBeVisible({ timeout: 15000 })
  }

  async expectVisible() {
    await expect(this.dialog).toBeVisible()
  }
}
```

### Reutilización entre tests

```typescript
// CORRECTO - Reutilizar Page Objects existentes
import { CustomersPage } from './page-objects/customers.page'
import { NewCustomerDialog } from './page-objects/dialogs/new-customer.dialog'

test('crear cliente', async ({ page }) => {
  const customerPage = new CustomersPage(page)
  await customerPage.navigate()

  await customerPage.openNewCustomerDialog()
  const form = new NewCustomerDialog(page)
  await form.expectVisible()
  await form.fill({ name: 'E2E Test Customer', phone: '912345678' })
  await form.submit()
})

// INCORRECTO - Duplicar selectores
test('crear cliente', async ({ page }) => {
  await page.goto('/customer')
  await page.getByRole('button', { name: /nuevo cliente/i }).click() // duplicado
  // ...
})
```

---

## Network Mocking

### Simular error de API

```typescript
test('muestra error cuando falla la API', async ({ page }) => {
  // Interceptar antes de navegar
  await page.route('**/api/customers', route => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    })
  })

  await page.goto('/customer')
  await expect(page.getByText(/error/i)).toBeVisible()
})
```

### Simular respuesta lenta

```typescript
test('muestra loading mientras carga', async ({ page }) => {
  await page.route('**/api/customers', async route => {
    await new Promise(resolve => setTimeout(resolve, 3000))
    await route.continue()
  })

  await page.goto('/customer')
  // Verificar skeleton visible
  await expect(page.locator('.skeleton').first()).toBeVisible()
  // Luego verificar que carga
  await expect(page.locator('.skeleton').first()).not.toBeVisible({ timeout: 10000 })
})
```

### Simular email duplicado (409)

```typescript
test('maneja error de email duplicado', async ({ page }) => {
  const customerPage = new CustomersPage(page)
  await customerPage.navigate()

  // Interceptar POST para simular 409
  await page.route('**/api/customers', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'El correo ya está en uso' }),
      })
    } else {
      route.continue()
    }
  })

  await customerPage.openNewCustomerDialog()
  const form = new NewCustomerDialog(page)
  await form.fill({ name: 'Test', phone: '912345678', email: 'dup@test.com' })
  await form.submitButton.click()
  await expect(customerPage.dialog).toBeVisible()
})
```

---

## Test Tags

Organizar tests por prioridad para ejecutar subsets:

```typescript
test('flujo crítico de pago',
  { tag: ['@critical', '@payments'] },
  async ({ page }) => { /* ... */ }
)

test('columnas visibles en tabla',
  { tag: ['@smoke', '@customers'] },
  async ({ page }) => { /* ... */ }
)
```

Ejecutar por tag:

```bash
npx playwright test --grep @critical     # Solo críticos
npx playwright test --grep @smoke        # Solo smoke tests
npx playwright test --grep @payments     # Solo pagos
npx playwright test --grep-invert @slow  # Todo excepto lentos
```

---

## Data-Driven Tests

Para validaciones de formulario con múltiples casos:

```typescript
const validationCases = [
  { field: 'nombre', value: 'A', error: /al menos 2 caracteres/i },
  { field: 'teléfono', value: '123', error: /formato inválido/i },
  { field: 'teléfono', value: '', error: /requerido/i },
]

for (const { field, value, error } of validationCases) {
  test(`validación: ${field} = "${value}"`, async ({ page }) => {
    const customerPage = new CustomersPage(page)
    await customerPage.navigate()
    const dialog = await customerPage.openNewCustomerDialog()

    await dialog.getByLabel(new RegExp(field, 'i')).fill(value)
    await dialog.getByRole('button', { name: /crear/i }).click()

    await expect(dialog.getByText(error)).toBeVisible()
  })
}
```

---

## Flaky Test Debugging

### Checklist de diagnóstico

1. **Tiene `waitForTimeout`?** Reemplazar por `waitForResponse` o assertion con timeout
2. **Depende de datos de la DB?** Crear datos propios en el test
3. **Usa `networkidle`?** Reemplazar por esperar elemento específico
4. **Falla solo en Firefox?** Verificar `getByLabel` vs `getByRole('textbox')`
5. **Falla intermitentemente?** Agregar `trace: 'on'` al test y revisar trace viewer

### Comandos de debug

```bash
# UI interactiva - lo más útil
npx playwright test customers.spec.ts --ui

# Debug paso a paso con inspector
npx playwright test customers.spec.ts --debug

# Grabar trace para análisis posterior
npx playwright test customers.spec.ts --trace on

# Ver trace grabado
npx playwright show-trace test-results/*/trace.zip

# Solo un browser para aislar el problema
npx playwright test --project=chromium customers.spec.ts
```

### Diferencias Firefox conocidas en Cobralon

- `getByLabel` puede no funcionar en Firefox para inputs con label implícito
- Usar `getByRole('textbox', { name: /campo/i })` como fallback
- Los dialogs pueden tardar más en Firefox con animaciones
