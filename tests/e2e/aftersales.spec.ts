import { test, expect } from '@playwright/test'
import { AftersalesPage } from './page-objects/aftersales.page'
import { NewAftersaleDialog } from './page-objects/dialogs/new-aftersale.dialog'
import { cleanupE2EAftersales } from './helpers/cleanup'

/**
 * Tests E2E para el Módulo de Postventas (Aftersales)
 *
 * Flujos cubiertos:
 * - Navegación a la página de postventas
 * - Creación de caso de postventa (CRUD - Create)
 * - Edición de caso de postventa (CRUD - Update)
 * - Eliminación de caso de postventa (CRUD - Delete)
 * - Cambio de estado inline (EditableBadge)
 * - Búsqueda global (proyecto, cliente, descripción)
 * - Validación de formularios (proyecto finalizado, estado activo, teléfono chileno, fecha)
 * - Validación de regla de negocio: solo proyectos finalizados
 *
 * Prerequisitos:
 * - Base de datos debe tener al menos:
 *   - 1 proyecto finalizado (projectStatus.isFinal === true)
 *   - 1 estado de postventa activo (AftersaleStatus.isActive === true)
 *   - 1 proyecto NO finalizado (para test de validación)
 *
 * Para ejecutar:
 * - npm run test:e2e -- aftersales.spec.ts
 * - npm run test:e2e:ui -- aftersales.spec.ts (modo UI)
 */

