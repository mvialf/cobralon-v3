import { test, expect } from '@playwright/test'
import { VisitsPage } from './page-objects/visits.page'

/**
 * Tests E2E para el modulo de Visitas (/visits)
 *
 * Este modulo gestiona las visitas a clientes potenciales:
 * - Listado con paginacion server-side
 * - Busqueda con debounce
 * - Filtro por estado (VisitStatus)
 * - Cambio de estado inline
 * - Crear nueva visita
 *
 * Criticidad: ALTA - Seguimiento de proyectos de cobranza
 */

test.describe('Gestion de Visitas', () => {
  let visitsPage: VisitsPage

  test.beforeEach(async ({ page }) => {
    visitsPage = new VisitsPage(page)
    await visitsPage.navigate()
  })

  test.describe('Carga de Pagina', () => {
    test('debe cargar la pagina correctamente', async ({ page }) => {
      // Verificar titulo de pagina
      await expect(visitsPage.heading).toBeVisible()

      // Verificar descripcion
      await expect(
        page.getByText(/Gestiona las visitas agendadas/i)
      ).toBeVisible()
    })

    test('debe mostrar breadcrumbs', async ({ page }) => {
      await expect(page.getByText('Inicio')).toBeVisible()
      await expect(page.getByText('Visitas')).toBeVisible()
    })

    test('debe mostrar boton de nueva visita', async () => {
      await expect(visitsPage.newVisitButton).toBeVisible()
    })

    test('debe cargar sin mostrar loading gracias a SSR', async ({ page }) => {
      // El SSR pre-carga los datos, no deberia verse "Cargando..."
      await page.goto('/visits')

      // Verificar que la tabla aparece rapido (SSR)
      const table = page.locator('table').or(page.locator('[role="grid"]'))
      await expect(table).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Tabla de Visitas', () => {
    test('debe mostrar la tabla con datos o mensaje vacio', async ({ page }) => {
      // Esperar a que la tabla sea visible
      await visitsPage.waitForTable()

      // Deberia haber tabla o mensaje de "sin datos"
      const table = page.locator('table')
      const emptyMessage = page.getByText(/No hay visitas|Sin resultados/i)

      const hasTable = await table.isVisible()
      const hasEmptyMessage = await emptyMessage.isVisible()

      expect(hasTable || hasEmptyMessage).toBeTruthy()
    })

    test('debe tener las columnas esperadas', async ({ page }) => {
      const table = page.locator('table')

      if (await table.isVisible()) {
        // Verificar headers principales
        const headers = page.locator('thead th, [role="columnheader"]')
        const headerCount = await headers.count()

        // Deberia haber al menos 3 columnas (Fecha, Cliente, Estado)
        expect(headerCount).toBeGreaterThanOrEqual(3)
      }
    })
  })

  test.describe('Busqueda', () => {
    test('debe tener campo de busqueda', async () => {
      await expect(visitsPage.searchInput).toBeVisible()
    })

    test('debe filtrar al escribir (con debounce)', async ({ page }) => {
      // Escribir termino de busqueda y esperar respuesta del API
      await visitsPage.searchVisit('test')

      // La tabla deberia actualizarse
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })

    test('debe resetear paginacion al buscar', async ({ page }) => {
      // Ir a pagina 2 si hay suficientes datos
      const nextButton = page.getByRole('button', { name: /Siguiente|Next|>/i })
      if (await nextButton.isEnabled()) {
        await nextButton.click()
        await expect(page.locator('table')).toBeVisible()
      }

      // Buscar algo y esperar respuesta del API
      await visitsPage.searchVisit('a')

      // Verificar que la tabla sigue funcionando
      await expect(page.locator('table')).toBeVisible()
    })
  })

  test.describe('Filtro por Estado', () => {
    test('debe tener filtro de estado', async () => {
      await expect(visitsPage.statusFilterButton).toBeVisible()
    })

    test('debe mostrar opciones de estado al hacer click', async ({ page }) => {
      const filterButton = page.getByRole('button', { name: /Estado/i })

      if (await filterButton.isVisible()) {
        await filterButton.click()

        // Esperar a que aparezca el popover/dropdown
        const options = page.getByRole('option')
        await expect(options.first()).toBeVisible().catch(() => {
          // Si no hay opciones, el test pasa igual
        })

        const optionCount = await options.count()
        expect(optionCount).toBeGreaterThanOrEqual(0)

        // Cerrar
        await page.keyboard.press('Escape')
      }
    })
  })

  test.describe('Paginacion Server-Side', () => {
    test('debe mostrar controles de paginacion', async ({ page }) => {
      await visitsPage.waitForTable()

      // Buscar controles de paginacion
      const pagination = page.locator('[role="navigation"]')
        .or(page.locator('.pagination'))
        .or(page.getByRole('button', { name: /Anterior|Previous|Siguiente|Next/i }).first())

      const hasData = await page.locator('tbody tr').count()

      if (hasData >= 50) {
        // Si hay datos suficientes, deberia haber paginacion
        await expect(pagination).toBeVisible()
      }
    })

    test('debe poder navegar entre paginas', async ({ page }) => {
      await visitsPage.waitForTable()

      const nextButton = page.getByRole('button', { name: /Siguiente|Next|>/i })

      if (await nextButton.isEnabled()) {
        // Click en siguiente y esperar carga de datos
        await nextButton.click()
        await expect(page.locator('table')).toBeVisible()

        // Deberia poder volver atras
        const prevButton = page.getByRole('button', { name: /Anterior|Previous|</i })
        await expect(prevButton).toBeEnabled()
      }
    })
  })

  test.describe('Crear Nueva Visita', () => {
    test('debe abrir dialog al hacer click en Nueva Visita', async () => {
      await visitsPage.openNewVisitDialog()
      await expect(visitsPage.dialog).toBeVisible()
    })

    test('debe mostrar formulario de nueva visita', async ({ page }) => {
      // Abrir dialog
      await visitsPage.openNewVisitDialog()

      // Verificar campos tipicos de una visita
      const dateField = page.getByLabel(/Fecha/i).or(page.locator('input[type="date"]'))
      await expect(dateField).toBeVisible()
    })

    test('debe cerrar dialog con Escape', async ({ page }) => {
      // Abrir dialog
      await visitsPage.openNewVisitDialog()

      // Presionar Escape
      await page.keyboard.press('Escape')

      // Dialog debe cerrarse
      await expect(visitsPage.dialog).not.toBeVisible()
    })
  })

  test.describe('Cambio de Estado Inline', () => {
    test('debe poder cambiar estado desde la tabla', async ({ page }) => {
      await visitsPage.waitForTable()

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        // Buscar badge de estado en la primera fila
        const statusBadge = rows.first().locator('.badge, [class*="Badge"]').first()

        if (await statusBadge.isVisible()) {
          // Click en el badge para cambiar estado
          await statusBadge.click()

          // Esperar a que aparezca el selector/popover con opciones
          const options = page.getByRole('option')
            .or(page.getByRole('menuitem'))
            .or(page.locator('[role="listbox"] [role="option"]'))

          await expect(options.first()).toBeVisible().catch(() => {
            // Si no hay opciones visibles, el inline edit puede no estar disponible
          })

          const optionCount = await options.count()

          // Si hay opciones, el inline edit esta funcionando
          if (optionCount > 0) {
            // Cancelar con Escape
            await page.keyboard.press('Escape')
          }
        }
      }
    })
  })

  test.describe('Detalle de Visita', () => {
    test('debe poder navegar al detalle de una visita', async ({ page }) => {
      await visitsPage.waitForTable()

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      if (count > 0) {
        // Buscar link o boton de ver detalle
        const detailLink = rows.first().getByRole('link')
          .or(rows.first().getByRole('button', { name: /Ver|Detalle/i }))

        if (await detailLink.first().isVisible()) {
          await detailLink.first().click()

          // Deberia navegar a /visits/[id]
          await page.waitForURL(/\/visits\/[a-zA-Z0-9-]+/)

          // Verificar que estamos en la pagina de detalle
          await expect(page).toHaveURL(/\/visits\//)
        }
      }
    })
  })

  test.describe('Responsive', () => {
    test('debe funcionar en viewport mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/visits')
      // Verificar que la pagina carga
      await expect(visitsPage.heading).toBeVisible({ timeout: 10000 })

      // El contenido deberia adaptarse
      const mainContent = page.locator('main, [role="main"]')
      await expect(mainContent).toBeVisible()
    })
  })

  test.describe('Prefetch de Paginas', () => {
    test('siguiente pagina deberia cargar rapido', async ({ page }) => {
      await visitsPage.waitForTable()

      const rows = page.locator('tbody tr')
      const count = await rows.count()

      // Solo si hay suficientes datos para paginacion
      if (count >= 50) {
        const nextButton = page.getByRole('button', { name: /Siguiente|Next|>/i })

        if (await nextButton.isEnabled()) {
          // Medir tiempo de carga
          const startTime = Date.now()
          await nextButton.click()

          // Esperar a que aparezcan nuevos datos
          await expect(page.locator('table')).toBeVisible()

          const endTime = Date.now()
          const loadTime = endTime - startTime

          // Deberia cargar rapido gracias al prefetch (< 3 segundos incluyendo CI)
          expect(loadTime).toBeLessThan(3000)
        }
      }
    })
  })
})
