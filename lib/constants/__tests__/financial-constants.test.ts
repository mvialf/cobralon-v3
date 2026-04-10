/**
 * Tests para lib/constants/financial-constants.ts
 *
 * Valida:
 * - FINANCIAL constants
 * - CURRENCY_CONFIG
 * - getCurrencyConfig helper
 */

import { describe, it, expect } from 'vitest'
import {
  FINANCIAL,
  CURRENCY_CONFIG,
  getCurrencyConfig,
  getBalanceTolerance,
  type CurrencyCode,
} from '../financial-constants'

describe('FINANCIAL', () => {
  describe('TOLERANCE', () => {
    it('debe ser 0.01 (centavos)', () => {
      expect(FINANCIAL.TOLERANCE).toBe(0.01)
    })

    it('debe ser inmutable (as const)', () => {
      // TypeScript previene la modificación, pero verificamos el valor
      expect(typeof FINANCIAL.TOLERANCE).toBe('number')
    })
  })

  describe('DEFAULT_TAX_RATE', () => {
    it('debe ser 19% (IVA Chile)', () => {
      expect(FINANCIAL.DEFAULT_TAX_RATE).toBe(19)
    })
  })

  describe('TAX_RATE range', () => {
    it('debe tener mínimo en 0%', () => {
      expect(FINANCIAL.MIN_TAX_RATE).toBe(0)
    })

    it('debe tener máximo en 100%', () => {
      expect(FINANCIAL.MAX_TAX_RATE).toBe(100)
    })

    it('DEFAULT_TAX_RATE debe estar dentro del rango', () => {
      expect(FINANCIAL.DEFAULT_TAX_RATE).toBeGreaterThanOrEqual(FINANCIAL.MIN_TAX_RATE)
      expect(FINANCIAL.DEFAULT_TAX_RATE).toBeLessThanOrEqual(FINANCIAL.MAX_TAX_RATE)
    })
  })

  describe('INSTALLMENTS range', () => {
    it('debe tener mínimo en 1 cuota', () => {
      expect(FINANCIAL.MIN_INSTALLMENTS).toBe(1)
    })

    it('debe tener máximo en 12 cuotas', () => {
      expect(FINANCIAL.MAX_INSTALLMENTS).toBe(12)
    })
  })

  describe('DAYS_PER_INSTALLMENT', () => {
    it('debe ser 30 días entre cuotas', () => {
      expect(FINANCIAL.DAYS_PER_INSTALLMENT).toBe(30)
    })
  })

  describe('DECIMAL_PRECISION', () => {
    it('debe ser 0.01 para precisión de centavos', () => {
      expect(FINANCIAL.DECIMAL_PRECISION).toBe(0.01)
    })

    it('debe ser igual a TOLERANCE', () => {
      expect(FINANCIAL.DECIMAL_PRECISION).toBe(FINANCIAL.TOLERANCE)
    })
  })

  describe('BALANCE_TOLERANCE', () => {
    it('debe ser 1 (1 peso CLP = unidad mínima)', () => {
      expect(FINANCIAL.BALANCE_TOLERANCE).toBe(1)
    })

    it('debe ser mayor que TOLERANCE', () => {
      expect(FINANCIAL.BALANCE_TOLERANCE).toBeGreaterThan(FINANCIAL.TOLERANCE)
    })
  })
})

describe('CURRENCY_CONFIG', () => {
  describe('CLP (Peso Chileno)', () => {
    it('debe tener configuración correcta', () => {
      expect(CURRENCY_CONFIG.CLP).toBeDefined()
      expect(CURRENCY_CONFIG.CLP.locale).toBe('es-CL')
      expect(CURRENCY_CONFIG.CLP.decimals).toBe(0) // Sin decimales
      expect(CURRENCY_CONFIG.CLP.balanceTolerance).toBe(1)
      expect(CURRENCY_CONFIG.CLP.name).toBe('Peso Chileno')
    })
  })

  describe('USD (Dólar)', () => {
    it('debe tener configuración correcta', () => {
      expect(CURRENCY_CONFIG.USD).toBeDefined()
      expect(CURRENCY_CONFIG.USD.locale).toBe('en-US')
      expect(CURRENCY_CONFIG.USD.decimals).toBe(2) // Con decimales
      expect(CURRENCY_CONFIG.USD.balanceTolerance).toBe(0.01)
      expect(CURRENCY_CONFIG.USD.name).toBe('Dólar Estadounidense')
    })
  })

  describe('EUR (Euro)', () => {
    it('debe tener configuración correcta', () => {
      expect(CURRENCY_CONFIG.EUR).toBeDefined()
      expect(CURRENCY_CONFIG.EUR.locale).toBe('es-ES')
      expect(CURRENCY_CONFIG.EUR.decimals).toBe(2)
      expect(CURRENCY_CONFIG.EUR.name).toBe('Euro')
    })
  })

  describe('ARS (Peso Argentino)', () => {
    it('debe tener configuración correcta', () => {
      expect(CURRENCY_CONFIG.ARS).toBeDefined()
      expect(CURRENCY_CONFIG.ARS.locale).toBe('es-AR')
      expect(CURRENCY_CONFIG.ARS.decimals).toBe(2)
      expect(CURRENCY_CONFIG.ARS.name).toBe('Peso Argentino')
    })
  })

  describe('MXN (Peso Mexicano)', () => {
    it('debe tener configuración correcta', () => {
      expect(CURRENCY_CONFIG.MXN).toBeDefined()
      expect(CURRENCY_CONFIG.MXN.locale).toBe('es-MX')
      expect(CURRENCY_CONFIG.MXN.decimals).toBe(2)
      expect(CURRENCY_CONFIG.MXN.name).toBe('Peso Mexicano')
    })
  })

  it('debe tener exactamente 5 monedas configuradas', () => {
    const currencies = Object.keys(CURRENCY_CONFIG)
    expect(currencies).toHaveLength(5)
    expect(currencies).toEqual(['CLP', 'USD', 'EUR', 'ARS', 'MXN'])
  })
})

