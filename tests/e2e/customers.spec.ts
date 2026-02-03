import { test, expect } from '@playwright/test'
import { CustomersPage } from './page-objects/customers.page'
import { NewCustomerDialog } from './page-objects/dialogs/new-customer.dialog'
import { cleanupE2ECustomers } from './helpers/cleanup'

/**
 * Tests E2E para el Módulo de Clientes
 *
 * Flujos cubiertos:
 * - Navegación a la página de clientes
 * - Creación de cliente (CRUD - Create)
 * - Búsqueda de clientes (CRUD - Read)
 * - Validación de formularios (nombre mínimo 2 caracteres, teléfono chileno, email válido)
 * - Manejo de errores (email duplicado - 409 Conflict)
 * - Paginación de la tabla
 *
 * Flujos NO cubiertos (no implementados en la UI):
 * - Edición de cliente (botón existe pero sin funcionalidad)
 * - Eliminación de cliente (botón existe pero sin funcionalidad)
 *
 * CLEANUP: Este archivo limpia automáticamente los customers E2E
 * después de ejecutar todos los tests (afterAll).
 *
 * Para ejecutar:
 * - npm run test:e2e -- customers.spec.ts
 * - npm run test:e2e:ui -- customers.spec.ts (modo UI)
 */

// Timestamp compartido entre tests para referenciar el cliente creado
const timestamp = Date.now()
const E2E_CUSTOMER_NAME = `E2E Test Customer ${timestamp}`
const E2E_CUSTOMER_EMAIL = `e2e-test-${timestamp}@example.com`
const E2E_CUSTOMER_PHONE = '912345678'

