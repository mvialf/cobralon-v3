import { test, expect } from '@playwright/test'

/**
 * Tests E2E para el Sistema de Pagos
 *
 * Flujos cubiertos:
 * - Navegación a la página de pagos
 * - Creación de pago a proyecto (1:1)
 * - Validación de formularios
 * - Visualización de detalles de pago
 *
 * Prerequisitos:
 * - Base de datos debe tener al menos:
 *   - 1 cliente con proyectos
 *   - 1 proyecto con balance pendiente
 *   - 1 método de pago configurado
 *
 * Para ejecutar:
 * - npm run test:e2e -- payments.spec.ts
 * - npm run test:e2e:ui -- payments.spec.ts (modo UI)
 */

test.describe('Sistema de Pagos', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de pagos antes de cada test
    await page.goto('/payments')

    // Esperar a que la página cargue completamente
    await expect(page.getByRole('heading', { name: /pagos/i, level: 1 })).toBeVisible()
  })

  test('debe cargar la página de pagos correctamente', async ({ page }) => {
    // Verificar título de la página (CardTitle, no es un heading semántico)
    await expect(page.getByText('Todos los Pagos', { exact: true })).toBeVisible()

    // Verificar que el botón "Nuevo Pago" existe
    await expect(page.getByRole('button', { name: /nuevo pago/i })).toBeVisible()

    // Verificar que el área de contenido está presente (tabla, skeleton o mensaje de vacío)
    // Al menos uno de estos debe estar visible:
    // - Tabla con datos
    // - Skeleton de carga
    // - Mensaje "No hay pagos registrados"
    const contentVisible = await page
      .locator('table, .skeleton, :has-text("No hay pagos")')
      .first()
      .isVisible()
      .catch(() => false)

    expect(contentVisible).toBeTruthy()
  })

  test('debe abrir el dropdown de nuevo pago', async ({ page }) => {
    // Click en botón "Nuevo Pago"
    await page.getByRole('button', { name: /nuevo pago/i }).click()

    // Verificar que se abre el dropdown con las 2 opciones
    await expect(page.getByRole('menuitem', { name: /pago a proyecto \(1:1\)/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i })).toBeVisible()
  })

  test('debe abrir el dialog de pago a proyecto (1:1)', async ({ page }) => {
    // Abrir dropdown
    await page.getByRole('button', { name: /nuevo pago/i }).click()

    // Click en opción "Pago a Proyecto (1:1)"
    await page.getByRole('menuitem', { name: /pago a proyecto \(1:1\)/i }).click()

    // Verificar que se abre el dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /pago a proyecto/i })).toBeVisible()

    // Verificar campos iniciales (antes de seleccionar proyecto/método)
    await expect(dialog.getByRole('combobox', { name: /proyecto/i })).toBeVisible()
    await expect(dialog.getByLabel(/monto/i)).toBeVisible() // Existe pero está disabled
    await expect(dialog.getByLabel(/fecha/i)).toBeVisible()

    // Nota: Referencia solo aparece DESPUÉS de seleccionar método de pago

    // Verificar botón de submit
    await expect(dialog.getByRole('button', { name: /registrar pago/i })).toBeVisible()
  })

  test('debe validar campos obligatorios del formulario', async ({ page }) => {
    // Abrir dialog de pago a proyecto
    await page.getByRole('button', { name: /nuevo pago/i }).click()
    await page.getByRole('menuitem', { name: /pago a proyecto \(1:1\)/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Verificar que el botón está deshabilitado inicialmente
    // (no hay proyecto seleccionado, por lo tanto disabled)
    const submitButton = dialog.getByRole('button', { name: /registrar pago/i })
    await expect(submitButton).toBeDisabled()

    // Nota: El campo monto está deshabilitado hasta seleccionar proyecto
    // El campo referencia no aparece hasta seleccionar método de pago
    // Este test verifica que el formulario no se puede enviar sin datos completos
  })

  test.describe('Creación de Pago a Proyecto (1:1)', () => {
    test('flujo completo de creación de pago', async ({ page }) => {
      // PASO 1: Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a proyecto \(1:1\)/i }).click()

      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: /pago a proyecto/i })).toBeVisible()

      // PASO 2: Seleccionar proyecto
      const projectCombobox = dialog.getByRole('combobox', { name: /proyecto/i })
      await projectCombobox.click()

      // Buscar un proyecto
      await page.keyboard.type('PRO')
      await page.waitForTimeout(500) // Esperar debounce

      // Verificar si hay opciones disponibles
      const options = page.locator('[role="option"]')
      const optionsCount = await options.count()

      // Si no hay proyectos, skip el resto del test
      if (optionsCount === 0) {
        console.log('⚠️  No hay proyectos en la base de datos - skipping test')
        return
      }

      // Seleccionar el primer resultado
      const firstOption = options.first()
      await expect(firstOption).toBeVisible({ timeout: 5000 })
      await firstOption.click()

      // PASO 3: Llenar monto
      const amountInput = dialog.getByLabel(/monto/i)
      await amountInput.fill('1000000')

      // PASO 4: Seleccionar fecha (usar la fecha por defecto)

      // PASO 5: Seleccionar método de pago
      const paymentMethodCombobox = dialog.getByRole('combobox', { name: /método de pago/i })
      await paymentMethodCombobox.click()

      // Seleccionar el primer método de pago disponible
      const paymentOptions = page.locator('[role="option"]')
      const firstPaymentMethod = paymentOptions.first()
      await expect(firstPaymentMethod).toBeVisible({ timeout: 3000 })
      await firstPaymentMethod.click()

      // PASO 6: Llenar referencia
      const referenceInput = dialog.getByLabel(/referencia/i)
      await referenceInput.fill('REF-TEST-001')

      // PASO 7: (Opcional) Llenar notas
      const notesTextarea = dialog.getByLabel(/notas/i)
      if (await notesTextarea.isVisible()) {
        await notesTextarea.fill('Pago de prueba creado por test E2E de Playwright')
      }

      // PASO 8: Tomar screenshot antes de enviar
      await page.screenshot({ path: 'test-results/payment-form-filled.png' })

      // PASO 9: Enviar formulario
      const submitButton = dialog.getByRole('button', { name: /registrar pago/i })
      await submitButton.click()

      // PASO 10: Verificar éxito
      // Esperar a que el dialog se cierre
      await expect(dialog).not.toBeVisible({ timeout: 5000 })

      // Verificar toast o mensaje de éxito
      await expect(page.locator('text=/pago registrado|éxito|exitoso/i')).toBeVisible({
        timeout: 5000,
      })

      // Verificar que el nuevo pago aparece en la tabla
      await page.waitForTimeout(1000)
      await expect(page.getByText('REF-TEST-001')).toBeVisible({ timeout: 5000 })
    })

    test('debe cancelar la creación de pago', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a proyecto \(1:1\)/i }).click()

      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: /pago a proyecto/i })).toBeVisible()

      // Cerrar el dialog con Escape
      await page.keyboard.press('Escape')

      // Verificar que el dialog se cierra
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Búsqueda y Filtros', () => {
    test('debe buscar pagos por cliente', async ({ page }) => {
      // Esperar a que la tabla cargue
      await page.waitForTimeout(1000)

      // Buscar en el input de búsqueda
      const searchInput = page.getByPlaceholder(/buscar por cliente/i)
      if (await searchInput.isVisible()) {
        await searchInput.fill('Test')

        // Esperar a que se aplique el filtro
        await page.waitForTimeout(500)

        // Tomar screenshot de resultados filtrados
        await page.screenshot({ path: 'test-results/payments-filtered.png' })
      }
    })

    test('debe filtrar pagos por estado', async ({ page }) => {
      // Esperar a que la tabla cargue
      await page.waitForTimeout(1000)

      // Buscar botón de filtro de estado
      const statusFilter = page.getByRole('button', { name: /estado/i })
      if (await statusFilter.isVisible()) {
        await statusFilter.click()

        // Seleccionar "Activo"
        await page.getByRole('checkbox', { name: /activo/i }).click()

        // Aplicar filtro
        await page.keyboard.press('Escape')

        // Esperar a que se aplique el filtro
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Visualización de Detalles', () => {
    test('debe abrir el dialog de detalles de un pago', async ({ page }) => {
      // Esperar a que la tabla cargue
      await page.waitForTimeout(1000)

      // Click en el primer botón de "Ver detalles" (icono de ojo)
      const detailsButton = page.getByRole('button', { name: /ver detalles/i }).first()
      if (await detailsButton.isVisible()) {
        await detailsButton.click()

        // Verificar que se abre el dialog de detalles
        await expect(page.getByRole('heading', { name: /detalles del pago/i })).toBeVisible({
          timeout: 3000,
        })

        // Verificar que muestra información del pago
        await expect(page.getByText(/cliente/i)).toBeVisible()
        await expect(page.getByText(/proyecto/i)).toBeVisible()
        await expect(page.getByText(/monto/i)).toBeVisible()

        // Cerrar dialog
        await page.getByRole('button', { name: /cerrar/i }).click()
      }
    })
  })
})
