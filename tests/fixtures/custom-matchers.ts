/**
 * Custom Playwright Matchers
 *
 * Matchers personalizados para simplificar tests E2E con patrones comunes.
 *
 * @example
 * ```typescript
 * import { test } from './fixtures/custom-matchers'
 *
 * test('mi test', async ({ page }) => {
 *   await expect(page.getByText('Loading...')).toBeVisibleWithLoading()
 * })
 * ```
 */

import { expect as baseExpect, Locator } from '@playwright/test'

/**
 * Espera a que un elemento sea visible con timeout generoso para loading states.
 *
 * Útil para elementos que dependen de API calls o conditional rendering.
 * Default timeout: 15 segundos (vs 5s default de Playwright)
 *
 * @param locator - Locator del elemento a esperar
 * @param timeout - Timeout opcional (default: 15000ms)
 */
async function toBeVisibleWithLoading(
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> {
  await baseExpect(locator).toBeVisible({
    timeout: options?.timeout ?? 15000,
  })
}

/**
 * Espera a que un elemento desaparezca con timeout generoso.
 *
 * Útil para verificar que dialogs/modals se cierran después de submit.
 *
 * @param locator - Locator del elemento que debe desaparecer
 * @param timeout - Timeout opcional (default: 10000ms)
 */
async function toBeHiddenAfterSubmit(
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> {
  await baseExpect(locator).not.toBeVisible({
    timeout: options?.timeout ?? 10000,
  })
}

/**
 * Verifica que un formulario NO se haya submitido (dialog permanece abierto).
 *
 * Útil para tests de validación donde esperamos que el form NO se submita.
 *
 * @param locator - Locator del dialog/form
 * @param waitMs - Tiempo a esperar antes de verificar (default: 1000ms)
 */
async function toStillBeVisible(locator: Locator, options?: { waitMs?: number }): Promise<void> {
  const waitMs = options?.waitMs ?? 1000
  await locator.page().waitForTimeout(waitMs)
  await baseExpect(locator).toBeVisible()
}

// Exportar matchers para uso en tests
export const customMatchers = {
  toBeVisibleWithLoading,
  toBeHiddenAfterSubmit,
  toStillBeVisible,
}

// Re-exportar expect base para uso directo
export { baseExpect as expect }
