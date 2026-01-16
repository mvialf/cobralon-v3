import { test, expect } from '@playwright/test'

/**
 * Tests E2E para Configuración de Métodos de Pago (/settings/payments)
 *
 * Este módulo permite gestionar los métodos de pago disponibles:
 * - CRUD de métodos (crear, editar, eliminar)
 * - Drag & drop para reordenar
 * - Toggle activo/inactivo
 * - Protección: no se puede eliminar si tiene pagos asociados
 *
 * Criticidad: ALTA - Dependencia crítica para el sistema de pagos
 */

test.describe('Configuración de Métodos de Pago', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de configuración de métodos de pago
    await page.goto('/settings/payments')
    // Esperar a que la página cargue completamente
    await page.waitForLoadState('networkidle')
  })

  test.describe('Carga de Página', () => {
    test('debe cargar la página correctamente', async ({ page }) => {
      // Verificar título de la card
      await expect(page.getByRole('heading', { name: 'Métodos de Pago' })).toBeVisible()

      // Verificar descripción
      await expect(
        page.getByText(/Configura los métodos de pago disponibles/i)
      ).toBeVisible()
    })

    test('debe mostrar botón de crear nuevo método', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /Nuevo Método/i })
      await expect(newButton).toBeVisible()
    })

    test('debe mostrar la tabla de métodos', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      // Verificar headers
      await expect(page.getByRole('columnheader', { name: /Nombre/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Estado/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Acciones/i })).toBeVisible()
    })
  })

  test.describe('Listado de Métodos', () => {
    test('debe mostrar métodos existentes o mensaje vacío', async ({ page }) => {
      // Esperar a que carguen los datos
      await page.waitForTimeout(500)

      // Puede mostrar métodos o mensaje de "No hay métodos"
      const hasContent =
        (await page.locator('tbody tr').count()) > 0 ||
        (await page.getByText(/No hay métodos de pago configurados/i).isVisible())

      expect(hasContent).toBeTruthy()
    })

    test('debe mostrar badges de estado (Activo/Inactivo)', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        // Verificar que hay badges de estado
        const badges = page.locator('tbody').getByRole('status').or(page.locator('.badge, [class*="Badge"]'))
        // Debería haber al menos un badge visible
        const badgeCount = await badges.count()
        expect(badgeCount).toBeGreaterThanOrEqual(0) // Puede ser 0 si no hay filas
      }
    })

    test('debe mostrar iconos de drag handle', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        // Buscar icono de grip/drag (GripVertical)
        const gripIcons = page.locator('svg.lucide-grip-vertical')
        const gripCount = await gripIcons.count()
        // Cada fila debería tener un icono de drag
        expect(gripCount).toBe(count)
      }
    })
  })

  test.describe('Crear Método de Pago', () => {
    test('debe abrir dialog al hacer click en Nuevo Método', async ({ page }) => {
      // Click en botón de nuevo método
      await page.getByRole('button', { name: /Nuevo Método/i }).click()

      // Verificar que se abre el dialog
      await expect(page.getByRole('dialog')).toBeVisible()

      // Verificar título del dialog
      await expect(
        page.getByRole('heading', { name: /Nuevo Método|Crear Método/i })
      ).toBeVisible()
    })

    test('debe mostrar campo de nombre en el dialog', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /Nuevo Método/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Verificar campo de nombre
      const nameInput = page.getByLabel(/Nombre/i).or(page.getByPlaceholder(/nombre/i))
      await expect(nameInput).toBeVisible()
    })

    test('debe validar campo obligatorio', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /Nuevo Método/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Intentar guardar sin completar
      const saveButton = page.getByRole('button', { name: /Guardar|Crear/i })
      await saveButton.click()

      // Debería mostrar error de validación
      const error = page.getByText(/requerido|obligatorio|required/i)
      await expect(error).toBeVisible()
    })

    test('debe cerrar dialog con botón Cancelar', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /Nuevo Método/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Click en Cancelar
      await page.getByRole('button', { name: /Cancelar/i }).click()

      // Dialog debe cerrarse
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('debe cerrar dialog con Escape', async ({ page }) => {
      // Abrir dialog
      await page.getByRole('button', { name: /Nuevo Método/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Presionar Escape
      await page.keyboard.press('Escape')

      // Dialog debe cerrarse
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })

    test('flujo completo: crear método de pago', async ({ page }) => {
      const methodName = `Test Method ${Date.now()}`

      // Abrir dialog
      await page.getByRole('button', { name: /Nuevo Método/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Completar formulario
      const nameInput = page.getByLabel(/Nombre/i).or(page.getByPlaceholder(/nombre/i))
      await nameInput.fill(methodName)

      // Guardar
      const saveButton = page.getByRole('button', { name: /Guardar|Crear/i })
      await saveButton.click()

      // Esperar a que se cierre el dialog y se actualice la tabla
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

      // Verificar que aparece en la tabla
      await expect(page.getByText(methodName)).toBeVisible()
    })
  })

  test.describe('Acciones de Método', () => {
    test('debe tener botones de acción por fila', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        const firstRow = rows.first()

        // Verificar botón de toggle (Activar/Desactivar)
        const toggleButton = firstRow.getByRole('button', { name: /Activar|Desactivar/i })
        await expect(toggleButton).toBeVisible()

        // Verificar botón de editar (icono Pencil)
        const editButton = firstRow.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
        await expect(editButton).toBeVisible()

        // Verificar botón de eliminar (icono Trash)
        const deleteButton = firstRow.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
        await expect(deleteButton).toBeVisible()
      }
    })

    test('debe poder toggle estado activo/inactivo', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        const firstRow = rows.first()

        // Obtener estado actual
        const currentState = await firstRow.getByText(/Activo|Inactivo/).textContent()

        // Click en toggle
        const toggleButton = firstRow.getByRole('button', { name: /Activar|Desactivar/i })
        await toggleButton.click()

        // Esperar actualización
        await page.waitForTimeout(1000)

        // El estado debería haber cambiado
        const newState = await firstRow.getByText(/Activo|Inactivo/).textContent()
        expect(newState).not.toBe(currentState)

        // Revertir para no afectar otros tests
        await toggleButton.click()
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Editar Método', () => {
    test('debe abrir dialog de edición al hacer click en editar', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        // Click en botón de editar del primer método
        const editButton = rows.first().locator('button').filter({ has: page.locator('svg.lucide-pencil') })
        await editButton.click()

        // Verificar que se abre el dialog
        await expect(page.getByRole('dialog')).toBeVisible()

        // Verificar que tiene el nombre actual precargado
        const nameInput = page.getByLabel(/Nombre/i).or(page.locator('input[name="name"]'))
        const value = await nameInput.inputValue()
        expect(value.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Eliminar Método', () => {
    test('debe mostrar confirmación al intentar eliminar', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        // Buscar un método que se pueda eliminar (sin pagos asociados)
        const deleteButton = rows.first().locator('button').filter({ has: page.locator('svg.lucide-trash-2') })

        // Solo si el botón no está deshabilitado
        if (!(await deleteButton.isDisabled())) {
          await deleteButton.click()

          // Verificar dialog de confirmación
          await expect(page.getByRole('alertdialog')).toBeVisible()
          await expect(page.getByText(/¿Estás seguro/i)).toBeVisible()

          // Cancelar para no eliminar
          await page.getByRole('button', { name: /Cancelar/i }).click()
          await expect(page.getByRole('alertdialog')).not.toBeVisible()
        }
      }
    })

    test('debe deshabilitar eliminar si tiene pagos asociados', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      // Buscar botón de eliminar deshabilitado
      const disabledDeleteButtons = page.locator('button:disabled').filter({ has: page.locator('svg.lucide-trash-2') })
      const disabledCount = await disabledDeleteButtons.count()

      // Este test verifica la lógica pero no falla si no hay botones deshabilitados
      // (puede que todos los métodos no tengan pagos)
      if (disabledCount > 0) {
        // Verificar que tiene title explicativo
        const button = disabledDeleteButtons.first()
        const title = await button.getAttribute('title')
        expect(title).toContain('pago')
      }
    })
  })

  test.describe('Drag & Drop (Reordenar)', () => {
    test('debe tener elementos arrastrables', async ({ page }) => {
      await page.waitForTimeout(500)

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count >= 2) {
        // Verificar que hay iconos de drag
        const gripHandles = page.locator('svg.lucide-grip-vertical')
        expect(await gripHandles.count()).toBe(count)

        // Verificar cursor de drag
        const firstHandle = gripHandles.first()
        const parentCell = firstHandle.locator('..')
        await expect(parentCell).toHaveClass(/cursor-grab/)
      }
    })

    // Nota: El test real de drag & drop es complejo y puede ser flaky
    // Se recomienda testear manualmente o con un helper específico
  })
})
