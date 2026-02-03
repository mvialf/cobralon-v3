import { expect, type Page } from '@playwright/test'
import { BasePage } from './base.page'

export class CalendarPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async navigate() {
    await this.page.goto('/calendar')
    await expect(
      this.page.getByRole('heading', { name: /calendario/i, level: 1 })
    ).toBeVisible({ timeout: 10000 })
    // Esperar que los días de la semana se rendericen
    await expect(this.page.getByText('Lun')).toBeVisible({ timeout: 10000 })
  }

  get todayButton() {
    return this.page.getByRole('button', { name: 'Hoy' })
  }

  get dateRangeText() {
    return this.page.locator('.text-xl.font-semibold.capitalize')
  }

  get viewSelector() {
    return this.page.getByRole('combobox').filter({ hasText: /semana/i })
  }

  get newEventButton() {
    return this.page.getByRole('button', { name: /nuevo evento/i })
  }

  /** Busca el primer evento de proyecto (prefijo "P -") */
  get firstProjectEvent() {
    return this.page
      .locator('button')
      .filter({ hasText: /^P - \d+/ })
      .first()
  }

  async navigateNextWeek() {
    const nextButton = this.todayButton.locator('xpath=following-sibling::button[1]')
    await nextButton.click()
  }

  async changeView(view: 'mes' | 'agenda') {
    await this.viewSelector.click()
    await this.page.getByRole('option', { name: new RegExp(view, 'i') }).click()
  }

  get dialog() {
    return this.page.getByRole('dialog')
  }
}
