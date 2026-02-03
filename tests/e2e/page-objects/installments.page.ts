import { type Page } from '@playwright/test'
import { BasePage } from './base.page'

export class InstallmentsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async navigate() {
    await this.goto('/payments/installments', 'Cuotas Comercio')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Cuotas Comercio' })
  }

  get searchInput() {
    return this.page.getByPlaceholder(/Buscar por cliente/i)
  }

  async searchInstallment(term: string) {
    await this.searchInput.fill(term)
    await this.waitForQuery('/api/')
  }

  get statusFilterButton() {
    return this.page.getByRole('button', { name: /Estado/i })
  }

  get tableHeading() {
    return this.page.getByRole('heading', { name: 'Todas las Cuotas' })
  }
}
