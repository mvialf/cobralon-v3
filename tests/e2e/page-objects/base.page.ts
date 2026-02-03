import { expect, type Page, type Response } from '@playwright/test'

/**
 * Clase base para Page Objects de E2E.
 *
 * Provee métodos compartidos para navegación, interacción con combobox,
 * espera de mutaciones y verificación de diálogos.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /** Navega a una ruta y espera que un heading H1 específico sea visible */
  async goto(path: string, headingName: string | RegExp) {
    await this.page.goto(path)
    await expect(
      this.page.getByRole('heading', { name: headingName, level: 1 })
    ).toBeVisible({ timeout: 15000 })
  }

  /**
   * Selecciona una opción en un combobox con búsqueda.
   * Hace click, escribe el texto de búsqueda, espera las opciones y selecciona la primera.
   */
  async selectComboboxOption(
    combobox: ReturnType<Page['getByRole']>,
    searchText: string
  ) {
    await combobox.click()
    await this.page.keyboard.type(searchText)

    const options = this.page.locator('[role="option"]')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
    await options.first().click()
  }

  /**
   * Selecciona la primera opción de un combobox sin buscar.
   * Hace click y selecciona la primera opción visible.
   */
  async selectFirstComboboxOption(combobox: ReturnType<Page['getByRole']>) {
    await combobox.click()
    const options = this.page.locator('[role="option"]')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
    await options.first().click()
  }

  /** Espera a que un dialog desaparezca (útil después de submit) */
  async expectDialogClosed(timeout = 10000) {
    await expect(this.page.getByRole('dialog')).not.toBeVisible({ timeout })
  }

  /**
   * Espera una respuesta de mutación (POST/PUT/PATCH/DELETE) que matchee un patrón de URL.
   * Retorna la Response para inspección adicional.
   */
  async waitForMutation(urlPattern: string | RegExp): Promise<Response> {
    return this.page.waitForResponse(
      (r) =>
        (typeof urlPattern === 'string'
          ? r.url().includes(urlPattern)
          : urlPattern.test(r.url())) &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.request().method())
    )
  }

  /**
   * Espera una respuesta GET que matchee un patrón de URL.
   * Útil para esperar que una búsqueda con debounce se complete.
   */
  async waitForQuery(urlPattern: string | RegExp): Promise<Response> {
    return this.page.waitForResponse(
      (r) =>
        (typeof urlPattern === 'string'
          ? r.url().includes(urlPattern)
          : urlPattern.test(r.url())) && r.request().method() === 'GET'
    )
  }

  /** Espera a que la tabla sea visible */
  async waitForTable(timeout = 15000) {
    await expect(this.page.locator('table')).toBeVisible({ timeout })
  }

  /** Busca en la tabla y espera la respuesta del API */
  async searchInTable(
    searchTerm: string,
    placeholder: string | RegExp = /buscar/i,
    apiUrlPattern?: string | RegExp
  ) {
    const searchInput = this.page.getByPlaceholder(placeholder)
    await searchInput.fill(searchTerm)

    if (apiUrlPattern) {
      await this.waitForQuery(apiUrlPattern)
    } else {
      // Fallback: esperar a que la tabla se actualice
      await this.page.waitForResponse(
        (r) => r.url().includes('/api/') && r.request().method() === 'GET'
      )
    }
  }

  /** Obtiene el número de filas visibles en la tabla */
  async getTableRowCount(): Promise<number> {
    return this.page.locator('table tbody tr').count()
  }
}