test.describe('Módulo de Postventas (Aftersales)', () => {
  let aftersalesPage: AftersalesPage
  let newDialog: NewAftersaleDialog

  test.beforeEach(async ({ page }) => {
    aftersalesPage = new AftersalesPage(page)
    newDialog = new NewAftersaleDialog(page)

    // Navegar a la página de postventas antes de cada test
    await aftersalesPage.navigate()
  })

  test('debe cargar la página de postventas correctamente', async ({ page }) => {
    // Verificar título de la página
    await expect(page.getByRole('heading', { name: 'Postventas', level: 1 })).toBeVisible()

    // Verificar que el botón "Nuevo Caso" existe
    await expect(page.getByRole('button', { name: /nuevo caso/i })).toBeVisible()

    // Verificar que el campo de búsqueda está presente
    await expect(aftersalesPage.searchInput).toBeVisible()

    // Verificar que el área de contenido está presente (tabla, skeleton o mensaje de vacío)
    const contentVisible = await page
      .locator('table, .skeleton, :has-text("No se encontraron resultados")')
      .first()
      .isVisible()
      .catch(() => false)

    expect(contentVisible).toBeTruthy()
  })

  test('debe abrir el dialog de nuevo caso', async ({ page }) => {
    // Abrir dialog con Page Object
    await aftersalesPage.openNewCaseDialog()

    // Verificar que se abre el dialog con heading correcto
    await newDialog.expectVisible()

    // Verificar descripción del dialog
    await expect(
      aftersalesPage.dialog.getByText(
        /registra un nuevo problema o incidencia en un proyecto finalizado/i
      )
    ).toBeVisible()

    // Verificar que los campos del formulario están presentes
    await expect(newDialog.statusCombobox).toBeVisible()
    await expect(newDialog.dateInput).toBeVisible()
    await expect(newDialog.phoneInput).toBeVisible()
    await expect(newDialog.descriptionInput).toBeVisible()

    // Verificar botones del dialog
    await expect(newDialog.cancelButton).toBeVisible()
    await expect(newDialog.submitButton).toBeVisible()
  })

  test('debe validar campos obligatorios del formulario', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Intentar enviar formulario sin llenar campos
    await newDialog.submitButton.click()

    // Verificar mensajes de error de validación
    const dialog = aftersalesPage.dialog

    // Proyecto: obligatorio
    await expect(dialog.getByText(/debe seleccionar un proyecto válido/i)).toBeVisible()

    // Teléfono: obligatorio
    await expect(dialog.getByText(/el teléfono es requerido/i)).toBeVisible()

    // Estado: viene pre-seleccionado como "Ingresado", no muestra error
    // Fecha de Reporte: tiene valor por defecto (new Date()), no muestra error
    // Descripción: campo opcional, no muestra error
  })

  test('debe validar formato de teléfono chileno', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Llenar teléfono con formato inválido
    await newDialog.phoneInput.fill('123456789')

    // Intentar enviar
    await newDialog.submitButton.click()

    // Verificar mensaje de error de formato
    await expect(
      aftersalesPage.dialog.getByText(/formato inválido|teléfono.*válido|teléfono.*inválido|debe tener 9 dígitos/i)
    ).toBeVisible()
  })

  test('debe crear un caso de postventa completo exitosamente', async ({ page }) => {
    // Generar descripción única
    const timestamp = Date.now()
    const description = `E2E Test Aftersale ${timestamp} - Problema con instalación`

    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Seleccionar primer proyecto finalizado (espera opciones visibles internamente)
    await newDialog.selectFirstProject()

    // Esperar a que el teléfono se autocomplete tras seleccionar proyecto
    await expect(newDialog.phoneInput).not.toHaveValue('', { timeout: 5000 })

    // Estado: debería auto-seleccionarse el estado inicial
    await expect(newDialog.statusCombobox).toBeVisible()

    // Verificar que el teléfono se autocompletó
    const phoneValue = await newDialog.phoneInput.inputValue()
    expect(phoneValue).not.toBe('')

    // Llenar descripción
    await newDialog.descriptionInput.fill(description)

    // Enviar formulario (espera respuesta API y cierre del dialog internamente)
    await newDialog.submit()

    // Buscar el caso recién creado en la tabla
    await aftersalesPage.searchAftersale(description)

    // Verificar que el caso aparece en la tabla
    await expect(page.getByText(description)).toBeVisible()
  })

  test('debe crear un caso sin descripción (campo opcional)', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Seleccionar primer proyecto finalizado
    await newDialog.selectFirstProject()

    // Esperar a que el teléfono se autocomplete
    await expect(newDialog.phoneInput).not.toHaveValue('', { timeout: 5000 })

    // No llenar descripción (campo opcional)

    // Enviar formulario
    await newDialog.submit()
  })

  test('debe validar descripción máxima de 1000 caracteres', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Llenar descripción con más de 1000 caracteres
    const longDescription = 'A'.repeat(1001)
    await newDialog.descriptionInput.fill(longDescription)

    // Intentar enviar
    await newDialog.submitButton.click()

    // Verificar mensaje de error
    await expect(
      aftersalesPage.dialog.getByText(/la descripción no puede exceder 1000 caracteres/i)
    ).toBeVisible()
  })

  test('debe permitir agregar tareas a la lista de tareas', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Seleccionar proyecto finalizado
    await newDialog.selectFirstProject()

    // Esperar a que el teléfono se autocomplete
    await expect(newDialog.phoneInput).not.toHaveValue('', { timeout: 5000 })

    // Agregar tareas a la lista (TodoListField)
    const dialog = aftersalesPage.dialog
    const taskInput = dialog.getByPlaceholder(/agregar tarea|nueva tarea/i)
    if (await taskInput.isVisible().catch(() => false)) {
      await taskInput.fill('Revisar instalación')
      await taskInput.press('Enter')

      await taskInput.fill('Reparar daño')
      await taskInput.press('Enter')

      // Verificar que las tareas aparecen en la lista
      await expect(dialog.getByText('Revisar instalación')).toBeVisible()
      await expect(dialog.getByText('Reparar daño')).toBeVisible()
    }

    // Enviar formulario
    await newDialog.submit()
  })

  test('debe realizar búsqueda de casos correctamente', async ({ page }) => {
    // Esperar a que la tabla cargue
    await aftersalesPage.waitForTable()

    // Obtener una descripción de caso existente de la tabla (si hay datos)
    const firstDescriptionCell = aftersalesPage.firstRow.locator('td').nth(3)
    const descriptionExists = await firstDescriptionCell.isVisible().catch(() => false)

    if (descriptionExists) {
      const descriptionText = await firstDescriptionCell.textContent()

      if (descriptionText && descriptionText.trim() !== '') {
        const searchTerm = descriptionText.substring(0, 10)

        // Buscar por ese término
        await aftersalesPage.searchAftersale(searchTerm)

        // Verificar que hay al menos 1 resultado
        const rowCount = await aftersalesPage.getTableRowCount()
        expect(rowCount).toBeGreaterThanOrEqual(1)
      }
    }

    // Búsqueda con término que no existe
    await aftersalesPage.searchInput.clear()
    await aftersalesPage.searchAftersale('ZZZZZ_NO_EXISTE_999')

    // Verificar mensaje de "No se encontraron resultados"
    await expect(page.getByText(/no se encontraron resultados/i)).toBeVisible()
  })

  test('debe editar un caso de postventa existente', async ({ page }) => {
    // Esperar a que la tabla cargue
    await aftersalesPage.waitForTable()

    // Verificar que existe al menos un caso en la tabla
    const rowExists = await aftersalesPage.firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Abrir menú de acciones de la primera fila
      await aftersalesPage.openFirstRowActions()

      // Click en opción "Editar"
      await page.getByRole('menuitem', { name: /editar/i }).click()

      // Verificar que se abre el dialog de edición
      const dialog = aftersalesPage.dialog
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('heading', { name: /editar caso de postventa/i })).toBeVisible()

      // Modificar descripción
      const newDescription = `Descripción editada E2E ${Date.now()}`
      const descriptionField = dialog.getByLabel(/descripción del problema/i)
      await descriptionField.clear()
      await descriptionField.fill(newDescription)

      // Guardar cambios
      await dialog.getByRole('button', { name: /guardar cambios/i }).click()

      // Esperar a que el dialog se cierre
      await aftersalesPage.expectDialogClosed()

      // Verificar que la descripción se actualizó en la tabla
      await expect(page.getByText(newDescription)).toBeVisible()
    }
  })

  test('debe eliminar un caso de postventa con confirmación', async ({ page }) => {
    // Primero crear un caso para eliminar
    const description = `E2E Test Delete ${Date.now()}`

    // Crear caso usando Page Objects
    await aftersalesPage.openNewCaseDialog()
    await newDialog.fill({ description })

    // Esperar a que el teléfono se autocomplete
    await expect(newDialog.phoneInput).not.toHaveValue('', { timeout: 5000 })

    await newDialog.submit()

    // Buscar el caso recién creado
    await aftersalesPage.searchAftersale(description)

    // Verificar que existe
    await expect(page.getByText(description)).toBeVisible()

    // Obtener la fila del caso
    const row = page.locator(`tr:has-text("${description}")`).first()
    await expect(row).toBeVisible()

    // Abrir menú de acciones
    const actionsButton = row.getByRole('button').first()
    await actionsButton.click()

    // Click en "Eliminar"
    await page.getByRole('menuitem', { name: /eliminar/i }).click()

    // Verificar que se abre el AlertDialog de confirmación
    const alertDialog = page.getByRole('alertdialog')
    await expect(alertDialog).toBeVisible()
    await expect(alertDialog.getByText(/¿estás seguro?/i)).toBeVisible()
    await expect(alertDialog.getByText(/esta acción no se puede deshacer/i)).toBeVisible()

    // Confirmar eliminación
    await alertDialog.getByRole('button', { name: /eliminar/i }).click()

    // Esperar a que el AlertDialog se cierre
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 })

    // Verificar que el caso ya no aparece en la tabla
    await expect(page.getByText(description)).not.toBeVisible()
  })

  test('debe cancelar eliminación de caso', async ({ page }) => {
    // Esperar a que la tabla cargue
    await aftersalesPage.waitForTable()

    // Verificar que existe al menos un caso en la tabla
    const rowExists = await aftersalesPage.firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Abrir menú de acciones
      await aftersalesPage.openFirstRowActions()

      // Click en "Eliminar"
      await page.getByRole('menuitem', { name: /eliminar/i }).click()

      // Verificar que se abre el AlertDialog
      const alertDialog = page.getByRole('alertdialog')
      await expect(alertDialog).toBeVisible()

      // Cancelar
      await alertDialog.getByRole('button', { name: /cancelar/i }).click()

      // Verificar que el dialog se cierra sin eliminar
      await expect(alertDialog).not.toBeVisible({ timeout: 5000 })
    }
  })

  test('debe mostrar columnas correctas en la tabla', async ({ page }) => {
    // Esperar a que la tabla cargue
    await aftersalesPage.waitForTable()

    // Verificar headers de columnas
    await expect(page.getByRole('columnheader', { name: /proyecto/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /fecha/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /estado/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /descripción/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /acciones/i })).toBeVisible()
  })

  test('debe mostrar dropdown de acciones por caso', async ({ page }) => {
    // Esperar a que la tabla cargue
    await aftersalesPage.waitForTable()

    // Verificar que existe al menos un caso en la tabla
    const rowExists = await aftersalesPage.firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Abrir menú de acciones
      await aftersalesPage.openFirstRowActions()

      // Verificar que se abre el dropdown con las opciones
      await expect(page.getByRole('menuitem', { name: /editar/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /ver detalle/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /eliminar/i })).toBeVisible()
    }
  })

  test('debe cambiar estado de caso inline (EditableBadge)', async ({ page }) => {
    // Esperar a que la tabla cargue
    await aftersalesPage.waitForTable()

    // Verificar que existe al menos un caso en la tabla
    const rowExists = await aftersalesPage.firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Encontrar el EditableBadge en la columna de Estado
      const statusBadge = aftersalesPage.firstRow
        .locator('[data-editable-badge], .editable-badge')
        .first()
      const badgeExists = await statusBadge.isVisible().catch(() => false)

      if (badgeExists) {
        // Click en el badge para abrir el selector de estados
        await statusBadge.click()

        // Esperar a que aparezcan las opciones de estado
        const statusOptions = page.getByRole('option')
        await expect(statusOptions.first()).toBeVisible({ timeout: 5000 })

        const optionCount = await statusOptions.count()

        if (optionCount > 1) {
          // Esperar respuesta de la API al cambiar estado
          const responsePromise = page.waitForResponse(
            (r) => r.url().includes('/api/aftersales') && r.request().method() !== 'GET'
          )
          await statusOptions.nth(1).click()
          await responsePromise
        }
      }
    }
  })

  test('debe auto-completar teléfono del proyecto seleccionado', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Obtener valor inicial del teléfono (debería estar vacío)
    const initialValue = await newDialog.phoneInput.inputValue()

    // Seleccionar primer proyecto finalizado
    await newDialog.selectFirstProject()

    // Esperar a que el teléfono se autocomplete (no vacío)
    await expect(newDialog.phoneInput).not.toHaveValue('', { timeout: 5000 })

    // Verificar que el teléfono se auto-completó con un valor diferente
    const newValue = await newDialog.phoneInput.inputValue()
    expect(newValue).not.toBe(initialValue)
    expect(newValue).not.toBe('')
    // El input solo contiene los dígitos (el prefijo +56 está fuera del input)
    expect(newValue.replace(/\s/g, '')).toMatch(/^9\d+/)
  })

  test('debe mostrar AddressProjectSummary cuando se selecciona proyecto', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await aftersalesPage.openNewCaseDialog()
    await newDialog.expectVisible()

    // Seleccionar primer proyecto finalizado
    await newDialog.selectFirstProject()

    // Esperar a que el teléfono se autocomplete (indica que los detalles cargaron)
    await expect(newDialog.phoneInput).not.toHaveValue('', { timeout: 5000 })

    // Verificar que aparece el componente AddressProjectSummary
    // (debería mostrar calle, comuna, región del proyecto)
    const dialog = aftersalesPage.dialog
    const addressSummary = dialog.locator('[data-address-summary], .address-summary')
    const summaryExists = await addressSummary.isVisible().catch(() => false)

    // Si no existe un selector específico, buscar texto común de direcciones
    if (!summaryExists) {
      const hasAddressText = (await dialog.getByText(/calle|avenida|comuna|región/i).count()) > 0
      expect(hasAddressText).toBeTruthy()
    }
  })

  // Limpieza: eliminar todos los aftersales creados por tests E2E
  test.afterAll(async ({ request }) => {
    await cleanupE2EAftersales(request)
  })
})
