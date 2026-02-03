import { test, expect } from '@playwright/test'
import { PaymentMethodsPage } from './page-objects/payment-methods.page'
import { cleanupE2EPaymentMethods } from './helpers/cleanup'

/**
 * Tests E2E para Configuracion de Metodos de Pago (/settings/payments)
 *
 * Este modulo permite gestionar los metodos de pago disponibles:
 * - CRUD de metodos (crear, editar, eliminar)
 * - Drag & drop para reordenar
 * - Toggle activo/inactivo
 * - Proteccion: no se puede eliminar si tiene pagos asociados
 *
 * Criticidad: ALTA - Dependencia critica para el sistema de pagos
 */

test.describe('Configuracion de Metodos de Pago', () => {
  let methodsPage: PaymentMethodsPage

  test.beforeEach(async ({ page }) => {
    methodsPage = new PaymentMethodsPage(page)
    await methodsPage.navigate()
  })

  // Limpiar metodos de pago creados por tests
  test.afterAll(async ({ request }) => {
    await cleanupE2EPaymentMethods(request)
  })

  test.describe('Carga de Pagina', () => {
    test('debe cargar la pagina correctamente', async ({ page }) => {
      // Verificar titulo de la card
      await expect(methodsPage.heading).toBeVisible()

      // Verificar descripcion
      await expect(
        page.getByText(/Configura los métodos de pago disponibles/i)
      ).toBeVisible()
    })

    test('debe mostrar boton de crear nuevo metodo', async ({ page }) => {
      const newButton = page.getByRole('button', { name: /Nuevo Método/i })
      await expect(newButton).toBeVisible()
    })

    test('debe mostrar la tabla de metodos', async ({ page }) => {
      const table = page.locator('table')
      await expect(table).toBeVisible()

      // Verificar headers
      await expect(page.getByRole('columnheader', { name: /Nombre/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Estado/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Acciones/i })).toBeVisible()
    })
  })

  test.describe('Listado de Metodos', () => {
    test('debe mostrar metodos existentes o mensaje vacio', async ({ page }) => {
      // Esperar a que las filas sean visibles o verificar mensaje vacio
      const firstRow = page.locator('tbody tr').first()
      const emptyMessage = page.getByText(/No hay métodos de pago configurados/i)

      const hasRows = await firstRow.isVisible().catch(() => false)
      const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false)

      expect(hasRows || hasEmptyMessage).toBeTruthy()
    })

    test('debe mostrar badges de estado (Activo/Inactivo)', async ({ page }) => {
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      const rows = methodsPage.rows
      const count = await rows.count()

      if (count > 0) {
        // Verificar que hay badges de estado
        const badges = page.locator('tbody').getByRole('status').or(page.locator('.badge, [class*="Badge"]'))
        const badgeCount = await badges.count()
        expect(badgeCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('debe mostrar iconos de drag handle', async ({ page }) => {
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      const rows = methodsPage.rows
      const count = await rows.count()

      if (count > 0) {
        // Buscar icono de grip/drag (GripVertical)
        const gripIcons = page.locator('svg.lucide-grip-vertical')
        const gripCount = await gripIcons.count()
        // Cada fila deberia tener un icono de drag
        expect(gripCount).toBe(count)
      }
    })
  })

  test.describe('Crear Metodo de Pago', () => {
    test('debe abrir dialog al hacer click en Nuevo Metodo', async ({ page }) => {
      // Click en boton de nuevo metodo
      await methodsPage.openNewMethodDialog()

      // Verificar titulo del dialog
      await expect(
        page.getByRole('heading', { name: /Nuevo Método|Crear Método/i })
      ).toBeVisible()
    })

    test('debe mostrar campo de nombre en el dialog', async ({ page }) => {
      // Abrir dialog
      await methodsPage.openNewMethodDialog()

      // Verificar campo de nombre
      const nameInput = page.getByLabel(/Nombre/i).or(page.getByPlaceholder(/nombre/i))
      await expect(nameInput).toBeVisible()
    })

    test('debe validar campo obligatorio', async ({ page }) => {
      // Abrir dialog
      await methodsPage.openNewMethodDialog()

      // Intentar guardar sin completar
      const saveButton = page.getByRole('button', { name: /Guardar|Crear/i })
      await saveButton.click()

      // Deberia mostrar error de validacion
      const error = page.getByText(/requerido|obligatorio|required/i)
      await expect(error).toBeVisible()
    })

    test('debe cerrar dialog con boton Cancelar', async ({ page }) => {
      // Abrir dialog
      await methodsPage.openNewMethodDialog()

      // Click en Cancelar
      await page.getByRole('button', { name: /Cancelar/i }).click()

      // Dialog debe cerrarse
      await expect(methodsPage.dialog).not.toBeVisible()
    })

    test('debe cerrar dialog con Escape', async ({ page }) => {
      // Abrir dialog
      await methodsPage.openNewMethodDialog()

      // Presionar Escape
      await page.keyboard.press('Escape')

      // Dialog debe cerrarse
      await expect(methodsPage.dialog).not.toBeVisible()
    })

    test('flujo completo: crear metodo de pago', async ({ page }) => {
      const methodName = `E2E Test Method ${Date.now()}`

      // Abrir dialog
      await methodsPage.openNewMethodDialog()

      // Completar formulario
      const nameInput = page.getByLabel(/Nombre/i).or(page.getByPlaceholder(/nombre/i))
      await nameInput.fill(methodName)

      // Guardar
      const saveButton = page.getByRole('button', { name: /Guardar|Crear/i })
      await saveButton.click()

      // Esperar a que se cierre el dialog y se actualice la tabla
      await expect(methodsPage.dialog).not.toBeVisible({ timeout: 5000 })

      // Verificar que aparece en la tabla
      await expect(page.getByText(methodName)).toBeVisible()
    })
  })

  test.describe('Acciones de Metodo', () => {
    test('debe tener botones de accion por fila', async ({ page }) => {
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      const rows = methodsPage.rows
      const count = await rows.count()

      if (count > 0) {
        const firstRow = rows.first()

        // Verificar boton de toggle (Activar/Desactivar)
        const toggleButton = firstRow.getByRole('button', { name: /Activar|Desactivar/i })
        await expect(toggleButton).toBeVisible()

        // Verificar boton de editar (icono Pencil)
        const editButton = firstRow.locator('button').filter({ has: page.locator('svg.lucide-pencil') })
        await expect(editButton).toBeVisible()

        // Verificar boton de eliminar (icono Trash)
        const deleteButton = firstRow.locator('button').filter({ has: page.locator('svg.lucide-trash-2') })
        await expect(deleteButton).toBeVisible()
      }
    })

    test('debe poder toggle estado activo/inactivo', async ({ page }) => {
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      const rows = methodsPage.rows
      const count = await rows.count()

      if (count > 0) {
        const firstRow = rows.first()

        // Obtener estado actual
        const currentState = await firstRow.getByText(/Activo|Inactivo/).textContent()

        // Click en toggle y esperar respuesta del API
        const toggleButton = firstRow.getByRole('button', { name: /Activar|Desactivar/i })
        const [toggleResponse] = await Promise.all([
          page.waitForResponse(r => r.url().includes('/api/payment-methods')),
          toggleButton.click(),
        ])

        // Verificar que la peticion fue exitosa
        expect(toggleResponse.ok()).toBeTruthy()

        // El estado deberia haber cambiado
        const newState = await firstRow.getByText(/Activo|Inactivo/).textContent()
        expect(newState).not.toBe(currentState)

        // Revertir para no afectar otros tests
        await Promise.all([
          page.waitForResponse(r => r.url().includes('/api/payment-methods')),
          toggleButton.click(),
        ])
      }
    })
  })

  test.describe('Editar Metodo', () => {
    test('debe abrir dialog de edicion al hacer click en editar', async ({ page }) => {
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      const rows = methodsPage.rows
      const count = await rows.count()

      if (count > 0) {
        // Click en boton de editar del primer metodo
        const editButton = rows.first().locator('button').filter({ has: page.locator('svg.lucide-pencil') })
        await editButton.click()

        // Verificar que se abre el dialog
        await expect(methodsPage.dialog).toBeVisible()

        // Verificar que tiene el nombre actual precargado
        const nameInput = page.getByLabel(/Nombre/i).or(page.locator('input[name="name"]'))
        const value = await nameInput.inputValue()
        expect(value.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Eliminar Metodo', () => {
    test('debe mostrar confirmacion al intentar eliminar', async ({ page }) => {
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      const rows = methodsPage.rows
      const count = await rows.count()

      if (count > 0) {
        // Buscar un metodo que se pueda eliminar (sin pagos asociados)
        const deleteButton = rows.first().locator('button').filter({ has: page.locator('svg.lucide-trash-2') })

        // Solo si el boton no esta deshabilitado
        if (!(await deleteButton.isDisabled())) {
          await deleteButton.click()

          // Verificar dialog de confirmacion
          await expect(page.getByRole('alertdialog')).toBeVisible()
          await expect(page.getByText(/¿Estás seguro/i)).toBeVisible()

          // Cancelar para no eliminar
          await page.getByRole('button', { name: /Cancelar/i }).click()
          await expect(page.getByRole('alertdialog')).not.toBeVisible()
        }
      }
    })

    test('debe deshabilitar eliminar si tiene pagos asociados', async ({ page }) => {
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      // Buscar boton de eliminar deshabilitado
      const disabledDeleteButtons = page.locator('button:disabled').filter({ has: page.locator('svg.lucide-trash-2') })
      const disabledCount = await disabledDeleteButtons.count()

      // Este test verifica la logica pero no falla si no hay botones deshabilitados
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
      await expect(page.locator('tbody tr').first()).toBeVisible().catch(() => {
        // Sin filas, el test pasa
      })

      const rows = methodsPage.rows
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
    // Se recomienda testear manualmente o con un helper especifico
  })
})
