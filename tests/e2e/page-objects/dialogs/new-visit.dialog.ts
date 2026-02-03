import { expect, type Page } from '@playwright/test'

/**
 * Page Object para el dialog de Nueva Visita.
 */
export class NewVisitDialog {
  private readonly dialog = this.page.getByRole('dialog')

  constructor(private readonly page: Page) {}

  get dateField() {
    return this.dialog
      .getByLabel(/Fecha/i)
      .or(this.dialog.locator('input[type="date"]'))
  }

  get submitButton() {
    return this.dialog.getByRole('button', { name: /crear|guardar/i })
  }

  get cancelButton() {
    return this.dialog.getByRole('button', { name: /cancelar/i })
  }

  async expectVisible() {
    await expect(this.dialog).toBeVisible()
  }

  async close() {
    await this.page.keyboard.press('Escape')
    await expect(this.dialog).not.toBeVisible()
  }
}