describe('getCurrencyConfig', () => {
  it('debe retornar configuración de CLP', () => {
    const config = getCurrencyConfig('CLP')
    expect(config).toEqual(CURRENCY_CONFIG.CLP)
  })

  it('debe retornar configuración de USD', () => {
    const config = getCurrencyConfig('USD')
    expect(config).toEqual(CURRENCY_CONFIG.USD)
  })

  it('debe retornar configuración de EUR', () => {
    const config = getCurrencyConfig('EUR')
    expect(config).toEqual(CURRENCY_CONFIG.EUR)
  })

  it('debe retornar CLP por defecto para moneda desconocida', () => {
    const config = getCurrencyConfig('UNKNOWN')
    expect(config).toEqual(CURRENCY_CONFIG.CLP)
  })

  it('debe retornar CLP por defecto para string vacío', () => {
    const config = getCurrencyConfig('')
    expect(config).toEqual(CURRENCY_CONFIG.CLP)
  })

  it('debe manejar case-sensitive correctamente', () => {
    // La función es case-sensitive
    const configLowercase = getCurrencyConfig('usd')
    const configUppercase = getCurrencyConfig('USD')

    // lowercase no es una clave válida, retorna CLP
    expect(configLowercase).toEqual(CURRENCY_CONFIG.CLP)
    expect(configUppercase).toEqual(CURRENCY_CONFIG.USD)
  })

  it('debe retornar todas las monedas válidas correctamente', () => {
    const currencies: CurrencyCode[] = ['CLP', 'USD', 'EUR', 'ARS', 'MXN']

    currencies.forEach((code) => {
      const config = getCurrencyConfig(code)
      expect(config).toEqual(CURRENCY_CONFIG[code])
    })
  })
})

describe('getBalanceTolerance', () => {
  it('debe retornar 1 para CLP', () => {
    expect(getBalanceTolerance('CLP')).toBe(1)
  })

  it('debe retornar 0.01 para USD', () => {
    expect(getBalanceTolerance('USD')).toBe(0.01)
  })

  it('debe retornar tolerancia de CLP para moneda desconocida', () => {
    expect(getBalanceTolerance('UNKNOWN')).toBe(1)
  })
})

describe('Uso de TOLERANCE en comparaciones financieras', () => {
  it('debe permitir comparar montos con diferencia de centavos', () => {
    const amount1 = 100.00
    const amount2 = 100.005 // Diferencia < 0.01

    const isWithinTolerance = Math.abs(amount1 - amount2) < FINANCIAL.TOLERANCE
    expect(isWithinTolerance).toBe(true)
  })

  it('debe detectar diferencias mayores a centavos', () => {
    const amount1 = 100.00
    const amount2 = 100.02 // Diferencia > 0.01

    const isWithinTolerance = Math.abs(amount1 - amount2) < FINANCIAL.TOLERANCE
    expect(isWithinTolerance).toBe(false)
  })

  it('debe manejar errores de punto flotante típicos', () => {
    // 0.1 + 0.2 = 0.30000000000000004 en JavaScript
    const sum = 0.1 + 0.2
    const expected = 0.3

    // Sin tolerancia, fallaría
    expect(sum).not.toBe(expected)

    // Con tolerancia, pasa
    const isWithinTolerance = Math.abs(sum - expected) < FINANCIAL.TOLERANCE
    expect(isWithinTolerance).toBe(true)
  })
})
