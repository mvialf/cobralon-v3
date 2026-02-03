import { test, expect } from '@playwright/test'
import { PaymentsPage } from './page-objects/payments.page'
import { PaymentToProjectDialog } from './page-objects/dialogs/payment-to-project.dialog'
import {
  createTestCustomer,
  getFirstProjectStatus,
  ensurePaymentMethod,
} from './helpers/test-data-factory'
import { cleanupE2EPayments, cleanupE2EProjects } from './helpers/cleanup'

/**
 * Test E2E Critico: Flujo Completo Proyecto -> Pago -> Balance
 *
 * Verifica el flujo de negocio mas critico del sistema:
 * 1. Crear un nuevo proyecto con monto especifico
 * 2. Registrar un pago contra ese proyecto
 * 3. Verificar que el balance se actualiza correctamente via API
 *
 * Prerequisitos creados automaticamente via API factory en beforeAll.
 *
 * Para ejecutar:
 * - npm run test:e2e -- critical-flow.spec.ts
 * - npm run test:e2e:ui -- critical-flow.spec.ts (modo UI)
 *
 * Prioridad: P1 High
 */

test.describe('Flujo Critico: Proyecto -> Pago -> Balance', () => {
  // Datos de test creados via API factory
  let testCustomer: { id: string; name: string; phone: string; email: string | null }
  let projectStatus: { id: string; name: string } | null

  // Variables para almacenar datos del test
  let projectNumber: string
  let projectId: string
  const projectTotal = 5000000 // $5,000,000 CLP
  const paymentAmount = 2000000 // $2,000,000 CLP
  const expectedBalance = projectTotal - paymentAmount // $3,000,000 CLP
  const timestamp = Date.now()

  // Crear datos de test via API antes de ejecutar los tests
  test.beforeAll(async ({ request }) => {
    testCustomer = await createTestCustomer(request)
    projectStatus = await getFirstProjectStatus(request)
    await ensurePaymentMethod(request)

    if (!projectStatus) {
      throw new Error('No hay estados de proyecto disponibles. Crear al menos uno en Settings.')
    }
  })

  test('flujo completo: crear proyecto -> registrar pago -> verificar balance via API', async ({
    page,
    request,
  }) => {
    // ========================================
    // FASE 1: CREAR PROYECTO
    // ========================================

    // Navegar a pagina de proyectos
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: /proyectos/i, level: 1 })).toBeVisible()

    // Abrir dialog de nuevo proyecto
    await page.getByRole('button', { name: /nuevo proyecto/i }).click()

    const projectDialog = page.getByRole('dialog')
    await expect(
      projectDialog.getByRole('heading', { name: /nuevo proyecto/i })
    ).toBeVisible()

    // Seleccionar el cliente creado por la factory (buscar por nombre)
    const customerCombobox = projectDialog.getByRole('combobox', { name: /cliente/i })
    await customerCombobox.click()
    await page.keyboard.type(testCustomer.name)

    // Esperar a que el debounce resuelva y aparezcan opciones
    const customerOptions = page.locator('[role="option"]')
    await expect(customerOptions.first()).toBeVisible({ timeout: 5000 })
    await customerOptions.first().click()

    // Nombre del proyecto
    const projectName = `Test E2E Critico - ${timestamp}`
    await projectDialog.getByLabel(/nombre del proyecto/i).fill(projectName)

    // Telefono
    await projectDialog.getByLabel(/telefono/i).fill('+56912345678')

    // Direccion
    await projectDialog.getByLabel(/calle/i).fill('Avenida Test 123')

    // Seleccionar estado inicial
    const statusCombobox = projectDialog.getByRole('combobox', { name: /estado/i })
    await statusCombobox.click()
    const statusOptions = page.locator('[role="option"]')
    await expect(statusOptions.first()).toBeVisible({ timeout: 5000 })
    await statusOptions.first().click()

    // Ventanas
    await projectDialog.getByLabel(/ventanas/i).fill('10')

    // Metros cuadrados
    await projectDialog.getByLabel(/metros cuadrados/i).fill('50')

    // Subtotal: para llegar a total de $5,000,000 con IVA 19%:
    // subtotal = 5000000 / 1.19 = 4201680.67 ~ 4201681
    const subtotalInput = projectDialog.getByLabel(/subtotal/i)
    await subtotalInput.clear()
    await subtotalInput.fill('4201681')

    // Guardar proyecto y esperar la mutacion POST
    const submitButton = projectDialog.getByRole('button', { name: /crear proyecto/i })

    const projectMutationPromise = page.waitForResponse(
      (r) => r.url().includes('/api/projects') && r.request().method() === 'POST'
    )
    await submitButton.click()
    const projectResponse = await projectMutationPromise

    // Extraer ID del proyecto creado desde la respuesta del API
    const projectResponseBody = await projectResponse.json()
    projectId = projectResponseBody.id

    // Esperar a que el dialog se cierre
    await expect(projectDialog).not.toBeVisible({ timeout: 10000 })

    // Esperar a que la tabla se refresque con el GET despues de la mutacion
    await page.waitForResponse(
      (r) =>
        r.url().includes('/api/projects') &&
        r.request().method() === 'GET' &&
        r.status() === 200
    )

    // Buscar el proyecto recien creado en la tabla para extraer el numero
    const projectRow = page.locator(`tr:has-text("${projectName}")`)
    await expect(projectRow).toBeVisible({ timeout: 10000 })

    // Extraer el numero de proyecto de la primera celda
    const projectNumberCell = projectRow.locator('td').first()
    projectNumber = (await projectNumberCell.textContent()) || ''

    // ========================================
    // FASE 2: REGISTRAR PAGO
    // ========================================

    // Navegar a pagina de pagos usando Page Object
    const paymentsPage = new PaymentsPage(page)
    await paymentsPage.navigate()

    // Abrir dialog de pago a proyecto (1:1)
    await paymentsPage.openPaymentToProjectDialog()

    // Usar PaymentToProjectDialog Page Object
    const paymentDialog = new PaymentToProjectDialog(page)
    await paymentDialog.expectVisible()

    // Llenar formulario de pago usando el Page Object
    await paymentDialog.fill({
      projectNumber,
      amount: paymentAmount,
      reference: `REF-CRITICAL-${timestamp}`,
    })

    // Enviar pago (el Page Object ya espera la mutacion y cierre del dialog)
    await paymentDialog.submit()

    // ========================================
    // FASE 3: VERIFICAR BALANCE VIA API
    // ========================================

    // Verificar el balance directamente via API usando el ID del proyecto
    const balanceResponse = await request.get(`/api/projects/${projectId}`)
    expect(balanceResponse.ok()).toBeTruthy()

    const projectData = await balanceResponse.json()
    expect(projectData.balance).toBe(expectedBalance)

    // ========================================
    // VERIFICACION VISUAL: Proyecto visible en tabla
    // ========================================

    // Navegar a proyectos y verificar que el proyecto sigue visible
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: /proyectos/i, level: 1 })).toBeVisible()

    // Esperar a que la tabla cargue
    await page.waitForResponse(
      (r) =>
        r.url().includes('/api/projects') &&
        r.request().method() === 'GET' &&
        r.status() === 200
    )

    const updatedProjectRow = page.locator(`tr:has-text("${projectName}")`)
    await expect(updatedProjectRow).toBeVisible({ timeout: 10000 })
  })

  // Limpieza: eliminar datos de test creados por este flujo
  test.afterAll(async ({ request }) => {
    await cleanupE2EPayments(request)
    await cleanupE2EProjects(request)
  })
})
