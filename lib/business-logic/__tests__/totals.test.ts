import { describe, it, expect } from 'vitest'
import {
  calculateProjectTotal,
  calculateTax,
  validateProjectTotal,
  calculateSubtotalFromTotal,
} from '../totals'

describe('calculateProjectTotal', () => {
  describe('Casos básicos', () => {
    it('debe calcular total con IVA de 19%', () => {
      const subtotal = 1000000
      const expected = 1190000 // 1000000 * 1.19
      expect(calculateProjectTotal(subtotal)).toBe(expected)
    })

    it('debe manejar subtotal cero', () => {
      expect(calculateProjectTotal(0)).toBe(0)
    })

    it('debe calcular correctamente con subtotal de 100', () => {
      const subtotal = 100
      const expected = 119 // 100 * 1.19
      expect(calculateProjectTotal(subtotal)).toBe(expected)
    })
  })

  describe('Casos con decimales', () => {
    it('debe redondear correctamente centavos', () => {
      const subtotal = 100.5
      const expected = 119.6 // 100.50 * 1.19 = 119.595 → 119.60
      expect(calculateProjectTotal(subtotal)).toBeCloseTo(expected, 2)
    })

    it('debe calcular correctamente con decimales complejos', () => {
      const subtotal = 333.33
      const expected = 396.66 // 333.33 * 1.19 = 396.6627 → 396.66
      expect(calculateProjectTotal(subtotal)).toBeCloseTo(expected, 2)
    })

    it('debe manejar múltiples decimales', () => {
      const subtotal = 1234.56
      const expected = 1469.13 // 1234.56 * 1.19 = 1469.1264 → 1469.13
      expect(calculateProjectTotal(subtotal)).toBeCloseTo(expected, 2)
    })
  })

  describe('Edge cases', () => {
    it('debe rechazar montos negativos con error', () => {
      const subtotal = -1000
      expect(() => calculateProjectTotal(subtotal)).toThrow('El subtotal no puede ser negativo')
    })

    it('debe rechazar tasa de impuesto negativa', () => {
      expect(() => calculateProjectTotal(1000, -5)).toThrow(
        'La tasa de impuesto debe estar entre 0% y 100%'
      )
    })

    it('debe rechazar tasa de impuesto mayor a 100%', () => {
      expect(() => calculateProjectTotal(1000, 150)).toThrow(
        'La tasa de impuesto debe estar entre 0% y 100%'
      )
    })

    it('debe manejar números muy grandes', () => {
      const subtotal = 100000000 // $100 millones
      const expected = 119000000
      expect(calculateProjectTotal(subtotal)).toBe(expected)
    })

    it('debe manejar decimales extremos', () => {
      const subtotal = 0.01
      const expected = 0.01 // 0.01 * 1.19 = 0.0119 → 0.01
      expect(calculateProjectTotal(subtotal)).toBeCloseTo(expected, 2)
    })
  })

  describe('Casos reales de negocio', () => {
    it('debe calcular proyecto de $5.000.000 correctamente', () => {
      const subtotal = 5000000
      const expected = 5950000
      expect(calculateProjectTotal(subtotal)).toBe(expected)
    })

    it('debe calcular proyecto pequeño de $50.000', () => {
      const subtotal = 50000
      const expected = 59500
      expect(calculateProjectTotal(subtotal)).toBe(expected)
    })
  })
})

describe('calculateTax', () => {
  it('debe calcular solo el monto del IVA', () => {
    const subtotal = 1000000
    const expected = 190000 // 19% de 1,000,000
    expect(calculateTax(subtotal, 19)).toBe(expected)
  })

  it('debe retornar 0 cuando el IVA es 0%', () => {
    expect(calculateTax(1000, 0)).toBe(0)
  })

  it('debe rechazar subtotales negativos', () => {
    expect(() => calculateTax(-1000, 19)).toThrow('El subtotal no puede ser negativo')
  })

  it('debe rechazar tasa de impuesto negativa', () => {
    expect(() => calculateTax(1000, -5)).toThrow('La tasa de impuesto debe estar entre 0% y 100%')
  })

  it('debe rechazar tasa de impuesto mayor a 100%', () => {
    expect(() => calculateTax(1000, 150)).toThrow('La tasa de impuesto debe estar entre 0% y 100%')
  })
})

