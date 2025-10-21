/**
 * Utilerías de formateo
 */

/**
 * Formatea un número como moneda
 *
 * @param amount - Monto a formatear
 * @param currency - Código de moneda (ISO 4217)
 * @returns String formateado como moneda
 *
 * @example
 * ```ts
 * formatCurrency(1234.56, 'CLP') // "$1.235" (sin decimales)
 * formatCurrency(1234.56, 'USD') // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 * ```
 */
export function formatCurrency(amount: number, currency: string = 'CLP'): string {
  // Configuración por moneda
  const currencyConfig: Record<string, { locale: string; decimals: number }> = {
    CLP: { locale: 'es-CL', decimals: 0 }, // Peso chileno sin decimales
    USD: { locale: 'en-US', decimals: 2 },
    EUR: { locale: 'es-ES', decimals: 2 },
    ARS: { locale: 'es-AR', decimals: 2 }, // Peso argentino
    MXN: { locale: 'es-MX', decimals: 2 }, // Peso mexicano
  }

  const config = currencyConfig[currency] || currencyConfig.CLP

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount)
}

/**
 * Formatea un número con separadores de miles
 *
 * @param num - Número a formatear
 * @param decimals - Cantidad de decimales (default: 2)
 * @returns String formateado
 *
 * @example
 * ```ts
 * formatNumber(1234.567) // "1,234.57"
 * formatNumber(1234.567, 0) // "1,235"
 * ```
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}
