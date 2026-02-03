import { type Page } from '@playwright/test'
import { BasePage } from './base.page'

export class PaymentsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async navigate() {
    await this.goto('/payments', /pagos/i)
  }

  /** Abre el dropdown de "Nuevo Pago" */
  async openNewPaymentDropdown() {
    await this.page.getByRole('button', { name: /nuevo pago/i }).click()
  }

  /** Abre el dialog de Pago a Proyecto (1:1) */
  async openPaymentToProjectDialog() {
    await this.openNewPaymentDropdown()
    await this.page.getByRole('menuitem', { name: /pago a proyecto \(1:1\)/i }).click()
  }

  /** Abre el dialog de Pago a Cliente (1:N) */
  async openPaymentToCustomerDialog() {
    await this.openNewPaymentDropdown()
    await this.page.getByRole('menuitem', { name: /pago a cliente \(1:N\)/i }).click()
  }

  get searchInput() {
    return this.page.getByPlaceholder(/buscar por cliente/i)
  }

  get dialog() {
    return this.page.getByRole('dialog')
  }
}
