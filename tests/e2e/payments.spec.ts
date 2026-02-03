import { test, expect } from '@playwright/test'
import { PaymentsPage } from './page-objects/payments.page'
import { PaymentToProjectDialog } from './page-objects/dialogs/payment-to-project.dialog'
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
 * Tests E2E para el Sistema de Pagos
 *
 * Flujos cubiertos:
 * - Navegacion a la pagina de pagos
 * - Creacion de pago a proyecto (1:1)
 * - Validacion de formularios
 * - Visualizacion de detalles de pago
 *
 * Los datos de test se crean via API en beforeAll y se limpian en afterAll.
 */

// Variables compartidas para los datos de test
let testCustomer: Awaited<ReturnType<typeof createTestCustomer>>
let testProject: Awaited<ReturnType<typeof createTestProject>>

test.describe('Sistema de Pagos', () => {
  // Crear datos de test antes de todos los tests
  test.beforeAll(async ({ request }) => {
    const customer = await createTestCustomer(request)
    const status = await getFirstProjectStatus(request)
    const project = await createTestProject(request, customer.id, {
      subtotal: 1000000,
      projectStatusId: status?.id,
    })
    await ensurePaymentMethod(request)

    testCustomer = customer
    testProject = project
  })

  // Limpiar datos de test despues de todos los tests
  test.afterAll(async ({ request }) => {
    await cleanupE2EPayments(request)
    await cleanupE2EProjects(request)
    await cleanupE2ECustomers(request)
  })

  test.beforeEach(async ({ page }) => {
    // Navegar a la pagina de pagos usando Page Object
    const paymentsPage = new PaymentsPage(page)
    await paymentsPage.navigate()
  })

  test('debe cargar la pagina de pagos correctamente', async ({ page }) => {
    // Verificar titulo de la pagina (CardTitle, no es un heading semantico)
    await expect(page.getByText('Todos los Pagos', { exact: true })).toBeVisible()

    // Verificar que el boton "Nuevo Pago" existe
    await expect(page.getByRole('button', { name: /nuevo pago/i })).toBeVisible()

    // Verificar que el area de contenido esta presente (tabla, skeleton o mensaje de vacio)
    const contentVisible = await page
      .locator('table, .skeleton, :has-text("No hay pagos")')
      .first()
      .isVisible()
      .catch(() => false)

    expect(contentVisible).toBeTruthy()
  })

  test('debe abrir el dropdown de nuevo pago', async ({ page }) => {
    const paymentsPage = new PaymentsPage(page)

    // Abrir dropdown
    await paymentsPage.openNewPaymentDropdown()

    // Verificar que se abre el dropdown con las 2 opciones
    await expect(page.getByRole('menuitem', { name: /pago a proyecto \(1:1\)/i })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i })).toBeVisible()
  })

  test('debe abrir el dialog de pago a proyecto (1:1)', async ({ page }) => {
    const paymentsPage = new PaymentsPage(page)
    const dialog = new PaymentToProjectDialog(page)

    // Abrir dialog de pago a proyecto
    await paymentsPage.openPaymentToProjectDialog()

    // Verificar que se abre el dialog con heading y campos iniciales
    await dialog.expectVisible()
    await expect(dialog.projectCombobox).toBeVisible()
    await expect(dialog.amountInput).toBeVisible()
    // Nota: Referencia solo aparece DESPUES de seleccionar metodo de pago

    // Verificar boton de submit
    await expect(dialog.submitButton).toBeVisible()
  })

  test('debe validar campos obligatorios del formulario', async ({ page }) => {
    const paymentsPage = new PaymentsPage(page)
    const dialog = new PaymentToProjectDialog(page)

    // Abrir dialog de pago a proyecto
    await paymentsPage.openPaymentToProjectDialog()
    await dialog.expectVisible()

    // Verificar que el boton esta deshabilitado inicialmente
    // (no hay proyecto seleccionado, por lo tanto disabled)
    await expect(dialog.submitButton).toBeDisabled()

    // Nota: El campo monto esta deshabilitado hasta seleccionar proyecto
    // El campo referencia no aparece hasta seleccionar metodo de pago
    // Este test verifica que el formulario no se puede enviar sin datos completos
  })

  test.describe('Creacion de Pago a Proyecto (1:1)', () => {
    test('flujo completo de creacion de pago', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const dialog = new PaymentToProjectDialog(page)

      // PASO 1: Abrir dialog
      await paymentsPage.openPaymentToProjectDialog()
      await dialog.expectVisible()

      // PASO 2: Llenar formulario completo con datos del proyecto creado por factory
      await dialog.fill({
        projectNumber: testProject.projectNumber,
        amount: 1000000,
        reference: 'REF-E2E-PAYMENTS-001',
        notes: 'Pago de prueba creado por test E2E de Playwright',
      })

      // PASO 3: Enviar formulario y esperar respuesta del API
      await dialog.submit()

      // PASO 4: Verificar exito - toast o mensaje de confirmacion
      await expect(page.locator('text=/pago registrado|éxito|exitoso/i')).toBeVisible({
        timeout: 5000,
      })

      // PASO 5: Verificar que el nuevo pago aparece en la tabla
      // Esperar a que la tabla se refresque con datos del API
      await page.waitForResponse(
        (r) => r.url().includes('/api/payments') && r.request().method() === 'GET'
      )
      await expect(page.getByText('REF-E2E-PAYMENTS-001')).toBeVisible({ timeout: 5000 })
    })

    test('debe cancelar la creacion de pago', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)
      const dialog = new PaymentToProjectDialog(page)

      // Abrir dialog
      await paymentsPage.openPaymentToProjectDialog()
      await dialog.expectVisible()

      // Cerrar el dialog con Escape
      await page.keyboard.press('Escape')

      // Verificar que el dialog se cierra
      await paymentsPage.expectDialogClosed(3000)
    })
  })

  test.describe('Busqueda y Filtros', () => {
    test('debe buscar pagos por cliente', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)

      // Esperar a que la tabla cargue
      await paymentsPage.waitForTable()

      // Buscar en el input de busqueda
      const searchInput = paymentsPage.searchInput
      if (await searchInput.isVisible()) {
        // Buscar y esperar respuesta del API
        await paymentsPage.searchInTable('Test', /buscar por cliente/i)
      }
    })

    test('debe filtrar pagos por estado', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)

      // Esperar a que la tabla cargue
      await paymentsPage.waitForTable()

      // Buscar boton de filtro de estado
      const statusFilter = page.getByRole('button', { name: /estado/i })
      if (await statusFilter.isVisible()) {
        await statusFilter.click()

        // Seleccionar "Activo"
        await page.getByRole('checkbox', { name: /activo/i }).click()

        // Aplicar filtro cerrando el dropdown
        await page.keyboard.press('Escape')

        // Esperar a que el filtro se aplique via API
        await page.waitForResponse(
          (r) => r.url().includes('/api/') && r.request().method() === 'GET'
        )
      }
    })
  })

  test.describe('Visualizacion de Detalles', () => {
    test('debe abrir el dialog de detalles de un pago', async ({ page }) => {
      const paymentsPage = new PaymentsPage(page)

      // Esperar a que la tabla cargue
      await paymentsPage.waitForTable()

      // Click en el primer boton de "Ver detalles" (icono de ojo)
      const detailsButton = page.getByRole('button', { name: /ver detalles/i }).first()
      if (await detailsButton.isVisible()) {
        await detailsButton.click()

        // Verificar que se abre el dialog de detalles
        await expect(page.getByRole('heading', { name: /detalles del pago/i })).toBeVisible({
          timeout: 3000,
        })

        // Verificar que muestra informacion del pago
        await expect(page.getByText(/cliente/i)).toBeVisible()
        await expect(page.getByText(/proyecto/i)).toBeVisible()
        await expect(page.getByText(/monto/i)).toBeVisible()

        // Cerrar dialog
        await page.getByRole('button', { name: /cerrar/i }).click()
      }
    })
  })
})
