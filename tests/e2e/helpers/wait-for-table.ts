/**
 * Shared Test Utilities for DataTable Operations
 *
 * Funciones helper para tests E2E que involucran DataTable components.
 *
 * @example
 * ```typescript
 * import { waitForTableReady } from './helpers/wait-for-table'
 *
 * test('tabla carga correctamente', async ({ page }) => {
 *   await page.goto('/customers')
 *   await waitForTableReady(page)
 *   // Tabla está lista para interactuar
 * })
 * ```
 */

import { expect, Page } from '@playwright/test'

/**
 * Espera a que la DataTable esté completamente cargada y lista para interactuar.
 *
 * Verifica que el elemento <table> sea visible.
 *
 * @param page - Página de Playwright
 * @param timeout - Timeout opcional (default: 15000ms)
 */
export async function waitForTableReady(page: Page, timeout = 15000): Promise<void> {
  await expect(page.locator('table')).toBeVisible({ timeout })
}

/**
 * Espera a que el input de búsqueda de la tabla esté disponible.
 *
 * El search input solo se renderiza cuando DataTable tiene datos,
 * por lo que requiere esperar a que termine el loading state.
 *
 * @param page - Página de Playwright
 * @param placeholder - Placeholder del input (regex o string)
 * @param timeout - Timeout opcional (default: 15000ms)
 */
export async function waitForTableSearch(
  page: Page,
  placeholder: string | RegExp = /buscar/i,
  timeout = 15000
): Promise<void> {
  await expect(page.getByPlaceholder(placeholder)).toBeVisible({ timeout })
}

/**
 * Ejecuta una búsqueda en la tabla y espera la respuesta del API.
 *
 * En vez de usar waitForTimeout para el debounce, espera la respuesta
 * real del servidor.
 *
 * @param page - Página de Playwright
 * @param searchTerm - Término a buscar
 * @param apiUrlPattern - Patrón de URL del API a esperar (default: cualquier GET a /api/)
 */
export async function searchInTable(
  page: Page,
  searchTerm: string,
  apiUrlPattern?: string | RegExp
): Promise<void> {
  const searchInput = page.getByPlaceholder(/buscar/i)
  await searchInput.fill(searchTerm)

  // Esperar la respuesta del API (reemplaza waitForTimeout del debounce)
  await page.waitForResponse((r) => {
    const urlMatch = apiUrlPattern
      ? typeof apiUrlPattern === 'string'
        ? r.url().includes(apiUrlPattern)
        : apiUrlPattern.test(r.url())
      : r.url().includes('/api/')
    return urlMatch && r.request().method() === 'GET'
  })
}

/**
 * Verifica que una fila existe en la tabla con el texto especificado.
 *
 * @param page - Página de Playwright
 * @param cellText - Texto a buscar en las celdas
 * @param exact - Si la búsqueda debe ser exacta (default: true)
 */
export async function expectRowInTable(page: Page, cellText: string, exact = true): Promise<void> {
  await expect(page.getByRole('cell', { name: cellText, exact })).toBeVisible()
}

/**
 * Obtiene el número de filas visibles en la tabla (excluyendo header).
 *
 * @param page - Página de Playwright
 * @returns Número de filas en tbody
 */
export async function getTableRowCount(page: Page): Promise<number> {
  const rows = page.locator('table tbody tr')
  return await rows.count()
}

/**
 * Verifica que la tabla muestra el mensaje de "sin resultados".
 *
 * @param page - Página de Playwright
 * @param message - Mensaje esperado (default: regex "no se encontraron")
 */
export async function expectNoResults(
  page: Page,
  message: string | RegExp = /no se encontraron resultados/i
): Promise<void> {
  await expect(page.getByText(message)).toBeVisible()
}

/**
 * Abre el dropdown de acciones de la primera fila de la tabla.
 *
 * @param page - Página de Playwright
 */
export async function openFirstRowActions(page: Page): Promise<void> {
  const firstRow = page.locator('table tbody tr').first()
  const actionsButton = firstRow.getByRole('button').first()
  await actionsButton.click()
}
