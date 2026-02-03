import { expect, type Page } from '@playwright/test'

/**
 * Page Object para el dialog de Nuevo Caso de Postventa.
 */
export class NewAftersaleDialog {
  private readonly dialog = this.page.getByRole('dialog')

  constructor(private readonly page: Page) {}

  get heading() {
    return this.dialog.getByRole('heading', { name: /nuevo caso de postventa/i })
  }

  get projectCombobox() {
    return this.dialog.getByRole('combobox').first()
  }

  get statusCombobox() {
    return this.dialog.getByLabel(/estado/i)
  }

  get phoneInput() {
    return this.dialog.getByLabel(/teléfono/i)
  }

  get dateInput() {
    return this.dialog.getByLabel(/fecha de reporte/i)
  }

  get descriptionInput() {
    return this.dialog.getByLabel(/descripción del problema/i)
  }

  get cancelButton() {
    return this.dialog.getByRole('button', { name: /cancelar/i })
  }

  get submitButton() {
    return this.dialog.getByRole('button', { name: /crear caso/i })
  }

  /** Selecciona el primer proyecto finalizado disponible */
  async selectFirstProject() {
    await this.projectCombobox.click()
    // El combobox requiere al menos 2 caracteres para buscar
    await this.page.keyboard.type('15')
    const options = this.page.getByRole('option')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
    await options.first().click()
  }

  /** Llena el formulario completo */
  async fill(data: { description?: string }) {
    await this.selectFirstProject()
    if (data.description) {
      await this.descriptionInput.fill(data.description)
    }
  }

  /** Envía el formulario y espera a que el dialog se cierre */
  async submit() {
    const mutationPromise = this.page.waitForResponse(
      (r) =>
        r.url().includes('/api/aftersales') &&
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
