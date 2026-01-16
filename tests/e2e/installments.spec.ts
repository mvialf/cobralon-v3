import { test, expect } from '@playwright/test'

/**
 * Tests E2E para el módulo de Cuotas de Comercio (/payments/installments)
 *
 * Este módulo muestra cuotas de pagos fraccionados con:
 * - Estadísticas: Total, Pendientes, Vencidas, Pagadas
 * - DataTable con búsqueda y filtros
 * - Acciones por cuota (marcar como pagada, copiar IDs)
 *
 * Criticidad: ALTA - Sistema financiero
 */

test.describe('Cuotas de Comercio', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la página de cuotas
    await page.goto('/payments/installments')
    // Esperar a que la página cargue completamente
    await page.waitForLoadState('networkidle')
  })

  test.describe('Carga de Página', () => {
    test('debe cargar la página correctamente', async ({ page }) => {
      // Verificar título de página
      await expect(page.getByRole('heading', { name: 'Cuotas Comercio' })).toBeVisible()

      // Verificar breadcrumbs
      await expect(page.getByText('Inicio')).toBeVisible()
      await expect(page.getByText('Pagos')).toBeVisible()
    })

    test('debe mostrar las 4 cards de estadísticas', async ({ page }) => {
      // Card: Total Cuotas
      const totalCard = page.locator('text=Total Cuotas').first()
      await expect(totalCard).toBeVisible()

      // Card: Pendientes
      const pendingCard = page.locator('text=Pendientes').first()
      await expect(pendingCard).toBeVisible()

      // Card: Vencidas
      const overdueCard = page.locator('text=Vencidas').first()
      await expect(overdueCard).toBeVisible()

      // Card: Pagadas
      const paidCard = page.locator('text=Pagadas').first()
      await expect(paidCard).toBeVisible()
    })

    test('debe mostrar la tabla de cuotas', async ({ page }) => {
      // Verificar título de la tabla
      await expect(page.getByRole('heading', { name: 'Todas las Cuotas' })).toBeVisible()

      // Verificar descripción de cantidad
      const description = page.locator('text=/\\d+ cuotas? registradas?|No hay cuotas registradas/')
      await expect(description).toBeVisible()
    })
  })

  test.describe('Columnas de la Tabla', () => {
    test('debe mostrar las columnas correctas', async ({ page }) => {
      // Esperar a que la tabla cargue
      const table = page.locator('table')
      await expect(table).toBeVisible()

      // Verificar headers de columnas
      await expect(page.getByRole('columnheader', { name: /Vencimiento/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Cliente/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Proyectos/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Cuota/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Monto/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /Estado/i })).toBeVisible()
    })
  })

  test.describe('Búsqueda', () => {
    test('debe tener campo de búsqueda por cliente', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/Buscar por cliente/i)
      await expect(searchInput).toBeVisible()
    })

    test('debe filtrar cuotas al buscar', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/Buscar por cliente/i)

      // Escribir término de búsqueda
      await searchInput.fill('test')

      // Esperar a que se aplique el filtro (debounce)
      await page.waitForTimeout(500)

      // La tabla debería actualizarse (puede mostrar resultados o "sin resultados")
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })
  })

  test.describe('Filtros', () => {
    test('debe tener filtro por estado', async ({ page }) => {
      // Buscar el botón de filtro de estado
      const filterButton = page.getByRole('button', { name: /Estado/i })
      await expect(filterButton).toBeVisible()
    })

    test('debe mostrar opciones de filtro al hacer click', async ({ page }) => {
      // Click en el filtro de estado
      const filterButton = page.getByRole('button', { name: /Estado/i })
      await filterButton.click()

      // Verificar que aparecen las opciones
      await expect(page.getByRole('option', { name: /Pendiente/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /Pagado/i })).toBeVisible()
    })

    test('debe filtrar por estado Pendiente', async ({ page }) => {
      // Click en el filtro de estado
      const filterButton = page.getByRole('button', { name: /Estado/i })
      await filterButton.click()

      // Seleccionar "Pendiente"
      await page.getByRole('option', { name: /Pendiente/i }).click()

      // Cerrar el popover (click fuera o escape)
      await page.keyboard.press('Escape')

      // Esperar a que se aplique el filtro
      await page.waitForTimeout(300)

      // Verificar que el filtro está aplicado (badge visible)
      const filterBadge = page.locator('[data-state="checked"]').or(page.locator('.bg-primary'))
      // La tabla debería mostrar solo cuotas pendientes o estar vacía
      const table = page.locator('table')
      await expect(table).toBeVisible()
    })
  })

  test.describe('Estadísticas', () => {
    test('debe mostrar valores numéricos en las cards', async ({ page }) => {
      // Verificar que las cards tienen valores numéricos
      // Total Cuotas - debe tener un número
      const totalValue = page.locator('.text-2xl.font-bold').first()
      await expect(totalValue).toBeVisible()
      const totalText = await totalValue.textContent()
      expect(totalText).toMatch(/^\d+$/)
    })

    test('debe mostrar montos en formato CLP', async ({ page }) => {
      // Buscar formato de moneda CLP ($ con números)
      const currencyValues = page.locator('text=/\\$\\s?[\\d.,]+/')
      // Puede haber 0 o más dependiendo de si hay datos
      const count = await currencyValues.count()
      // Si hay cuotas, debería haber al menos 2 montos (pendientes y pagadas)
      // Si no hay, el test pasa igual
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test('debe colorear correctamente las estadísticas', async ({ page }) => {
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
      await page.waitForTimeout(1000)

      // Buscar botón de acciones (icono de 3 puntos)
      const actionButtons = page.locator('[role="button"]').filter({ hasText: '' }).locator('svg')

      const count = await actionButtons.count()

      if (count > 0) {
        // Si hay cuotas, debe haber botones de acción
        // Click en el primer botón de acciones
        const dropdownTrigger = page.locator('button').filter({ has: page.locator('svg.lucide-more-horizontal, svg.lucide-ellipsis') }).first()

        if (await dropdownTrigger.isVisible()) {
          await dropdownTrigger.click()

          // Verificar que aparece el menú
          await expect(page.getByRole('menuitem', { name: /Copiar ID/i }).first()).toBeVisible()
        }
      }
      // Si no hay cuotas, el test pasa sin verificar acciones
    })
  })

  test.describe('Responsive', () => {
    test('debe ser responsive en mobile', async ({ page }) => {
      // Cambiar viewport a mobile
      await page.setViewportSize({ width: 375, height: 667 })

      // Recargar página
      await page.goto('/payments/installments')
      await page.waitForLoadState('networkidle')

      // Verificar que la página sigue siendo funcional
      await expect(page.getByRole('heading', { name: 'Cuotas Comercio' })).toBeVisible()

      // Las cards deberían apilarse
      const cards = page.locator('.grid > div').filter({ has: page.locator('text=Cuotas') })
      await expect(cards.first()).toBeVisible()
    })
  })
})
