import { expect, type Page } from '@playwright/test'
import { BasePage } from './base.page'

export class PaymentMethodsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async navigate() {
    await this.goto('/settings/payments', 'Métodos de Pago')
  }

  get heading() {
    return this.page.getByRole('heading', { name: 'Métodos de Pago' })
  }

  async openNewMethodDialog() {
    await this.page.getByRole('button', { name: /Nuevo Método/i }).click()
    await expect(this.page.getByRole('dialog')).toBeVisible()
  }

  get dialog() {
    return this.page.getByRole('dialog')
  }

  get rows() {
    return this.page.locator('tbody tr')
  }
}
