import { expect, type Page } from '@playwright/test'

/**
 * Page Object para el dialog de Pago a Cliente (1:N) con distribución FIFO o manual.
 */
export class PaymentToCustomerDialog {
  private readonly dialog = this.page.getByRole('dialog')

  constructor(private readonly page: Page) {}

  get heading() {
    return this.dialog.getByRole('heading', { name: /registrar pago a cliente/i })
  }

  get customerCombobox() {
    return this.dialog.getByRole('combobox', { name: /cliente/i })
  }

  get amountInput() {
    return this.dialog.getByLabel(/monto total del pago/i)
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

  get fifoTab() {
    return this.dialog.getByRole('tab', { name: /fifo automático/i })
  }

  get manualTab() {
    return this.dialog.getByRole('tab', { name: /distribución manual/i })
  }

  get calculateFifoButton() {
    return this.dialog.getByRole('button', { name: /calcular distribución fifo/i })
  }

  get allocationTable() {
    return this.dialog.locator('table')
  }

  get clienteSeleccionadoText() {
    return this.dialog.getByText(/cliente seleccionado/i)
  }

  /** Selecciona un cliente buscando por nombre */
  async selectCustomer(searchText: string) {
    await this.customerCombobox.click()
    await this.page.keyboard.type(searchText)
    const options = this.page.locator('[role="option"]')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
    await options.first().click()
    // Esperar a que se carguen los proyectos del cliente
    await expect(this.clienteSeleccionadoText).toBeVisible({ timeout: 5000 })
  }

  /** Selecciona el primer método de pago disponible */
  async selectFirstPaymentMethod() {
    await this.paymentMethodCombobox.click()
    const options = this.page.locator('[role="option"]')
    await expect(options.first()).toBeVisible({ timeout: 5000 })
    await options.first().click()
  }

  /** Ejecuta distribución FIFO y espera tabla de allocations */
  async calculateFIFO() {
    await this.calculateFifoButton.click()
    await expect(this.allocationTable).toBeVisible({ timeout: 5000 })
  }

  /** Verifica que la validación de suma está correcta (texto de distribución OK) */
  async expectAllocationValid() {
    await expect(this.dialog.getByText(/total del pago/i)).toBeVisible()
    await expect(this.dialog.getByText(/total asignado/i)).toBeVisible()
  }

  /** Verifica que la validación muestra error (diferencia no resuelta) */
  async expectAllocationInvalid() {
    await expect(
      this.dialog.getByText(/falta asignar|sobrepasado/i)
    ).toBeVisible()
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
