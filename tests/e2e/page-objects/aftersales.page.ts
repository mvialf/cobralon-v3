import { expect, type Page } from '@playwright/test'
import { BasePage } from './base.page'

export class AftersalesPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async navigate() {
    await this.goto('/aftersales', 'Postventas')
  }

  async openNewCaseDialog() {
    await this.page.getByRole('button', { name: /nuevo caso/i }).click()
    await expect(this.dialog).toBeVisible()
  }

  get searchInput() {
    return this.page.getByPlaceholder(/buscar por proyecto, cliente o descripción/i)
  }

  async searchAftersale(term: string) {
    await this.searchInput.fill(term)
    // Búsqueda client-side, esperar re-render breve
    await this.page.waitForResponse(
      (r) => r.url().includes('/api/') && r.request().method() === 'GET'
    ).catch(() => {
      // Client-side filter, no API call
    })
  }

  get dialog() {
    return this.page.getByRole('dialog')
  }

  get firstRow() {
    return this.page.locator('table tbody tr').first()
  }

  async openFirstRowActions() {
    const actionsButton = this.firstRow.getByRole('button').first()
    await actionsButton.click()
  }
}
