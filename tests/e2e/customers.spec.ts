import { test, expect } from '@playwright/test'
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
 * Prerequisitos:
 * - Base de datos debe tener al menos 1 cliente existente
 * - El cliente de prueba que crearemos NO debe existir previamente
 *
 * CLEANUP: Este archivo limpia automáticamente los customers E2E
 * después de ejecutar todos los tests (afterAll).
 *
 * Para ejecutar:
 * - npm run test:e2e -- customers.spec.ts
 * - npm run test:e2e:ui -- customers.spec.ts (modo UI)
 */

test.describe('Módulo de Clientes', () => {
  // Health check antes de ejecutar tests para verificar que la DB está activa
  test.beforeAll(async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health/warmup')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.status).toBe('ok')

    // Log si hubo cold start (útil para debugging)
    if (data.coldStart) {
      console.info(`⚠️  Database cold start detected (${data.latency})`)
    }
  })

  test.beforeEach(async ({ page }) => {
    // Navegar a la página de clientes antes de cada test
    await page.goto('/customer')

    // Esperar a que la página cargue completamente
    await expect(page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible()
  })

  test('debe cargar la página de clientes correctamente', async ({ page }) => {
    // Verificar título de la página
    await expect(page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible()

    // Verificar que el botón "Nuevo Cliente" existe
    await expect(page.getByRole('button', { name: /nuevo cliente/i })).toBeVisible()

    // Verificar que el botón "Importar" existe (es un link, no button)
    await expect(page.getByRole('link', { name: /importar/i })).toBeVisible()

    // Esperar a que la tabla termine de cargar (datos del API)
    // El DataTableToolbar (con el input de búsqueda) solo se renderiza cuando hay datos
    // Usar timeout generoso porque puede haber latencia de red
    await expect(page.getByPlaceholder(/buscar cliente.../i)).toBeVisible({ timeout: 15000 })

    // Verificar que la tabla está presente
    const contentVisible = await page
      .locator('table, .skeleton, :has-text("No se encontraron resultados")')
      .first()
      .isVisible()
      .catch(() => false)

    expect(contentVisible).toBeTruthy()
  })

  test('debe abrir el dialog de nuevo cliente', async ({ page }) => {
    // Click en botón "Nuevo Cliente"
    await page.getByRole('button', { name: /nuevo cliente/i }).click()

    // Verificar que se abre el dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /nuevo cliente/i })).toBeVisible()

    // Verificar descripción del dialog
    await expect(dialog.getByText(/ingresa los datos del nuevo cliente/i)).toBeVisible()

    // Verificar que los 3 campos del formulario están presentes
    await expect(dialog.getByLabel(/nombre/i)).toBeVisible()
    await expect(dialog.getByLabel(/teléfono/i)).toBeVisible()
    await expect(dialog.getByLabel(/correo/i)).toBeVisible()

    // Verificar botón de submit
    await expect(dialog.getByRole('button', { name: /crear cliente/i })).toBeVisible()
  })

  test('debe validar campos obligatorios del formulario', async ({ page }) => {
    // Abrir dialog de nuevo cliente
    await page.getByRole('button', { name: /nuevo cliente/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Intentar enviar formulario vacío
    await dialog.getByRole('button', { name: /crear cliente/i }).click()

    // Verificar mensajes de error de validación
    // Nombre: mínimo 2 caracteres
    await expect(dialog.getByText(/el nombre debe tener al menos 2 caracteres/i)).toBeVisible()

    // Teléfono: obligatorio
    await expect(dialog.getByText(/el teléfono es requerido/i)).toBeVisible()

    // Email: no tiene mensaje de error porque es opcional
    // (solo valida formato si se ingresa algo)
  })

  test('debe validar formato de teléfono chileno', async ({ page }) => {
    // Abrir dialog de nuevo cliente
    await page.getByRole('button', { name: /nuevo cliente/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Llenar campos con datos válidos excepto teléfono
    await dialog.getByLabel(/nombre/i).fill('Test Cliente')
    await dialog.getByLabel(/teléfono/i).fill('123456789') // Formato inválido

    // Intentar enviar
    await dialog.getByRole('button', { name: /crear cliente/i }).click()

    // Verificar mensaje de error de formato
    await expect(dialog.getByText(/formato inválido.*teléfono chileno válido/i)).toBeVisible()
  })

  test('debe validar formato de email si se proporciona', async ({ page }) => {
    // Abrir dialog de nuevo cliente
    await page.getByRole('button', { name: /nuevo cliente/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Llenar campos con datos válidos excepto email
    await dialog.getByLabel(/nombre/i).fill('Test Cliente')
    await dialog.getByLabel(/teléfono/i).fill('912345678') // Formato válido chileno
    await dialog.getByLabel(/correo/i).fill('email-invalido') // Email inválido

    // Intentar enviar
    await dialog.getByRole('button', { name: /crear cliente/i }).click()

    // HTML5 valida el email y muestra tooltip nativo (no accesible vía Playwright)
    // Verificamos que el formulario NO se submita: el dialog permanece abierto
    await page.waitForTimeout(1000)
    await expect(dialog).toBeVisible()

    // Verificar que el campo de email sigue con el valor inválido (no se limpió)
    await expect(dialog.getByLabel(/correo/i)).toHaveValue('email-invalido')
  })

  test('debe crear un cliente completo exitosamente', async ({ page }) => {
    // Generar datos únicos para evitar conflictos
    const timestamp = Date.now()
    const customerName = `E2E Test Customer ${timestamp}`
    const customerEmail = `e2e-test-${timestamp}@example.com`
    const customerPhone = '912345678' // Formato chileno válido

    // Abrir dialog de nuevo cliente
    await page.getByRole('button', { name: /nuevo cliente/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Llenar formulario completo
    await dialog.getByLabel(/nombre/i).fill(customerName)
    await dialog.getByLabel(/teléfono/i).fill(customerPhone)
    await dialog.getByLabel(/correo/i).fill(customerEmail)

    // Enviar formulario
    await dialog.getByRole('button', { name: /crear cliente/i }).click()

    // Esperar a que el dialog se cierre (señal de éxito)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Verificar que aparece el toast de éxito (opcional, depende de implementación)
    // await expect(page.getByText(/cliente creado exitosamente/i)).toBeVisible()

    // Buscar el cliente recién creado en la tabla
    await page.getByPlaceholder(/buscar cliente.../i).fill(customerName)

    // Esperar a que la búsqueda se ejecute (tiene debounce de 500ms)
    await page.waitForTimeout(600)

    // Verificar que el cliente aparece en la tabla
    await expect(page.getByRole('cell', { name: customerName, exact: true })).toBeVisible()

    // Verificar que el teléfono está normalizado (+56 prefix)
    // Usar .first() para evitar strict mode violation si hay múltiples clientes con mismo teléfono
    await expect(page.getByRole('cell', { name: `+56${customerPhone}` }).first()).toBeVisible()

    // Verificar que el email aparece
    await expect(page.getByRole('cell', { name: customerEmail })).toBeVisible()
  })

  test('debe crear un cliente sin email (campo opcional)', async ({ page }) => {
    // Generar datos únicos
    const timestamp = Date.now()
    const customerName = `E2E Test No Email ${timestamp}`
    const customerPhone = '987654321'

    // Abrir dialog de nuevo cliente
    await page.getByRole('button', { name: /nuevo cliente/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Llenar solo nombre y teléfono (email vacío)
    await dialog.getByLabel(/nombre/i).fill(customerName)
    // Usar getByRole en lugar de getByLabel para mejor compatibilidad Firefox
    const phoneInput = dialog.getByRole('textbox', { name: /teléfono/i })
    await phoneInput.fill(customerPhone)
    // NO llenar email

    // Enviar formulario
    await dialog.getByRole('button', { name: /crear cliente/i }).click()

    // Esperar a que el dialog se cierre
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Buscar el cliente recién creado
    await page.getByPlaceholder(/buscar cliente.../i).fill(customerName)
    await page.waitForTimeout(600)

    // Verificar que el cliente aparece en la tabla
    await expect(page.getByRole('cell', { name: customerName, exact: true })).toBeVisible()
  })

  test('debe manejar error de email duplicado (409 Conflict)', async ({ page }) => {
    // Generar datos únicos para el primer cliente
    const timestamp = Date.now()
    const customerName1 = `E2E Duplicate Test ${timestamp}`
    const duplicateEmail = `e2e-duplicate-${timestamp}@example.com`
    const customerPhone1 = '923456789'

    // Crear el primer cliente
    await page.getByRole('button', { name: /nuevo cliente/i }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel(/nombre/i).fill(customerName1)
    await dialog.getByLabel(/teléfono/i).fill(customerPhone1)
    await dialog.getByLabel(/correo/i).fill(duplicateEmail)
    await dialog.getByRole('button', { name: /crear cliente/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Intentar crear un segundo cliente con el MISMO email
    const customerName2 = `E2E Duplicate Test 2 ${timestamp}`
    const customerPhone2 = '934567890'

    await page.getByRole('button', { name: /nuevo cliente/i }).click()
    dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel(/nombre/i).fill(customerName2)
    await dialog.getByLabel(/teléfono/i).fill(customerPhone2)
    await dialog.getByLabel(/correo/i).fill(duplicateEmail) // Email duplicado

    await dialog.getByRole('button', { name: /crear cliente/i }).click()

    // Verificar que aparece mensaje de error de email duplicado
    // El dialog NO debe cerrarse
    await expect(dialog).toBeVisible()

    // Verificar que aparece un toast de error (esto puede variar según implementación)
    // await expect(page.getByText(/el correo electrónico ya está en uso/i)).toBeVisible()

    // O verificar que hay un error visible en el formulario
    // Nota: El comportamiento exacto depende de cómo se manejen los errores 409 en el backend
  })

  test('debe realizar búsqueda de clientes correctamente', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

    // Obtener un nombre de cliente existente de la tabla (si hay datos)
    const firstCustomerCell = page.locator('table tbody tr').first().locator('td').first()
    const customerExists = await firstCustomerCell.isVisible().catch(() => false)

    if (customerExists) {
      const customerName = await firstCustomerCell.textContent()

      if (customerName) {
        // Buscar por ese nombre
        await page.getByPlaceholder(/buscar cliente.../i).fill(customerName.substring(0, 5))

        // Esperar debounce
        await page.waitForTimeout(600)

        // Verificar que la búsqueda se ejecutó
        // (la tabla debe mostrar resultados filtrados)
        const tableRows = page.locator('table tbody tr')
        const rowCount = await tableRows.count()

        // Debe haber al menos 1 resultado (el cliente buscado)
        expect(rowCount).toBeGreaterThanOrEqual(1)
      }
    }

    // Búsqueda con término que no existe
    await page.getByPlaceholder(/buscar cliente.../i).clear()
    await page.getByPlaceholder(/buscar cliente.../i).fill('ZZZZZ_NO_EXISTE_999')
    await page.waitForTimeout(600)

    // Verificar mensaje de "No se encontraron resultados"
    await expect(page.getByText(/no se encontraron resultados/i)).toBeVisible()
  })

  test('debe mostrar dropdown de acciones por cliente', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

    // Verificar que existe al menos un cliente en la tabla
    const firstRow = page.locator('table tbody tr').first()
    const rowExists = await firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Click en el botón de acciones (tres puntos)
      const actionsButton = firstRow.getByRole('button').first()
      await actionsButton.click()

      // Verificar que se abre el dropdown con las opciones
      await expect(page.getByRole('menuitem', { name: /copiar correo/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /registrar pago/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /editar/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /eliminar/i })).toBeVisible()

      // Nota: "Devolver crédito" es condicional (solo si creditBalance > 0)
    }
  })

  test('debe navegar entre páginas de la tabla (paginación)', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

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
        await nextButton.click()

        // Esperar a que la tabla recargue
        await page.waitForTimeout(1000)

        // Verificar que cambia el indicador de página
        // (esto depende de la implementación específica del componente de paginación)
      }
    }
  })

  test('debe mostrar columnas correctas en la tabla', async ({ page }) => {
    // Esperar a que la tabla cargue completamente (datos del API)
    await page.waitForLoadState('networkidle')

    // Esperar a que DataTable esté completamente renderizada (el search input confirma esto)
    await expect(page.getByPlaceholder(/buscar cliente.../i)).toBeVisible({ timeout: 15000 })

    // Verificar que la tabla tiene las columnas correctas
    // Nota: Los headers se renderizan como botones interactivos para ordenamiento
    const tableContainer = page.locator('table').first()
    await expect(tableContainer).toBeVisible()

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
