/**
 * Lógica de negocio para cálculo de totales de proyecto
 *
 * Contiene funciones para calcular:
 * - Total de proyecto (Subtotal + IVA)
 * - Impuestos (IVA u otros)
 * - Validaciones de totales
 *
 * @module business-logic/totals
 */

import { FINANCIAL, getCurrencyConfig, getBalanceTolerance } from '../constants/financial-constants'

function validateNonNegativeAmount(amount: number, fieldName: string) {
  if (amount < 0) {
    throw new Error(`El ${fieldName} no puede ser negativo`)
  }
}

function validateTaxRate(taxRate: number) {
  if (taxRate < FINANCIAL.MIN_TAX_RATE || taxRate > FINANCIAL.MAX_TAX_RATE) {
    throw new Error(
      `La tasa de impuesto debe estar entre ${FINANCIAL.MIN_TAX_RATE}% y ${FINANCIAL.MAX_TAX_RATE}%`
    )
  }
}

/**
 * Calcula el total de un proyecto aplicando tasa de impuesto
 *
 * Fórmula:
 * ```
 * Tax = Subtotal × (TaxRate / 100)
 * Total = Subtotal + Tax
 * ```
 *
 * @param subtotal - Monto base del proyecto (sin impuestos)
 * @param taxRate - Porcentaje de impuesto (ej: 19 para IVA 19%)
 * @returns Total con impuestos aplicados
 *
 * @example IVA 19% (Chile)
 * ```ts
 * calculateProjectTotal(1000000, 19)
 * // Tax = 1,000,000 × 0.19 = 190,000
 * // Total = 1,000,000 + 190,000 = 1,190,000
 * ```
 *
 * @example Sin IVA
 * ```ts
 * calculateProjectTotal(500000, 0)
 * // Tax = 500,000 × 0 = 0
 * // Total = 500,000 + 0 = 500,000
 * ```
 *
 * @example IVA variable (Argentina 21%)
 * ```ts
 * calculateProjectTotal(2000000, 21)
 * // Tax = 2,000,000 × 0.21 = 420,000
 * // Total = 2,000,000 + 420,000 = 2,420,000
 * ```
 *
 * @see {@link docs/project/analysis/frontend-calculations.md#4} - Análisis exhaustivo
 */
export function calculateProjectTotal(
  subtotal: number,
  taxRate: number = FINANCIAL.DEFAULT_TAX_RATE,
  currency?: string
): number {
  validateNonNegativeAmount(subtotal, 'subtotal')
  validateTaxRate(taxRate)

  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  return currency ? roundForCurrency(total, currency) : total
}

/**
 * Redondea un monto según los decimales de la moneda
 *
 * CLP → 0 decimales (Math.round), USD/EUR → 2 decimales
 *
 * @param amount - Monto a redondear
 * @param currency - Código de moneda ISO 4217 (default: 'CLP')
 * @returns Monto redondeado según la moneda
 *
 * @example
 * ```ts
 * roundForCurrency(1378692.35, 'CLP') // => 1378692
 * roundForCurrency(99.999, 'USD')     // => 100.00
 * ```
 */
export function roundForCurrency(amount: number, currency: string = 'CLP'): number {
  const { decimals } = getCurrencyConfig(currency)
  const factor = Math.pow(10, decimals)
  return Math.round(amount * factor) / factor
}

/**
 * Calcula solo el monto del impuesto (sin sumarlo al subtotal)
 *
 * @param subtotal - Monto base
 * @param taxRate - Porcentaje de impuesto
 * @returns Monto del impuesto calculado
 *
 * @example
 * ```ts
 * calculateTax(1000000, 19)
 * // => 190,000
 * ```
 */
export function calculateTax(
  subtotal: number,
  taxRate: number = FINANCIAL.DEFAULT_TAX_RATE
): number {
  validateNonNegativeAmount(subtotal, 'subtotal')
  validateTaxRate(taxRate)

  return subtotal * (taxRate / 100)
}

/**
 * Valida que el total recibido coincida con el total calculado
 *
 * Usado en backend para validar que el cliente no manipuló los cálculos.
 * Usa tolerancia de centavos para evitar problemas de punto flotante.
 *
 * @param subtotal - Subtotal base
 * @param taxRate - Tasa de impuesto aplicada
 * @param receivedTotal - Total que envió el cliente
 * @returns true si el total es válido (dentro de tolerancia)
 *
 * @example
 * ```ts
 * // Cliente envía total correcto
 * validateProjectTotal(1000000, 19, 1190000)
 * // => true
 *
 * // Cliente envía total manipulado
 * validateProjectTotal(1000000, 19, 1100000)
 * // => false (diferencia de $90,000)
 * ```
 */
export function validateProjectTotal(
  subtotal: number,
  taxRate: number,
  receivedTotal: number,
  currency: string = 'CLP'
): boolean {
  const expectedTotal = calculateProjectTotal(subtotal, taxRate)
  return Math.abs(expectedTotal - receivedTotal) <= getBalanceTolerance(currency)
}

/**
 * Calcula el subtotal a partir del total y la tasa de impuesto
 *
 * Útil para operaciones inversas (ej: el usuario ingresa total y quieres calcular subtotal).
 *
 * Fórmula:
 * ```
 * Subtotal = Total / (1 + TaxRate/100)
 * ```
 *
 * @param total - Monto total (con impuestos incluidos)
 * @param taxRate - Porcentaje de impuesto aplicado
 * @returns Subtotal calculado
 *
 * @example
 * ```ts
 * // Cliente pagó $1,190,000 con IVA 19%
 * calculateSubtotalFromTotal(1190000, 19)
 * // => 1,000,000 (subtotal sin IVA)
 * ```
 */
export function calculateSubtotalFromTotal(
  total: number,
  taxRate: number = FINANCIAL.DEFAULT_TAX_RATE
): number {
  validateNonNegativeAmount(total, 'total')
  validateTaxRate(taxRate)

  return total / (1 + taxRate / 100)
}
