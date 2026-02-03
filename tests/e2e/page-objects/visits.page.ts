import { expect, type Page } from '@playwright/test'
import { BasePage } from './base.page'

export class VisitsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async navigate() {
    await this.goto('/visits', 'Visitas')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Visitas' })
  }

  get searchInput() {
    return this.page.getByPlaceholder(/Buscar/i)
  }

  async searchVisit(term: string) {
    await this.searchInput.fill(term)
    await this.waitForQuery('/api/visits')
  }

  get newVisitButton() {
    return this.page
      .getByRole('button', { name: /Nueva Visita|Nuevo/i })
      .or(this.page.locator('[data-testid="new-visit-button"]'))
      .or(this.page.getByRole('button').filter({ has: this.page.locator('svg.lucide-plus') }))
  }

  async openNewVisitDialog() {
    await this.newVisitButton.click()
    await expect(this.page.getByRole('dialog')).toBeVisible()
  }

  get statusFilterButton() {
    return this.page
      .getByRole('button', { name: /Estado/i })
      .or(this.page.getByRole('combobox', { name: /Estado/i }))
      .or(this.page.locator('[data-testid="status-filter"]'))
  }

  get dialog() {
    return this.page.getByRole('dialog')
  }
}
