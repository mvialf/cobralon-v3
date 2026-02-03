import { expect, type Page } from '@playwright/test'

/**
 * Page Object para el dialog de Nuevo Cliente.
 */
export class NewCustomerDialog {
  private readonly dialog = this.page.getByRole('dialog')

  constructor(private readonly page: Page) {}

  get heading() {
    return this.dialog.getByRole('heading', { name: /nuevo cliente/i })
  }

  get nameInput() {
    return this.dialog.getByLabel(/nombre/i)
  }

  get phoneInput() {
    return this.dialog.getByLabel(/teléfono/i)
  }

  get emailInput() {
    return this.dialog.getByLabel(/correo/i)
  }

  get submitButton() {
    return this.dialog.getByRole('button', { name: /crear cliente/i })
  }

  /** Llena el formulario con los datos proporcionados */
  async fill(data: { name: string; phone: string; email?: string }) {
    await this.nameInput.fill(data.name)
    await this.phoneInput.fill(data.phone)
    if (data.email) {
      await this.emailInput.fill(data.email)
    }
  }

  /** Envía el formulario y espera a que el dialog se cierre */
  async submit() {
    const mutationPromise = this.page.waitForResponse(
      (r) =>
        r.url().includes('/api/customers') &&
        r.request().method() === 'POST'
    )
    await this.submitButton.click()
    await mutationPromise
    await expect(this.dialog).not.toBeVisible({ timeout: 10000 })
  }

  async expectVisible() {
    await expect(this.dialog).toBeVisible()
    await expect(this.heading).toBeVisible()
  }
}
