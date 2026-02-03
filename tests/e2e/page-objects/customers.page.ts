import { type Page } from '@playwright/test'
import { BasePage } from './base.page'

export class CustomersPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async navigate() {
    await this.goto('/customer', 'Clientes')
  }

  async openNewCustomerDialog() {
    await this.page.getByRole('button', { name: /nuevo cliente/i }).click()
  }

  get searchInput() {
    return this.page.getByPlaceholder(/buscar cliente.../i)
  }

  async searchCustomer(name: string) {
    await this.searchInput.fill(name)
    // Esperar respuesta del API con debounce
    await this.waitForQuery('/api/customers')
  }

  get dialog() {
    return this.page.getByRole('dialog')
  }

  get importLink() {
    return this.page.getByRole('link', { name: /importar/i })
  }
}
