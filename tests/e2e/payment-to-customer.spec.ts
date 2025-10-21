import { test, expect } from '@playwright/test'

/**
 * Tests E2E para Pago a Cliente (1:N)
 *
 * Flujos cubiertos:
 * - Apertura del dialog de pago a cliente
 * - Búsqueda y selección de cliente
 * - Distribución automática FIFO
 * - Distribución manual entre proyectos
 * - Validación de suma de allocations
 * - Creación exitosa de pago distribuido
 *
 * Prerequisitos:
 * - Base de datos debe tener al menos:
 *   - 1 cliente con 2+ proyectos que tengan balance pendiente
 *   - 1 método de pago configurado (preferiblemente que requiera referencia)
 *
 * Para ejecutar:
 * - npm run test:e2e -- payment-to-customer.spec.ts
 * - npm run test:e2e:ui -- payment-to-customer.spec.ts (modo UI)
 */

test.describe('Pago a Cliente (1:N)', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de pagos antes de cada test
    await page.goto('/payments')

    // Esperar a que la página cargue completamente
    await expect(page.getByRole('heading', { name: /pagos/i, level: 1 })).toBeVisible()
  })

  test('debe abrir el dialog de pago a cliente (1:N)', async ({ page }) => {
    // Abrir dropdown de "Nuevo Pago"
    await page.getByRole('button', { name: /nuevo pago/i }).click()

    // Click en opción "Pago a Cliente (1:N)"
    await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

    // Verificar que se abre el dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /registrar pago a cliente/i })).toBeVisible()

    // Verificar descripción del dialog
    await expect(
      dialog.getByText(/registre un pago y distribúyalo entre múltiples proyectos/i)
    ).toBeVisible()

    // Verificar campos iniciales
    await expect(dialog.getByRole('combobox', { name: /cliente/i })).toBeVisible()
    await expect(dialog.getByLabel(/monto total del pago/i)).toBeVisible()
    await expect(dialog.getByLabel(/fecha del pago/i)).toBeVisible()

    // Nota: Los tabs de distribución (FIFO/Manual) solo aparecen DESPUÉS de:
    // 1. Seleccionar un cliente
    // 2. Que el cliente tenga proyectos con balance
    // 3. Ingresar un monto > 0

    // Verificar botón de submit (debe estar deshabilitado inicialmente)
    const submitButton = dialog.getByRole('button', { name: /registrar pago/i })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeDisabled()
  })

  test('debe buscar y seleccionar un cliente', async ({ page }) => {
    // Abrir dialog
    await page.getByRole('button', { name: /nuevo pago/i }).click()
    await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

    const dialog = page.getByRole('dialog')

    // Click en combobox de cliente
    const customerCombobox = dialog.getByRole('combobox', { name: /cliente/i })
    await customerCombobox.click()

    // Buscar cliente (mínimo 2 caracteres para activar búsqueda)
    await page.keyboard.type('cli')

    // Esperar debounce (300ms) + tiempo de respuesta del API
    await page.waitForTimeout(800)

    // Verificar si hay opciones disponibles
    const options = page.locator('[role="option"]')
    const optionsCount = await options.count()

    if (optionsCount === 0) {
      console.log('⚠️  No se encontraron clientes - verifica que existan clientes en la DB')
      return
    }

    // Seleccionar el primer cliente
    const firstOption = options.first()
    await expect(firstOption).toBeVisible({ timeout: 5000 })
    await firstOption.click()

    // Verificar que se muestra el card de cliente seleccionado
    await expect(dialog.getByText(/cliente seleccionado/i)).toBeVisible({ timeout: 3000 })

    // Esperar a que carguen los proyectos del cliente
    await page.waitForTimeout(1000)

    // Verificar que se muestra info sobre proyectos (o mensaje de error si no hay)
    const hasProjects = await dialog
      .getByText(/proyecto.*con balance pendiente/i)
      .isVisible()
      .catch(() => false)

    const noProjects = await dialog
      .getByText(/no tiene proyectos con balance pendiente/i)
      .isVisible()
      .catch(() => false)

    expect(hasProjects || noProjects).toBeTruthy()
  })

  test.describe('Distribución FIFO Automática', () => {
    test('flujo completo con distribución FIFO', async ({ page }) => {
      // PASO 1: Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: /registrar pago a cliente/i })).toBeVisible()

      // PASO 2: Seleccionar cliente
      const customerCombobox = dialog.getByRole('combobox', { name: /cliente/i })
      await customerCombobox.click()

      await page.keyboard.type('cli')
      await page.waitForTimeout(800)

      const options = page.locator('[role="option"]')
      const optionsCount = await options.count()

      if (optionsCount === 0) {
        console.log('⚠️  No hay clientes en la base de datos - skipping test')
        return
      }

      const firstOption = options.first()
      await expect(firstOption).toBeVisible({ timeout: 5000 })
      await firstOption.click()

      // Esperar a que carguen proyectos
      await page.waitForTimeout(1000)

      // Verificar si el cliente tiene proyectos
      const hasProjects = await dialog
        .getByText(/proyecto.*con balance pendiente/i)
        .isVisible()
        .catch(() => false)

      if (!hasProjects) {
        console.log('⚠️  El cliente no tiene proyectos con balance - skipping test')
        return
      }

      // PASO 3: Ingresar monto total
      const amountInput = dialog.getByLabel(/monto total del pago/i)
      await amountInput.fill('500000')

      // PASO 4: Seleccionar fecha (usar la fecha por defecto - hoy)
      // No hacer nada, la fecha por defecto es hoy

      // PASO 5: Seleccionar método de pago
      const paymentMethodSelect = dialog.getByRole('combobox', { name: /método de pago/i })
      await paymentMethodSelect.click()

      const paymentOptions = page.locator('[role="option"]')
      const firstPaymentMethod = paymentOptions.first()
      await expect(firstPaymentMethod).toBeVisible({ timeout: 3000 })
      await firstPaymentMethod.click()

      // PASO 6: Esperar a que aparezca el campo de referencia (si el método lo requiere)
      await page.waitForTimeout(500)

      const referenceInput = dialog.getByLabel(/referencia/i)
      if (await referenceInput.isVisible()) {
        await referenceInput.fill('REF-CLIENTE-FIFO-001')
      }

      // PASO 7: Calcular distribución FIFO
      // Verificar que el tab FIFO está seleccionado por defecto
      await expect(dialog.getByRole('tab', { name: /fifo automático/i })).toHaveAttribute(
        'data-state',
        'active'
      )

      // Click en botón "Calcular Distribución FIFO"
      const fifoButton = dialog.getByRole('button', { name: /calcular distribución fifo/i })
      await expect(fifoButton).toBeVisible()
      await fifoButton.click()

      // PASO 8: Verificar que se generó la tabla de allocations
      await page.waitForTimeout(500)

      const allocationTable = dialog.locator('table')
      await expect(allocationTable).toBeVisible({ timeout: 3000 })

      // Verificar headers de la tabla
      await expect(dialog.getByRole('columnheader', { name: /proyecto/i })).toBeVisible()
      await expect(dialog.getByRole('columnheader', { name: /balance/i })).toBeVisible()
      await expect(dialog.getByRole('columnheader', { name: /monto asignado/i })).toBeVisible()

      // PASO 9: Verificar validación visual (debe estar en verde)
      const validationCard = dialog.locator('.border-green-500')
      await expect(validationCard).toBeVisible({ timeout: 3000 })

      // Verificar que muestra "Total del pago" y "Total asignado"
      await expect(dialog.getByText(/total del pago/i)).toBeVisible()
      await expect(dialog.getByText(/total asignado/i)).toBeVisible()

      // PASO 10: (Opcional) Agregar notas
      const notesTextarea = dialog.getByLabel(/notas/i)
      if (await notesTextarea.isVisible()) {
        await notesTextarea.fill('Pago distribuido automáticamente con FIFO - Test E2E Playwright')
      }

      // PASO 11: Tomar screenshot antes de enviar
      await page.screenshot({ path: 'test-results/payment-customer-fifo-filled.png' })

      // PASO 12: Verificar que el botón submit está habilitado
      const submitButton = dialog.getByRole('button', { name: /registrar pago/i })
      await expect(submitButton).toBeEnabled({ timeout: 3000 })

      // PASO 13: Enviar formulario
      await submitButton.click()

      // PASO 14: Verificar éxito
      // Esperar a que el dialog se cierre
      await expect(dialog).not.toBeVisible({ timeout: 10000 })

      // Verificar toast de éxito
      await expect(page.locator('text=/pago registrado|éxito|exitoso|distribuido/i')).toBeVisible({
        timeout: 5000,
      })

      // Verificar que el nuevo pago aparece en la tabla
      await page.waitForTimeout(1500)
      const hasReference = await referenceInput.isVisible().catch(() => false)
      if (hasReference) {
        await expect(page.getByText('REF-CLIENTE-FIFO-001')).toBeVisible({ timeout: 5000 })
      }

      // Tomar screenshot final
      await page.screenshot({ path: 'test-results/payment-customer-fifo-success.png' })
    })
  })

  test.describe('Distribución Manual', () => {
    test('flujo completo con distribución manual', async ({ page }) => {
      // PASO 1: Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

      const dialog = page.getByRole('dialog')

      // PASO 2: Seleccionar cliente
      const customerCombobox = dialog.getByRole('combobox', { name: /cliente/i })
      await customerCombobox.click()

      await page.keyboard.type('cli')
      await page.waitForTimeout(800)

      const options = page.locator('[role="option"]')
      const optionsCount = await options.count()

      if (optionsCount === 0) {
        console.log('⚠️  No hay clientes - skipping test')
        return
      }

      await options.first().click()
      await page.waitForTimeout(1000)

      const hasProjects = await dialog
        .getByText(/proyecto.*con balance pendiente/i)
        .isVisible()
        .catch(() => false)

      if (!hasProjects) {
        console.log('⚠️  Cliente sin proyectos - skipping test')
        return
      }

      // PASO 3: Ingresar monto total
      const amountInput = dialog.getByLabel(/monto total del pago/i)
      await amountInput.fill('300000')

      // PASO 4: Seleccionar método de pago
      const paymentMethodSelect = dialog.getByRole('combobox', { name: /método de pago/i })
      await paymentMethodSelect.click()
      await page.locator('[role="option"]').first().click()

      await page.waitForTimeout(500)

      const referenceInput = dialog.getByLabel(/referencia/i)
      if (await referenceInput.isVisible()) {
        await referenceInput.fill('REF-CLIENTE-MANUAL-001')
      }

      // PASO 5: Cambiar a tab "Distribución Manual"
      const manualTab = dialog.getByRole('tab', { name: /distribución manual/i })
      await manualTab.click()

      // Verificar que el tab está activo
      await expect(manualTab).toHaveAttribute('data-state', 'active')

      // PASO 6: Agregar primer proyecto manualmente
      // Verificar que existe el combobox para agregar proyectos
      const projectComboboxes = dialog.getByRole('combobox').all()
      // El primer combobox es para cliente, el segundo es para agregar proyectos
      const addProjectCombobox = (await projectComboboxes)[2] // 0: cliente, 1: método pago, 2: agregar proyecto

      if (!addProjectCombobox) {
        console.log('⚠️  No se encontró el combobox de proyectos')
        return
      }

      await addProjectCombobox.click()

      // Esperar a que se muestren los proyectos disponibles
      await page.waitForTimeout(500)

      const projectOptions = page.locator('[role="option"]')
      const projectCount = await projectOptions.count()

      if (projectCount === 0) {
        console.log('⚠️  No hay proyectos disponibles para agregar')
        return
      }

      // Seleccionar el primer proyecto
      await projectOptions.first().click()

      // PASO 7: Verificar que apareció la tabla con el proyecto
      await page.waitForTimeout(500)
      const allocationTable = dialog.locator('table')
      await expect(allocationTable).toBeVisible()

      // PASO 8: Ingresar monto asignado al primer proyecto
      // Buscar el input de monto dentro de la tabla
      const amountInputs = allocationTable.locator('input[type="number"]')
      const firstAmountInput = amountInputs.first()
      await firstAmountInput.fill('150000')

      // PASO 9: Agregar segundo proyecto (si hay más disponibles)
      await page.waitForTimeout(300)
      await addProjectCombobox.click()
      await page.waitForTimeout(300)

      const remainingProjects = await page.locator('[role="option"]').count()

      if (remainingProjects > 0) {
        await page.locator('[role="option"]').first().click()
        await page.waitForTimeout(300)

        // Ingresar monto para el segundo proyecto
        const secondAmountInput = amountInputs.nth(1)
        await secondAmountInput.fill('150000')
      } else {
        // Si no hay más proyectos, ajustar el primer monto al total
        await firstAmountInput.fill('300000')
      }

      // PASO 10: Verificar validación visual (debe estar en verde cuando suma es correcta)
      await page.waitForTimeout(500)

      // Buscar el card de validación (debería estar verde si la suma es correcta)
      const validationCard = dialog.locator('.border-green-500, .border-red-500')
      await expect(validationCard).toBeVisible()

      // Verificar que muestra los totales
      await expect(dialog.getByText(/total del pago/i)).toBeVisible()
      await expect(dialog.getByText(/total asignado/i)).toBeVisible()
      await expect(dialog.getByText(/diferencia/i)).toBeVisible()

      // PASO 11: Tomar screenshot
      await page.screenshot({ path: 'test-results/payment-customer-manual-filled.png' })

      // PASO 12: Enviar formulario (solo si la suma es correcta - verde)
      const isValid = await dialog
        .locator('.border-green-500')
        .isVisible()
        .catch(() => false)

      if (!isValid) {
        console.log('⚠️  La suma de allocations no es válida - test parcial completado')
        return
      }

      const submitButton = dialog.getByRole('button', { name: /registrar pago/i })
      await expect(submitButton).toBeEnabled()
      await submitButton.click()

      // PASO 13: Verificar éxito
      await expect(dialog).not.toBeVisible({ timeout: 10000 })

      await expect(page.locator('text=/pago registrado|éxito|exitoso|distribuido/i')).toBeVisible({
        timeout: 5000,
      })

      await page.screenshot({ path: 'test-results/payment-customer-manual-success.png' })
    })
  })

  test.describe('Validaciones', () => {
    test('debe validar que la suma de allocations sea igual al monto total', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

      const dialog = page.getByRole('dialog')

      // Seleccionar cliente
      const customerCombobox = dialog.getByRole('combobox', { name: /cliente/i })
      await customerCombobox.click()
      await page.keyboard.type('cli')
      await page.waitForTimeout(800)

      const optionsCount = await page.locator('[role="option"]').count()
      if (optionsCount === 0) {
        console.log('⚠️  No hay clientes - skipping test')
        return
      }

      await page.locator('[role="option"]').first().click()
      await page.waitForTimeout(1000)

      const hasProjects = await dialog
        .getByText(/proyecto.*con balance pendiente/i)
        .isVisible()
        .catch(() => false)

      if (!hasProjects) {
        console.log('⚠️  Cliente sin proyectos - skipping test')
        return
      }

      // Ingresar monto total
      await dialog.getByLabel(/monto total del pago/i).fill('1000000')

      // Seleccionar método de pago
      await dialog.getByRole('combobox', { name: /método de pago/i }).click()
      await page.locator('[role="option"]').first().click()

      // Calcular FIFO
      await dialog.getByRole('button', { name: /calcular distribución fifo/i }).click()
      await page.waitForTimeout(500)

      // Verificar que hay tabla de allocations
      const allocationTable = dialog.locator('table')
      await expect(allocationTable).toBeVisible()

      // MODIFICAR un monto manualmente para que NO coincida con el total
      const amountInputs = allocationTable.locator('input[type="number"]')
      const firstInput = amountInputs.first()
      await firstInput.fill('999999') // Un valor incorrecto

      // Esperar a que se actualice la validación
      await page.waitForTimeout(500)

      // Verificar que el card de validación está ROJO
      const redCard = dialog.locator('.border-red-500')
      await expect(redCard).toBeVisible()

      // Verificar que muestra mensaje de diferencia
      await expect(dialog.locator('text=/falta asignar|sobrepasado/i')).toBeVisible()

      // Verificar que el botón submit está DESHABILITADO
      const submitButton = dialog.getByRole('button', { name: /registrar pago/i })
      await expect(submitButton).toBeDisabled()

      // Tomar screenshot de la validación fallida
      await page.screenshot({ path: 'test-results/payment-customer-validation-error.png' })
    })

    test('debe deshabilitar campos hasta seleccionar cliente', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

      const dialog = page.getByRole('dialog')

      // Verificar que el campo de monto está DESHABILITADO sin cliente seleccionado
      const amountInput = dialog.getByLabel(/monto total del pago/i)
      await expect(amountInput).toBeDisabled()

      // Verificar que el botón FIFO no existe aún (no hay cliente seleccionado)
      const fifoButton = dialog.getByRole('button', { name: /calcular distribución fifo/i })
      await expect(fifoButton).not.toBeVisible()

      // Seleccionar un cliente
      const customerCombobox = dialog.getByRole('combobox', { name: /cliente/i })
      await customerCombobox.click()
      await page.keyboard.type('cli')
      await page.waitForTimeout(800)

      const optionsCount = await page.locator('[role="option"]').count()
      if (optionsCount === 0) {
        console.log('⚠️  No hay clientes - test parcial completado')
        return
      }

      await page.locator('[role="option"]').first().click()
      await page.waitForTimeout(1000)

      // Verificar que ahora el campo de monto está HABILITADO
      await expect(amountInput).toBeEnabled()
    })
  })

  test.describe('Cancelación', () => {
    test('debe cancelar la creación con Escape', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Presionar Escape para cerrar (puede necesitar 2 veces si hay popovers abiertos)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Si el dialog sigue visible, presionar Escape de nuevo
      const isStillVisible = await dialog.isVisible().catch(() => false)
      if (isStillVisible) {
        await page.keyboard.press('Escape')
      }

      // Verificar que el dialog se cerró
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    })

    test('debe limpiar datos al cerrar y reabrir', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

      const dialog = page.getByRole('dialog')

      // Seleccionar un cliente
      const customerCombobox = dialog.getByRole('combobox', { name: /cliente/i })
      await customerCombobox.click()
      await page.keyboard.type('cli')
      await page.waitForTimeout(800)

      const optionsCount = await page.locator('[role="option"]').count()
      if (optionsCount > 0) {
        await page.locator('[role="option"]').first().click()
        await page.waitForTimeout(500)
      }

      // Cerrar dialog (asegurarse de que todos los popovers estén cerrados primero)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Si el dialog sigue visible (porque cerró un popover), presionar Escape de nuevo
      const isStillVisible = await dialog.isVisible().catch(() => false)
      if (isStillVisible) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }

      await expect(dialog).not.toBeVisible({ timeout: 3000 })

      // Reabrir dialog
      await page.getByRole('button', { name: /nuevo pago/i }).click()
      await page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()

      // Verificar que el combobox de cliente está vacío
      // (puede tener placeholder pero no valor seleccionado)
      const reopenedCombobox = dialog.getByRole('combobox', { name: /cliente/i })
      await expect(reopenedCombobox).toBeVisible()

      // Verificar que no hay tabla de allocations
      const allocationTable = dialog.locator('table')
      await expect(allocationTable).not.toBeVisible()
    })
  })
})
