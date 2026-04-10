/**
 * Constantes financieras del sistema
 *
 * Centraliza todos los valores financieros y configuraciones monetarias
 * utilizados en cálculos de balance, pagos, IVA y formateo.
 *
 * @module financial-constants
 */

/**
 * Constantes para cálculos financieros y validaciones
 */
export const FINANCIAL = {
  /**
   * Tolerancia para comparación de montos decimales (centavos)
   * Usado en validaciones de suma de allocations
   */
  TOLERANCE: 0.01,

  /**
   * Tolerancia para considerar un balance como "pagado"
   * Residuos por redondeo menores a este valor no generan deuda real.
   * Valor basado en CLP (1 peso = unidad mínima sin centavos).
   */
  BALANCE_TOLERANCE: 1,

  /**
   * Tasa de IVA por defecto (Chile)
   * Porcentaje aplicado a subtotal para calcular impuestos
   */
  DEFAULT_TAX_RATE: 19,

  /**
   * Rango válido para tasas de impuesto
   */
  MIN_TAX_RATE: 0,
  MAX_TAX_RATE: 100,

  /**
   * Rango válido para cuotas sin interés
   */
  MIN_INSTALLMENTS: 1,
  MAX_INSTALLMENTS: 12,

  /**
   * Días entre vencimientos de cuotas
   * Usado para calcular fechas de vencimiento
   */
  DAYS_PER_INSTALLMENT: 30,

  /**
   * Precisión decimal para montos monetarios
   * Usado en validaciones de Zod (multipleOf)
   */
  DECIMAL_PRECISION: 0.01,

  /**
   * Configuración de comisiones por método de pago
   */
  COMMISSION: {
    /** Porcentaje máximo de comisión permitido */
    MAX_PERCENTAGE: 30,
    /** Fee fijo máximo permitido (en moneda local) */
    MAX_FIXED_FEE: 50000,
    /** Máximo de tramos de comisión por método */
    MAX_TIERS: 10,
  },
} as const

/**
 * Configuración de formatos por moneda
 *
 * Define locale y cantidad de decimales para cada código de moneda ISO 4217
 */
export const CURRENCY_CONFIG = {
  CLP: {
    locale: 'es-CL',
    decimals: 0,
    balanceTolerance: 1,
    name: 'Peso Chileno',
  },
  USD: {
    locale: 'en-US',
    decimals: 2,
    balanceTolerance: 0.01,
    name: 'Dólar Estadounidense',
  },
  EUR: {
    locale: 'es-ES',
    decimals: 2,
    balanceTolerance: 0.01,
    name: 'Euro',
  },
  ARS: {
    locale: 'es-AR',
    decimals: 2,
    balanceTolerance: 0.01,
    name: 'Peso Argentino',
  },
  MXN: {
    locale: 'es-MX',
    decimals: 2,
    balanceTolerance: 0.01,
    name: 'Peso Mexicano',
  },
} as const

/**
 * Type para códigos de moneda válidos
 * Inferido automáticamente desde CURRENCY_CONFIG
 */
export type CurrencyCode = keyof typeof CURRENCY_CONFIG

/**
 * Type para configuración de una moneda
 */
export type CurrencyInfo = (typeof CURRENCY_CONFIG)[CurrencyCode]

/**
 * Obtiene la configuración de una moneda específica
 *
 * @param currency - Código de moneda ISO 4217
 * @returns Configuración de la moneda (o CLP por defecto)
 *
 * @example
 * ```ts
 * const config = getCurrencyConfig('USD')
 * // { locale: 'en-US', decimals: 2, name: 'Dólar Estadounidense' }
 * ```
 */
export function getCurrencyConfig(currency: string): CurrencyInfo {
  return CURRENCY_CONFIG[currency as CurrencyCode] || CURRENCY_CONFIG.CLP
}

/**
 * Obtiene la tolerancia de balance para una moneda
 *
 * @param currency - Código de moneda ISO 4217
 * @returns Tolerancia de balance (CLP: 1, USD/EUR: 0.01)
 */
export function getBalanceTolerance(currency: string): number {
  return getCurrencyConfig(currency).balanceTolerance
}