test.describe('Módulo de Clientes', () => {
  // Health check antes de ejecutar tests para verificar que la DB está activa
  test.beforeAll(async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health/warmup')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.status).toBe('ok')
  })

  test.beforeEach(async ({ page }) => {
    const customersPage = new CustomersPage(page)
    await customersPage.navigate()
  })

  test('debe cargar la página de clientes correctamente', async ({ page }) => {
    const customersPage = new CustomersPage(page)

    // Verificar título de la página
    await expect(page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible()

    // Verificar que el botón "Nuevo Cliente" existe
    await expect(page.getByRole('button', { name: /nuevo cliente/i })).toBeVisible()

    // Verificar que el botón "Importar" existe (es un link, no button)
    await expect(customersPage.importLink).toBeVisible()

    // Esperar a que la tabla termine de cargar (datos del API)
    // El DataTableToolbar (con el input de búsqueda) solo se renderiza cuando hay datos
    await expect(customersPage.searchInput).toBeVisible({ timeout: 15000 })

    // Verificar que la tabla está presente
    await customersPage.waitForTable()
  })

  test('debe abrir el dialog de nuevo cliente', async ({ page }) => {
    const customersPage = new CustomersPage(page)
    const dialog = new NewCustomerDialog(page)

    // Click en botón "Nuevo Cliente"
    await customersPage.openNewCustomerDialog()

    // Verificar que se abre el dialog con heading y descripción
    await dialog.expectVisible()
    await expect(customersPage.dialog.getByText(/ingresa los datos del nuevo cliente/i)).toBeVisible()

    // Verificar que los 3 campos del formulario están presentes
    await expect(dialog.nameInput).toBeVisible()
    await expect(dialog.phoneInput).toBeVisible()
    await expect(dialog.emailInput).toBeVisible()

    // Verificar botón de submit
    await expect(dialog.submitButton).toBeVisible()
  })

  test('debe validar campos obligatorios del formulario', async ({ page }) => {
    const customersPage = new CustomersPage(page)
    const dialog = new NewCustomerDialog(page)

    // Abrir dialog de nuevo cliente
    await customersPage.openNewCustomerDialog()
    await dialog.expectVisible()

    // Intentar enviar formulario vacío
    await dialog.submitButton.click()

    // Verificar mensajes de error de validación
    // Nombre: mínimo 2 caracteres
    await expect(customersPage.dialog.getByText(/el nombre debe tener al menos 2 caracteres/i)).toBeVisible()

    // Teléfono: obligatorio
    await expect(customersPage.dialog.getByText(/el teléfono es requerido/i)).toBeVisible()

    // Email: no tiene mensaje de error porque es opcional
    // (solo valida formato si se ingresa algo)
  })

  test('debe validar formato de teléfono chileno', async ({ page }) => {
    const customersPage = new CustomersPage(page)
    const dialog = new NewCustomerDialog(page)

    // Abrir dialog de nuevo cliente
    await customersPage.openNewCustomerDialog()
    await dialog.expectVisible()

    // Llenar campos con datos válidos excepto teléfono
    await dialog.fill({ name: 'Test Cliente', phone: '123456789' })

    // Intentar enviar
    await dialog.submitButton.click()

    // Verificar mensaje de error de formato
    await expect(customersPage.dialog.getByText(/formato inválido.*teléfono chileno válido/i)).toBeVisible()
  })

  test('debe validar formato de email si se proporciona', async ({ page }) => {
    const customersPage = new CustomersPage(page)
    const dialog = new NewCustomerDialog(page)

    // Abrir dialog de nuevo cliente
    await customersPage.openNewCustomerDialog()
    await dialog.expectVisible()

    // Llenar campos con datos válidos excepto email
    await dialog.fill({ name: 'Test Cliente', phone: '912345678', email: 'email-invalido' })

    // Intentar enviar
    await dialog.submitButton.click()

    // HTML5 valida el email y muestra tooltip nativo (no accesible vía Playwright)
    // Verificamos que el formulario NO se submita: el dialog permanece abierto
    await expect(customersPage.dialog).toBeVisible()

    // Verificar que el campo de email sigue con el valor inválido (no se limpió)
    await expect(dialog.emailInput).toHaveValue('email-invalido')
  })

  test('debe crear un cliente completo exitosamente', async ({ page }) => {
    const customersPage = new CustomersPage(page)
    const dialog = new NewCustomerDialog(page)

    // Abrir dialog de nuevo cliente
    await customersPage.openNewCustomerDialog()
    await dialog.expectVisible()

    // Llenar formulario completo
    await dialog.fill({
      name: E2E_CUSTOMER_NAME,
      phone: E2E_CUSTOMER_PHONE,
      email: E2E_CUSTOMER_EMAIL,
    })

    // Enviar formulario y esperar cierre del dialog
    await dialog.submit()

    // Buscar el cliente recién creado en la tabla
    await customersPage.searchCustomer(E2E_CUSTOMER_NAME)

    // Verificar que el cliente aparece en la tabla
    await expect(page.getByRole('cell', { name: E2E_CUSTOMER_NAME, exact: true })).toBeVisible()

    // Verificar que el teléfono está normalizado (+56 prefix)
    await expect(page.getByRole('cell', { name: `+56${E2E_CUSTOMER_PHONE}` }).first()).toBeVisible()

    // Verificar que el email aparece
    await expect(page.getByRole('cell', { name: E2E_CUSTOMER_EMAIL })).toBeVisible()
  })

  test('debe crear un cliente sin email (campo opcional)', async ({ page }) => {
    const customersPage = new CustomersPage(page)
    const dialog = new NewCustomerDialog(page)

    const noEmailTimestamp = Date.now()
    const customerName = `E2E Test No Email ${noEmailTimestamp}`
    const customerPhone = '987654321'

    // Abrir dialog de nuevo cliente
    await customersPage.openNewCustomerDialog()
    await dialog.expectVisible()

    // Llenar solo nombre y teléfono (email vacío)
    await dialog.fill({ name: customerName, phone: customerPhone })

    // Enviar formulario y esperar cierre del dialog
    await dialog.submit()

    // Buscar el cliente recién creado
    await customersPage.searchCustomer(customerName)

    // Verificar que el cliente aparece en la tabla
    await expect(page.getByRole('cell', { name: customerName, exact: true })).toBeVisible()
  })

  test('debe manejar error de email duplicado (409 Conflict)', async ({ page }) => {
    const customersPage = new CustomersPage(page)
    const dialog = new NewCustomerDialog(page)

    // Generar datos únicos para el primer cliente
    const dupTimestamp = Date.now()
    const duplicateEmail = `e2e-duplicate-${dupTimestamp}@example.com`

    // Crear el primer cliente
    await customersPage.openNewCustomerDialog()
    await dialog.expectVisible()
    await dialog.fill({
      name: `E2E Duplicate Test ${dupTimestamp}`,
      phone: '923456789',
      email: duplicateEmail,
    })
    await dialog.submit()

    // Intentar crear un segundo cliente con el MISMO email
    await customersPage.openNewCustomerDialog()
    await dialog.expectVisible()

    await dialog.fill({
      name: `E2E Duplicate Test 2 ${dupTimestamp}`,
      phone: '934567890',
      email: duplicateEmail,
    })

    await dialog.submitButton.click()

    // Verificar que el dialog NO se cierra (indica error)
    await expect(customersPage.dialog).toBeVisible()
  })

  test('debe realizar búsqueda de clientes correctamente', async ({ page }) => {
    const customersPage = new CustomersPage(page)

    // Buscar el cliente E2E creado en el test anterior
    // Los tests corren secuencialmente dentro del describe
    await customersPage.searchCustomer(E2E_CUSTOMER_NAME)

    // Verificar que hay al menos 1 resultado
    const rowCount = await customersPage.getTableRowCount()
    expect(rowCount).toBeGreaterThanOrEqual(1)

    // Verificar que el cliente aparece en los resultados
    await expect(page.getByRole('cell', { name: E2E_CUSTOMER_NAME, exact: true })).toBeVisible()

    // Búsqueda con término que no existe
    await customersPage.searchCustomer('ZZZZZ_NO_EXISTE_999')

    // Verificar mensaje de "No se encontraron resultados"
    await expect(page.getByText(/no se encontraron resultados/i)).toBeVisible()
  })

  test('debe mostrar dropdown de acciones por cliente', async ({ page }) => {
    const customersPage = new CustomersPage(page)

    // Buscar el cliente E2E creado anteriormente para asegurar datos en la tabla
    await customersPage.searchCustomer(E2E_CUSTOMER_NAME)

    // Verificar que el cliente aparece
    await expect(page.getByRole('cell', { name: E2E_CUSTOMER_NAME, exact: true })).toBeVisible()

    // Click en el botón de acciones (tres puntos) de la primera fila
    const firstRow = page.locator('table tbody tr').first()
    const actionsButton = firstRow.getByRole('button').first()
    await actionsButton.click()

    // Verificar que se abre el dropdown con las opciones
    await expect(page.getByRole('menuitem', { name: /copiar correo/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /registrar pago/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /editar/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /eliminar/i })).toBeVisible()

    // Nota: "Devolver crédito" es condicional (solo si creditBalance > 0)
  })

  test('debe navegar entre páginas de la tabla (paginación)', async ({ page }) => {
    const customersPage = new CustomersPage(page)

    // Esperar a que la tabla cargue
    await customersPage.waitForTable()

    // Verificar que existen controles de paginación
    const paginationControls = page
      .locator('[aria-label*="pagination"]')
      .or(page.locator('button:has-text("Anterior"), button:has-text("Siguiente")'))
    const hasPagination = await paginationControls
      .first()
      .isVisible()
      .catch(() => false)

    if (hasPagination) {
      // Intentar navegar a la siguiente página
      const nextButton = page.getByRole('button', { name: /siguiente/i })
      const isNextEnabled = await nextButton.isEnabled().catch(() => false)

      if (isNextEnabled) {
        // Esperar la respuesta del API al cambiar de página
        const responsePromise = page.waitForResponse(
          (r) => r.url().includes('/api/customers') && r.request().method() === 'GET'
        )
        await nextButton.click()
        await responsePromise

        // Verificar que la tabla sigue visible después del cambio de página
        await customersPage.waitForTable()
      }
    }
  })

  test('debe mostrar columnas correctas en la tabla', async ({ page }) => {
    const customersPage = new CustomersPage(page)

    // Esperar a que DataTable esté completamente renderizada (el search input confirma esto)
    await expect(customersPage.searchInput).toBeVisible({ timeout: 15000 })

    // Verificar que la tabla tiene las columnas correctas
    await customersPage.waitForTable()

    // Verificar headers por su texto dentro de los botones
    await expect(page.getByRole('button', { name: 'Nombre' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Teléfono' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Correo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Crédito' })).toBeVisible()

    // La columna de "Acciones" generalmente no tiene texto, solo el header con botones
  })

  // Cleanup: Eliminar todos los customers creados por tests E2E
  test.afterAll(async ({ request }) => {
    await cleanupE2ECustomers(request)
  })
})
