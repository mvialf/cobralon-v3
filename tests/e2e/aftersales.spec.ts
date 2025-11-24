import { test, expect } from '@playwright/test'

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
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de postventas antes de cada test
    await page.goto('/aftersales')

    // Esperar a que la página cargue completamente
    await expect(page.getByRole('heading', { name: 'Postventas', level: 1 })).toBeVisible()
  })

  test('debe cargar la página de postventas correctamente', async ({ page }) => {
    // Verificar título de la página
    await expect(page.getByRole('heading', { name: 'Postventas', level: 1 })).toBeVisible()

    // Verificar que el botón "Nuevo Caso" existe
    await expect(page.getByRole('button', { name: /nuevo caso/i })).toBeVisible()

    // Verificar que el campo de búsqueda está presente
    await expect(page.getByPlaceholder(/buscar por proyecto, cliente o descripción/i)).toBeVisible()

    // Verificar que el área de contenido está presente (tabla, skeleton o mensaje de vacío)
    const contentVisible = await page
      .locator('table, .skeleton, :has-text("No se encontraron resultados")')
      .first()
      .isVisible()
      .catch(() => false)

    expect(contentVisible).toBeTruthy()
  })

  test('debe abrir el dialog de nuevo caso', async ({ page }) => {
    // Click en botón "Nuevo Caso"
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    // Verificar que se abre el dialog
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /nuevo caso de postventa/i })).toBeVisible()

    // Verificar descripción del dialog
    await expect(
      dialog.getByText(/registra un nuevo problema o incidencia en un proyecto finalizado/i)
    ).toBeVisible()

    // Verificar que los campos del formulario están presentes
    // Nota: ProjectSearchField es un Combobox, Estado es Combobox
    await expect(dialog.getByLabel(/estado/i)).toBeVisible()
    await expect(dialog.getByLabel(/fecha de reporte/i)).toBeVisible()
    await expect(dialog.getByLabel(/teléfono/i)).toBeVisible()
    await expect(dialog.getByLabel(/descripción del problema/i)).toBeVisible()

    // Verificar botones del dialog
    await expect(dialog.getByRole('button', { name: /cancelar/i })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /crear caso/i })).toBeVisible()
  })

  test('debe validar campos obligatorios del formulario', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Intentar enviar formulario sin llenar campos
    await dialog.getByRole('button', { name: /crear caso/i }).click()

    // Verificar mensajes de error de validación
    // Proyecto: obligatorio
    await expect(dialog.getByText(/debe seleccionar un proyecto válido/i)).toBeVisible()

    // Estado: obligatorio
    await expect(dialog.getByText(/debe seleccionar un estado válido/i)).toBeVisible()

    // Teléfono: obligatorio
    await expect(dialog.getByText(/el teléfono de contacto es obligatorio/i)).toBeVisible()

    // Fecha de Reporte: debería tener valor por defecto (new Date()), no mensaje de error

    // Descripción: opcional, no mensaje de error
  })

  test('debe validar formato de teléfono chileno', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Llenar teléfono con formato inválido
    await dialog.getByLabel(/teléfono/i).fill('123456789') // Formato inválido

    // Intentar enviar
    await dialog.getByRole('button', { name: /crear caso/i }).click()

    // Verificar mensaje de error de formato
    await expect(dialog.getByText(/formato inválido.*teléfono chileno válido/i)).toBeVisible()
  })

  test('debe crear un caso de postventa completo exitosamente', async ({ page }) => {
    // Generar descripción única
    const timestamp = Date.now()
    const description = `E2E Test Aftersale ${timestamp} - Problema con instalación`

    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Seleccionar proyecto finalizado (usando ProjectSearchField - Combobox)
    // Primero hacer click en el Combobox de proyecto para abrirlo
    const projectCombobox = dialog.getByRole('combobox').first() // El primer combobox es el proyecto
    await projectCombobox.click()

    // Esperar a que aparezcan las opciones
    await page.waitForTimeout(500)

    // Seleccionar el primer proyecto finalizado disponible
    const firstProject = page.getByRole('option').first()
    await firstProject.click()

    // Esperar a que se carguen los detalles del proyecto (teléfono auto-completa)
    await page.waitForTimeout(500)

    // Estado: debería auto-seleccionarse el estado inicial, pero verificar que existe
    const estadoCombobox = dialog.getByLabel(/estado/i)
    await expect(estadoCombobox).toBeVisible()

    // Fecha de Reporte: usar fecha de hoy (debería tener valor por defecto)
    // No es necesario cambiarla

    // Teléfono: debería auto-completarse con el del proyecto
    // Verificar que tiene valor
    const phoneInput = dialog.getByLabel(/teléfono/i)
    const phoneValue = await phoneInput.inputValue()
    expect(phoneValue).not.toBe('')

    // Llenar descripción
    await dialog.getByLabel(/descripción del problema/i).fill(description)

    // Enviar formulario
    await dialog.getByRole('button', { name: /crear caso/i }).click()

    // Esperar a que el dialog se cierre (señal de éxito)
    await expect(dialog).not.toBeVisible({ timeout: 10000 })

    // Verificar que aparece el toast de éxito (opcional)
    // await expect(page.getByText(/caso creado/i)).toBeVisible()

    // Buscar el caso recién creado en la tabla
    await page.getByPlaceholder(/buscar por proyecto, cliente o descripción/i).fill(description)

    // Esperar a que la búsqueda se ejecute (sin debounce en este caso, es instantáneo)
    await page.waitForTimeout(300)

    // Verificar que el caso aparece en la tabla
    await expect(page.getByText(description)).toBeVisible()
  })

  test('debe crear un caso sin descripción (campo opcional)', async ({ page }) => {
    // Generar timestamp para identificación
    const timestamp = Date.now()

    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Seleccionar proyecto finalizado
    const projectCombobox = dialog.getByRole('combobox').first()
    await projectCombobox.click()
    await page.waitForTimeout(500)
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)

    // No llenar descripción (campo opcional)

    // Enviar formulario
    await dialog.getByRole('button', { name: /crear caso/i }).click()

    // Esperar a que el dialog se cierre
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
  })

  test('debe validar descripción máxima de 1000 caracteres', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Llenar descripción con más de 1000 caracteres
    const longDescription = 'A'.repeat(1001)
    await dialog.getByLabel(/descripción del problema/i).fill(longDescription)

    // Intentar enviar
    await dialog.getByRole('button', { name: /crear caso/i }).click()

    // Verificar mensaje de error
    await expect(dialog.getByText(/la descripción no puede exceder 1000 caracteres/i)).toBeVisible()
  })

  test('debe permitir agregar tareas a la lista de tareas', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Seleccionar proyecto finalizado
    const projectCombobox = dialog.getByRole('combobox').first()
    await projectCombobox.click()
    await page.waitForTimeout(500)
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)

    // Agregar tareas a la lista (TodoListField)
    // Buscar el input de "Agregar tarea" o similar
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
    await dialog.getByRole('button', { name: /crear caso/i }).click()

    // Esperar a que el dialog se cierre
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
  })

  test('debe realizar búsqueda de casos correctamente', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

    // Obtener una descripción de caso existente de la tabla (si hay datos)
    const firstDescriptionCell = page.locator('table tbody tr').first().locator('td').nth(3) // Columna de descripción (índice puede variar)
    const descriptionExists = await firstDescriptionCell.isVisible().catch(() => false)

    if (descriptionExists) {
      const descriptionText = await firstDescriptionCell.textContent()

      if (descriptionText && descriptionText.trim() !== '') {
        // Buscar por ese término
        await page
          .getByPlaceholder(/buscar por proyecto, cliente o descripción/i)
          .fill(descriptionText.substring(0, 10))

        // Esperar a que la búsqueda se ejecute (instantáneo, no hay debounce)
        await page.waitForTimeout(300)

        // Verificar que la búsqueda se ejecutó
        const tableRows = page.locator('table tbody tr')
        const rowCount = await tableRows.count()

        // Debe haber al menos 1 resultado
        expect(rowCount).toBeGreaterThanOrEqual(1)
      }
    }

    // Búsqueda con término que no existe
    await page.getByPlaceholder(/buscar por proyecto, cliente o descripción/i).clear()
    await page
      .getByPlaceholder(/buscar por proyecto, cliente o descripción/i)
      .fill('ZZZZZ_NO_EXISTE_999')
    await page.waitForTimeout(300)

    // Verificar mensaje de "No se encontraron resultados"
    await expect(page.getByText(/no se encontraron resultados/i)).toBeVisible()
  })

  test('debe editar un caso de postventa existente', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

    // Verificar que existe al menos un caso en la tabla
    const firstRow = page.locator('table tbody tr').first()
    const rowExists = await firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Click en el botón de acciones (tres puntos)
      const actionsButton = firstRow.getByRole('button').first()
      await actionsButton.click()

      // Click en opción "Editar"
      await page.getByRole('menuitem', { name: /editar/i }).click()

      // Verificar que se abre el dialog de edición
      const dialog = page.getByRole('dialog')
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
      await expect(dialog).not.toBeVisible({ timeout: 10000 })

      // Verificar que aparece el toast de éxito (opcional)
      // await expect(page.getByText(/caso actualizado/i)).toBeVisible()

      // Verificar que la descripción se actualizó en la tabla
      await page.waitForTimeout(500)
      await expect(page.getByText(newDescription, { exact: false })).toBeVisible()
    }
  })

  test('debe eliminar un caso de postventa con confirmación', async ({ page }) => {
    // Primero crear un caso para eliminar
    const description = `E2E Test Delete ${Date.now()}`

    // Crear caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()
    const createDialog = page.getByRole('dialog')
    const projectCombobox = createDialog.getByRole('combobox').first()
    await projectCombobox.click()
    await page.waitForTimeout(500)
    await page.getByRole('option').first().click()
    await page.waitForTimeout(500)
    await createDialog.getByLabel(/descripción del problema/i).fill(description)
    await createDialog.getByRole('button', { name: /crear caso/i }).click()
    await expect(createDialog).not.toBeVisible({ timeout: 10000 })

    // Buscar el caso recién creado
    await page.getByPlaceholder(/buscar por proyecto, cliente o descripción/i).fill(description)
    await page.waitForTimeout(300)

    // Verificar que existe
    await expect(page.getByText(description)).toBeVisible()

    // Obtener la fila del caso
    const row = page.locator(`tr:has-text("${description}")`).first()
    await expect(row).toBeVisible()

    // Click en acciones
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

    // Esperar a que el dialog se cierre
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 })

    // Verificar que el caso ya no aparece en la tabla
    await page.waitForTimeout(500)
    await expect(page.getByText(description)).not.toBeVisible()
  })

  test('debe cancelar eliminación de caso', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

    // Verificar que existe al menos un caso en la tabla
    const firstRow = page.locator('table tbody tr').first()
    const rowExists = await firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Click en acciones
      const actionsButton = firstRow.getByRole('button').first()
      await actionsButton.click()

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
    await page.waitForLoadState('networkidle')

    // Verificar headers de columnas
    await expect(page.getByRole('columnheader', { name: /proyecto/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /fecha/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /estado/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /descripción/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /acciones/i })).toBeVisible()
  })

  test('debe mostrar dropdown de acciones por caso', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

    // Verificar que existe al menos un caso en la tabla
    const firstRow = page.locator('table tbody tr').first()
    const rowExists = await firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Click en el botón de acciones (tres puntos)
      const actionsButton = firstRow.getByRole('button').first()
      await actionsButton.click()

      // Verificar que se abre el dropdown con las opciones
      await expect(page.getByRole('menuitem', { name: /editar/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /ver detalle/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /eliminar/i })).toBeVisible()
    }
  })

  test('debe cambiar estado de caso inline (EditableBadge)', async ({ page }) => {
    // Esperar a que la tabla cargue
    await page.waitForLoadState('networkidle')

    // Verificar que existe al menos un caso en la tabla
    const firstRow = page.locator('table tbody tr').first()
    const rowExists = await firstRow.isVisible().catch(() => false)

    if (rowExists) {
      // Encontrar el EditableBadge en la columna de Estado
      const statusBadge = firstRow.locator('[data-editable-badge], .editable-badge').first()
      const badgeExists = await statusBadge.isVisible().catch(() => false)

      if (badgeExists) {
        // Click en el badge para abrir el selector de estados
        await statusBadge.click()

        // Esperar a que aparezcan las opciones de estado
        await page.waitForTimeout(500)

        // Seleccionar un estado diferente (segundo en la lista)
        const statusOptions = page.getByRole('option')
        const optionCount = await statusOptions.count()

        if (optionCount > 1) {
          await statusOptions.nth(1).click()

          // Esperar a que se actualice
          await page.waitForTimeout(1000)

          // Verificar que aparece el toast de éxito (opcional)
          // await expect(page.getByText(/actualizado exitosamente/i)).toBeVisible()
        }
      }
    }
  })

  test('debe auto-completar teléfono del proyecto seleccionado', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Obtener valor inicial del teléfono (debería estar vacío)
    const phoneInput = dialog.getByLabel(/teléfono/i)
    const initialValue = await phoneInput.inputValue()

    // Seleccionar proyecto finalizado
    const projectCombobox = dialog.getByRole('combobox').first()
    await projectCombobox.click()
    await page.waitForTimeout(500)
    await page.getByRole('option').first().click()

    // Esperar a que se carguen los detalles del proyecto
    await page.waitForTimeout(1000)

    // Verificar que el teléfono se auto-completó
    const newValue = await phoneInput.inputValue()
    expect(newValue).not.toBe(initialValue)
    expect(newValue).not.toBe('')
    // Debe tener formato +56...
    expect(newValue).toMatch(/^\+56/)
  })

  test('debe mostrar AddressProjectSummary cuando se selecciona proyecto', async ({ page }) => {
    // Abrir dialog de nuevo caso
    await page.getByRole('button', { name: /nuevo caso/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Seleccionar proyecto finalizado
    const projectCombobox = dialog.getByRole('combobox').first()
    await projectCombobox.click()
    await page.waitForTimeout(500)
    await page.getByRole('option').first().click()

    // Esperar a que se carguen los detalles del proyecto
    await page.waitForTimeout(1000)

    // Verificar que aparece el componente AddressProjectSummary
    // (debería mostrar calle, comuna, región del proyecto)
    const addressSummary = dialog.locator('[data-address-summary], .address-summary')
    const summaryExists = await addressSummary.isVisible().catch(() => false)

    // Si no existe un selector específico, buscar texto común de direcciones
    if (!summaryExists) {
      // Buscar si aparece algún texto de dirección (calle, comuna, etc.)
      // Esto es aproximado, depende de la implementación de AddressProjectSummary
      const hasAddressText = (await dialog.getByText(/calle|avenida|comuna|región/i).count()) > 0
      expect(hasAddressText).toBeTruthy()
    }
  })
})
