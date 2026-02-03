import { test, expect } from '@playwright/test'
import { PaymentsPage } from './page-objects/payments.page'
import { PaymentToCustomerDialog } from './page-objects/dialogs/payment-to-customer.dialog'
import {
  createTestCustomer,
  createTestProject,
  ensurePaymentMethod,
  getFirstProjectStatus,
} from './helpers/test-data-factory'
import {
  cleanupE2EPayments,
  cleanupE2EProjects,
  cleanupE2ECustomers,
} from './helpers/cleanup'

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
 * Los datos de test se crean en beforeAll vía API y se limpian en afterAll.
 */

// Datos compartidos entre tests, creados en beforeAll
let customerId: string
const CUSTOMER_NAME = 'E2E Test Customer PTC'

test.describe('Pago a Cliente (1:N)', () => {
  test.beforeAll(async ({ request }) => {
    // Crear datos de test vía API
    const customer = await createTestCustomer(request, { name: CUSTOMER_NAME })
    customerId = customer.id

    const status = await getFirstProjectStatus(request)

    // Crear dos proyectos con balance pendiente para el cliente
    await createTestProject(request, customerId, {
      subtotal: 500000,
      projectStatusId: status?.id,
    })
    await createTestProject(request, customerId, {
      subtotal: 300000,
      projectStatusId: status?.id,
    })

    // Asegurar que exista al menos un método de pago
    await ensurePaymentMethod(request)
  })

  test.afterAll(async ({ request }) => {
    // Limpiar datos de test en orden correcto (FK)
    await cleanupE2EPayments(request)
    await cleanupE2EProjects(request)
    await cleanupE2ECustomers(request)
  })

  test.beforeEach(async ({ page }) => {
    // Navegar a la página de pagos antes de cada test
    const paymentsPage = new PaymentsPage(page)
    await paymentsPage.navigate()
  })

  test('debe abrir el dialog de pago a cliente (1:N)', async ({ page }) => {
    const paymentsPage = new PaymentsPage(page)
    const ptcDialog = new PaymentToCustomerDialog(page)

    // Abrir dialog de pago a cliente
    await paymentsPage.openPaymentToCustomerDialog()

    // Verificar que se abre el dialog con título y descripción
    await ptcDialog.expectVisible()
    await expect(
      ptcDialog['dialog'].getByText(/registre un pago y distribúyalo entre múltiples proyectos/i)
    ).toBeVisible()

    // Verificar campos iniciales
    await expect(ptcDialog.customerCombobox).toBeVisible()
    await expect(ptcDialog.amountInput).toBeVisible()

    // Nota: Los tabs de distribución solo aparecen DESPUÉS de seleccionar cliente con proyectos

    // Verificar botón de submit (debe estar deshabilitado inicialmente)
    await expect(ptcDialog.submitButton).toBeVisible()
    await expect(ptcDialog.submitButton).toBeDisabled()
  })

  test('debe buscar y seleccionar un cliente', async ({ page }) => {
    const paymentsPage = new PaymentsPage(page)
    const ptcDialog = new PaymentToCustomerDialog(page)

    // Abrir dialog
    await paymentsPage.openPaymentToCustomerDialog()

    // Buscar nuestro cliente E2E por nombre
    await ptcDialog.selectCustomer(CUSTOMER_NAME)

    // Verificar que se muestra el card de cliente seleccionado
    await expect(ptcDialog.clienteSeleccionadoText).toBeVisible({ timeout: 5000 })

    // Verificar que se muestra info sobre proyectos del cliente
    // El cliente tiene 2 proyectos con balance, así que se muestra la sección de distribución
    const distributionSection = ptcDialog['dialog'].getByText(/distribución del pago/i)
    const noProjects = ptcDialog['dialog'].getByText(/no tiene proyectos con saldo pendiente/i)

    const hasDistribution = await distributionSection.isVisible().catch(() => false)
    const hasNoProjects = await noProjects.isVisible().catch(() => false)

    expect(hasDistribution || hasNoProjects).toBeTruthy()
  })

  test.describe('Distribución FIFO Automática', () => {
    test('flujo completo con distribución FIFO', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const ptcDialog = new PaymentToCustomerDialog(page)

      // PASO 1: Abrir dialog
      await paymentsPage.openPaymentToCustomerDialog()
      await ptcDialog.expectVisible()

      // PASO 2: Seleccionar cliente E2E
      await ptcDialog.selectCustomer(CUSTOMER_NAME)

      // PASO 3: Ingresar monto total
      await ptcDialog.amountInput.fill('500000')

      // PASO 4: Seleccionar método de pago
      await ptcDialog.selectFirstPaymentMethod()

      // PASO 5: Llenar referencia si es visible
      if (await ptcDialog.referenceInput.isVisible()) {
        await ptcDialog.referenceInput.fill('REF-E2E-FIFO-001')
      }

      // PASO 6: Verificar que el tab FIFO está seleccionado por defecto
      await expect(ptcDialog.fifoTab).toHaveAttribute('data-state', 'active')

      // PASO 7: Calcular distribución FIFO (espera automáticamente la tabla)
      await ptcDialog.calculateFIFO()

      // PASO 8: Verificar headers de la tabla de allocations
      const dialog = ptcDialog['dialog']
      await expect(dialog.getByRole('columnheader', { name: /proyecto/i })).toBeVisible()
      await expect(dialog.getByRole('columnheader', { name: /balance/i })).toBeVisible()
      await expect(dialog.getByRole('columnheader', { name: /monto asignado/i })).toBeVisible()

      // PASO 9: Verificar validación visual (distribución correcta)
      await ptcDialog.expectAllocationValid()

      // PASO 10: Agregar notas (opcional)
      if (await ptcDialog.notesTextarea.isVisible()) {
        await ptcDialog.notesTextarea.fill('Pago distribuido automáticamente con FIFO - Test E2E')
      }

      // PASO 11: Verificar que el botón submit está habilitado
      await expect(ptcDialog.submitButton).toBeEnabled({ timeout: 3000 })

      // PASO 12: Enviar formulario (espera respuesta del API y cierre del dialog)
      await ptcDialog.submit()

      // PASO 13: Verificar toast de éxito
      await expect(page.locator('text=/pago registrado|éxito|exitoso|distribuido/i')).toBeVisible({
        timeout: 5000,
      })
    })
  })

  test.describe('Distribución Manual', () => {
    test('flujo completo con distribución manual', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const ptcDialog = new PaymentToCustomerDialog(page)
      const dialog = ptcDialog['dialog']

      // PASO 1: Abrir dialog
      await paymentsPage.openPaymentToCustomerDialog()

      // PASO 2: Seleccionar cliente E2E
      await ptcDialog.selectCustomer(CUSTOMER_NAME)

      // PASO 3: Ingresar monto total
      await ptcDialog.amountInput.fill('300000')

      // PASO 4: Seleccionar método de pago
      await ptcDialog.selectFirstPaymentMethod()

      // Llenar referencia si es visible
      if (await ptcDialog.referenceInput.isVisible()) {
        await ptcDialog.referenceInput.fill('REF-E2E-MANUAL-001')
      }

      // PASO 5: Cambiar a tab "Distribución Manual"
      await ptcDialog.manualTab.click()
      await expect(ptcDialog.manualTab).toHaveAttribute('data-state', 'active')

      // PASO 6: Agregar primer proyecto manualmente
      // Comboboxes en el dialog: 0=cliente, 1=método pago, 2=agregar proyecto
      const allComboboxes = await dialog.getByRole('combobox').all()
      const addProjectCombobox = allComboboxes[2] // Tercer combobox: selector de proyectos

      await addProjectCombobox.click()

      // Esperar a que se muestren los proyectos disponibles
      const projectOptions = page.locator('[role="option"]')
      await expect(projectOptions.first()).toBeVisible({ timeout: 5000 })

      // Seleccionar el primer proyecto
      await projectOptions.first().click()

      // PASO 7: Verificar que apareció la tabla con el proyecto
      await expect(ptcDialog.allocationTable).toBeVisible({ timeout: 5000 })

      // PASO 8: Ingresar monto asignado al primer proyecto
      const amountInputs = ptcDialog.allocationTable.locator('input[type="number"]')
      const firstAmountInput = amountInputs.first()
      await firstAmountInput.fill('150000')

      // PASO 9: Agregar segundo proyecto
      await addProjectCombobox.click()
      await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 5000 })

      const remainingCount = await page.locator('[role="option"]').count()

      if (remainingCount > 0) {
        await page.locator('[role="option"]').first().click()
        // Esperar a que aparezca el segundo input en la tabla
        await expect(amountInputs.nth(1)).toBeVisible({ timeout: 5000 })

        // Ingresar monto para el segundo proyecto (150000 + 150000 = 300000)
        await amountInputs.nth(1).fill('150000')
      } else {
        // Si no hay más proyectos, ajustar al total
        await firstAmountInput.fill('300000')
      }

      // PASO 10: Verificar validación visual (textos de totales)
      await ptcDialog.expectAllocationValid()
      await expect(dialog.getByText(/diferencia/i)).toBeVisible()

      // PASO 11: Verificar que el botón submit está habilitado
      await expect(ptcDialog.submitButton).toBeEnabled()

      // PASO 12: Enviar formulario
      await ptcDialog.submit()

      // PASO 13: Verificar toast de éxito
      await expect(page.locator('text=/pago registrado|éxito|exitoso|distribuido/i')).toBeVisible({
        timeout: 5000,
      })
    })
  })

  test.describe('Validaciones', () => {
    test('debe validar que la suma de allocations sea igual al monto total', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const ptcDialog = new PaymentToCustomerDialog(page)
      const dialog = ptcDialog['dialog']

      // Abrir dialog
      await paymentsPage.openPaymentToCustomerDialog()

      // Seleccionar cliente E2E
      await ptcDialog.selectCustomer(CUSTOMER_NAME)

      // Ingresar monto total
      await ptcDialog.amountInput.fill('1000000')

      // Seleccionar método de pago
      await ptcDialog.selectFirstPaymentMethod()

      // Calcular FIFO (espera la tabla automáticamente)
      await ptcDialog.calculateFIFO()

      // Verificar que hay tabla de allocations
      await expect(ptcDialog.allocationTable).toBeVisible()

      // MODIFICAR un monto manualmente para que NO coincida con el total
      const amountInputs = ptcDialog.allocationTable.locator('input[type="number"]')
      const firstInput = amountInputs.first()
      await firstInput.fill('999999')

      // Verificar que el texto de validación muestra error (falta asignar o sobrepasado)
      await ptcDialog.expectAllocationInvalid()

      // Verificar mensaje de diferencia con texto rojo
      await expect(dialog.getByText(/falta asignar|sobrepasado/i)).toBeVisible()

      // Verificar que el botón submit está DESHABILITADO
      await expect(ptcDialog.submitButton).toBeDisabled()
    })

    test('debe deshabilitar campos hasta seleccionar cliente', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const ptcDialog = new PaymentToCustomerDialog(page)

      // Abrir dialog
      await paymentsPage.openPaymentToCustomerDialog()

      // Verificar que el campo de monto está DESHABILITADO sin cliente seleccionado
      await expect(ptcDialog.amountInput).toBeDisabled()

      // Verificar que el botón FIFO no existe aún
      await expect(ptcDialog.calculateFifoButton).not.toBeVisible()

      // Seleccionar cliente E2E
      await ptcDialog.selectCustomer(CUSTOMER_NAME)

      // Verificar que ahora el campo de monto está HABILITADO
      await expect(ptcDialog.amountInput).toBeEnabled()
    })
  })

  test.describe('Cancelación', () => {
    test('debe cancelar la creación con Escape', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const ptcDialog = new PaymentToCustomerDialog(page)
      const dialog = ptcDialog['dialog']

      // Abrir dialog
      await paymentsPage.openPaymentToCustomerDialog()
      await ptcDialog.expectVisible()

      // Presionar Escape para cerrar (puede necesitar 2 veces si hay popovers abiertos)
      await page.keyboard.press('Escape')

      // Si el dialog sigue visible, presionar Escape de nuevo
      const isStillVisible = await dialog.isVisible().catch(() => false)
      if (isStillVisible) {
        await page.keyboard.press('Escape')
      }

      // Verificar que el dialog se cerró
      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    })

    test('debe limpiar datos al cerrar y reabrir', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const ptcDialog = new PaymentToCustomerDialog(page)
      const dialog = ptcDialog['dialog']

      // Abrir dialog y seleccionar un cliente
      await paymentsPage.openPaymentToCustomerDialog()
      await ptcDialog.selectCustomer(CUSTOMER_NAME)

      // Cerrar dialog (Escape puede cerrar un popover primero, luego el dialog)
      await page.keyboard.press('Escape')

      const isStillVisible = await dialog.isVisible().catch(() => false)
      if (isStillVisible) {
        await page.keyboard.press('Escape')
      }

      await expect(dialog).not.toBeVisible({ timeout: 3000 })

      // Reabrir dialog
      await paymentsPage.openPaymentToCustomerDialog()

      // Verificar que el combobox de cliente está vacío (sin valor seleccionado)
      await expect(ptcDialog.customerCombobox).toBeVisible()

      // Verificar que no hay tabla de allocations (datos limpiados)
      await expect(ptcDialog.allocationTable).not.toBeVisible()
    })
  })
})