describe('validateProjectTotal', () => {
  it('debe validar total correcto', () => {
    const subtotal = 1000000
    const taxRate = 19
    const receivedTotal = 1190000
    expect(validateProjectTotal(subtotal, taxRate, receivedTotal)).toBe(true)
  })

  it('debe rechazar total incorrecto fuera de tolerancia', () => {
    const subtotal = 1000000
    const taxRate = 19
    const receivedTotal = 1100000 // Falta $90,000
    expect(validateProjectTotal(subtotal, taxRate, receivedTotal)).toBe(false)
  })

  it('debe aceptar diferencias dentro de tolerancia de centavos', () => {
    const subtotal = 1000000
    const taxRate = 19
    const receivedTotal = 1190000.005 // Diferencia < 0.01
    expect(validateProjectTotal(subtotal, taxRate, receivedTotal)).toBe(true)
  })
})

describe('validateProjectTotal - edge cases de tolerancia', () => {
  it('debe aceptar diferencia exactamente en el límite (< 0.01)', () => {
    const subtotal = 1000
    const taxRate = 19
    const expectedTotal = subtotal * (1 + taxRate / 100) // 1190

    // Diferencia de 0.009 (dentro de tolerancia)
    expect(validateProjectTotal(subtotal, taxRate, expectedTotal + 0.009)).toBe(true)
    expect(validateProjectTotal(subtotal, taxRate, expectedTotal - 0.009)).toBe(true)
  })

  it('debe rechazar diferencia claramente >= 0.01', () => {
    const subtotal = 1000
    const taxRate = 19
    const expectedTotal = subtotal * (1 + taxRate / 100) // 1190

    // Diferencia de 0.02 (claramente fuera de tolerancia)
    // Nota: 0.01 exacto puede tener problemas de punto flotante
    expect(validateProjectTotal(subtotal, taxRate, expectedTotal + 0.02)).toBe(false)
    expect(validateProjectTotal(subtotal, taxRate, expectedTotal - 0.02)).toBe(false)
  })

  it('debe validar con diferentes tasas de impuesto', () => {
    // IVA Argentina 21%
    expect(validateProjectTotal(1000, 21, 1210)).toBe(true)

    // IVA Chile reducido 9.5%
    expect(validateProjectTotal(1000, 9.5, 1095)).toBe(true)

    // Sin IVA 0%
    expect(validateProjectTotal(1000, 0, 1000)).toBe(true)
  })

  it('debe rechazar manipulación de total por el cliente', () => {
    // Cliente intenta pagar menos
    expect(validateProjectTotal(1000000, 19, 1000000)).toBe(false) // Falta el IVA

    // Cliente intenta pagar de más (sospechoso)
    expect(validateProjectTotal(1000, 19, 1500)).toBe(false)
  })
})

describe('calculateSubtotalFromTotal', () => {
  it('debe calcular subtotal desde total con IVA 19%', () => {
    const total = 1190000
    const taxRate = 19
    const expected = 1000000
    expect(calculateSubtotalFromTotal(total, taxRate)).toBeCloseTo(expected, 2)
  })

  it('debe manejar total sin IVA (0%)', () => {
    const total = 1000
    const expected = 1000
    expect(calculateSubtotalFromTotal(total, 0)).toBe(expected)
  })

  it('debe rechazar totales negativos', () => {
    expect(() => calculateSubtotalFromTotal(-1000, 19)).toThrow('El total no puede ser negativo')
  })

  it('debe rechazar tasa de impuesto negativa', () => {
    expect(() => calculateSubtotalFromTotal(1000, -5)).toThrow(
      'La tasa de impuesto debe estar entre 0% y 100%'
    )
  })

  it('debe rechazar tasa de impuesto mayor a 100%', () => {
    expect(() => calculateSubtotalFromTotal(1000, 150)).toThrow(
      'La tasa de impuesto debe estar entre 0% y 100%'
    )
  })
})
