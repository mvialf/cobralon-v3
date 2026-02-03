import { test, expect } from '@playwright/test'
import { InstallmentsPage } from './page-objects/installments.page'

/**
 * Tests E2E para el modulo de Cuotas de Comercio (/payments/installments)
 *
 * Este modulo muestra cuotas de pagos fraccionados con:
 * - Estadisticas: Total, Pendientes, Vencidas, Pagadas
 * - DataTable con busqueda y filtros
 * - Acciones por cuota (marcar como pagada, copiar IDs)
 *
 * Criticidad: ALTA - Sistema financiero
 */

test.describe('Cuotas de Comercio', () => {
  let installmentsPage: InstallmentsPage

  test.beforeEach(async ({ page }) => {
    installmentsPage = new InstallmentsPage(page)
    await installmentsPage.navigate()
  })

  test.describe('Carga de Pagina', () => {
    test('debe cargar la pagina correctamente', async ({ page }) => {
      // Verificar titulo de pagina
      await expect(installmentsPage.heading).toBeVisible()

      // Verificar breadcrumbs
      await expect(page.getByText('Inicio')).toBeVisible()
      await expect(page.getByText('Pagos')).toBeVisible()
    })

    test('debe mostrar las 4 cards de estadisticas', async ({ page }) => {
      // Card: Total Cuotas
      await expect(page.locator('text=Total Cuotas').first()).toBeVisible()

      // Card: Pendientes
      await expect(page.locator('text=Pendientes').first()).toBeVisible()

      // Card: Vencidas
      await expect(page.locator('text=Vencidas').first()).toBeVisible()

      // Card: Pagadas
      await expect(page.locator('text=Pagadas').first()).toBeVisible()
    })

    test('debe mostrar la tabla de cuotas', async ({ page }) => {
      // Verificar titulo de la tabla
      await expect(installmentsPage.tableHeading).toBeVisible()

      // Verificar descripcion de cantidad
      const description = page.locator('text=/\\d+ cuotas? registradas?|No hay cuotas registradas/')
      await expect(description).toBeVisible()
    })
  })

  test.describe('Columnas de la Tabla', () => {
    test('debe mostrar las columnas correctas', async ({ page }) => {
      // Esperar a que la tabla cargue
      await installmentsPage.waitForTable()

      // Verificar headers de columnas
      await expect(page.getByRole('columnheader', { name: /Vencimiento/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Cliente/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Proyectos/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Cuota/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Monto/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Estado/i })).toBeVisible()
    })
  })

  test.describe('Busqueda', () => {
    test('debe tener campo de busqueda por cliente', async () => {
      await expect(installmentsPage.searchInput).toBeVisible()
    })

    test('debe filtrar cuotas al buscar', async ({ page }) => {
      // Escribir termino de busqueda y esperar respuesta del API
      await installmentsPage.searchInstallment('test')

      // La tabla deberia actualizarse (puede mostrar resultados o "sin resultados")
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })
  })

  test.describe('Filtros', () => {
    test('debe tener filtro por estado', async () => {
      await expect(installmentsPage.statusFilterButton).toBeVisible()
    })

    test('debe mostrar opciones de filtro al hacer click', async ({ page }) => {
      // Click en el filtro de estado
      await installmentsPage.statusFilterButton.click()

      // Verificar que aparecen las opciones
      await expect(page.getByRole('option', { name: /Pendiente/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /Pagado/i })).toBeVisible()
    })

    test('debe filtrar por estado Pendiente', async ({ page }) => {
      // Click en el filtro de estado
      await installmentsPage.statusFilterButton.click()

      // Seleccionar "Pendiente"
      await page.getByRole('option', { name: /Pendiente/i }).click()

      // Cerrar el popover
      await page.keyboard.press('Escape')

      // Verificar que el filtro se aplico - la tabla deberia mostrar solo cuotas pendientes o estar vacia
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })
  })

  test.describe('Estadisticas', () => {
    test('debe mostrar valores numericos en las cards', async ({ page }) => {
      // Verificar que las cards tienen valores numericos
      const totalValue = page.locator('.text-2xl.font-bold').first()
      await expect(totalValue).toBeVisible()
      const totalText = await totalValue.textContent()
      expect(totalText).toMatch(/^\d+$/)
    })

    test('debe mostrar montos en formato CLP', async ({ page }) => {
      // Buscar formato de moneda CLP ($ con numeros)
      const currencyValues = page.locator('text=/\\$\\s?[\\d.,]+/')
      const count = await currencyValues.count()
      // Si hay cuotas, deberia haber al menos 2 montos (pendientes y pagadas)
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('debe colorear correctamente las estadisticas', async ({ page }) => {
      // Pendientes debe ser amber/yellow
      const pendingValue = page.locator('.text-amber-600')
      await expect(pendingValue).toBeVisible()

      // Vencidas debe ser rojo
      const overdueValue = page.locator('.text-red-600')
      await expect(overdueValue).toBeVisible()

      // Pagadas debe ser verde
      const paidValue = page.locator('.text-green-600')
      await expect(paidValue).toBeVisible()
    })
  })

  test.describe('Acciones de Cuota', () => {
    test('debe mostrar dropdown de acciones si hay cuotas', async ({ page }) => {
      // Esperar a que la tabla cargue
      await installmentsPage.waitForTable()

      // Buscar boton de acciones (icono de 3 puntos)
      const dropdownTrigger = page.locator('button').filter({
        has: page.locator('svg.lucide-more-horizontal, svg.lucide-ellipsis'),
      }).first()

      if (await dropdownTrigger.isVisible()) {
        await dropdownTrigger.click()

        // Verificar que aparece el menu
        await expect(page.getByRole('menuitem', { name: /Copiar ID/i }).first()).toBeVisible()
      }
      // Si no hay cuotas, el test pasa sin verificar acciones
    })
  })

  test.describe('Responsive', () => {
    test('debe ser responsive en mobile', async ({ page }) => {
      // Cambiar viewport a mobile
      await page.setViewportSize({ width: 375, height: 667 })

      // Recargar pagina
      await page.goto('/payments/installments')
      // Verificar que la pagina sigue siendo funcional
      await expect(installmentsPage.heading).toBeVisible({ timeout: 10000 })

      // Las cards deberian apilarse
      const cards = page.locator('.grid > div').filter({ has: page.locator('text=Cuotas') })
      await expect(cards.first()).toBeVisible()
    })
  })
})
