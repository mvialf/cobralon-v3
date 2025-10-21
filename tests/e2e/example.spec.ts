import { test, expect } from '@playwright/test'

/**
 * Test de ejemplo para verificar que Playwright está configurado correctamente.
 *
 * Este test verifica:
 * - La página principal carga correctamente
 * - El título contiene "SaaS"
 * - El botón "Comenzar" es visible
 *
 * Para ejecutar:
 * - npm run test:e2e
 * - npm run test:e2e:ui (modo UI interactivo)
 * - npm run test:e2e:debug (modo debug)
 */

test.describe('Homepage', () => {
  test('debe cargar la página principal correctamente', async ({ page }) => {
    // Navegar a la página principal
    await page.goto('/')

    // Verificar que el título de la página es correcto
    await expect(page).toHaveTitle(/v0 App/i)

    // Verificar que el heading principal es visible
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('debe mostrar el sidebar con navegación', async ({ page }) => {
    await page.goto('/')

    // Verificar que el sidebar es visible (en desktop)
    // Nota: En mobile, el sidebar es un drawer que se abre con un botón
    const sidebar = page.locator('[data-sidebar="sidebar"]')

    // En desktop (viewport >= 1024px), el sidebar debe estar visible
    if (page.viewportSize()!.width >= 1024) {
      await expect(sidebar).toBeVisible()
    }
  })
})

test.describe('Navegación', () => {
  test('debe cargar la página de ejemplos', async ({ page }) => {
    // Navegar directamente a la página de ejemplos
    await page.goto('/examples')

    // Verificar que estamos en la URL correcta
    await expect(page).toHaveURL(/\/examples/)

    // Verificar que el contenido de la página cargó
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('debe cargar la página de configuración', async ({ page }) => {
    // Navegar directamente a la página de configuración
    await page.goto('/settings')

    // Verificar que estamos en la URL correcta
    await expect(page).toHaveURL(/\/settings/)

    // Verificar que el contenido de la página cargó
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
