import { expect, type Page } from '@playwright/test'

/**
 * Page Object para el dialog de Pago a Proyecto (1:1).
 */
export class PaymentToProjectDialog {
  private readonly dialog = this.page.getByRole('dialog')

  constructor(private readonly page: Page) {}

  get heading() {
    return this.dialog.getByRole('heading', { name: /pago a proyecto/i })
  }

  get projectCombobox() {
    return this.dialog.getByRole('combobox', { name: /proyecto/i })
  }

  get amountInput() {
    return this.dialog.getByLabel(/monto/i)
  }

  get paymentMethodCombobox() {
    return this.dialog.getByRole('combobox', { name: /método de pago/i })
  }

  get referenceInput() {
    return this.dialog.getByLabel(/referencia/i)
  }

  get notesTextarea() {
    return this.dialog.getByLabel(/notas/i)
  }

  get submitButton() {
    return this.dialog.getByRole('button', { name: /registrar pago/i })
  }

  /** Selecciona un proyecto buscando por número */
  async selectProject(projectNumber: string) {
    await this.projectCombobox.click()
    await this.page.keyboard.type(projectNumber)
    const options = this.page.locator('[role="option"]')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
    await options.first().click()
  }

  /** Selecciona el primer método de pago disponible */
  async selectFirstPaymentMethod() {
    await this.paymentMethodCombobox.click()
    const options = this.page.locator('[role="option"]')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
    await options.first().click()
  }

  /** Llena el formulario completo de pago */
  async fill(data: {
    projectNumber: string
    amount: number
    reference?: string
    notes?: string
  }) {
    await this.selectProject(data.projectNumber)
    await this.amountInput.fill(data.amount.toString())
    await this.selectFirstPaymentMethod()

    if (data.reference) {
      await this.referenceInput.fill(data.reference)
    }

    if (data.notes && (await this.notesTextarea.isVisible())) {
      await this.notesTextarea.fill(data.notes)
    }
  }

  /** Envía el formulario y espera respuesta del API */
  async submit() {
    const mutationPromise = this.page.waitForResponse(
      (r) =>
        r.url().includes('/api/payments') &&
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
