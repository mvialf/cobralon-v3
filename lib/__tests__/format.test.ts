import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, formatDate } from '../format'

describe('formatCurrency', () => {
  it('debe formatear CLP sin decimales', () => {
    expect(formatCurrency(1234.56, 'CLP')).toBe('$1.235')
  })

  it('debe formatear USD con 2 decimales', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toMatch(/\$1,234\.56/)
  })

  it('debe formatear EUR con 2 decimales', () => {
    const result = formatCurrency(1234.56, 'EUR')
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('56')
  })

  it('debe usar CLP como default', () => {
    expect(formatCurrency(1500000)).toBe('$1.500.000')
  })

  it('debe manejar valores negativos', () => {
    const result = formatCurrency(-1234.56, 'USD')
    expect(result).toContain('-')
    expect(result).toContain('1,234')
  })

  it('debe manejar cero', () => {
    expect(formatCurrency(0, 'CLP')).toBe('$0')
  })

  it('debe soportar ARS (Peso argentino)', () => {
    const result = formatCurrency(1234.56, 'ARS')
    expect(result).toContain('1')
    expect(result).toContain('234')
  })

  it('debe soportar MXN (Peso mexicano)', () => {
    const result = formatCurrency(1234.56, 'MXN')
    expect(result).toContain('1')
    expect(result).toContain('234')
  })
})

describe('formatNumber', () => {
  it('debe formatear con 2 decimales por default', () => {
    expect(formatNumber(1234.567)).toBe('1.234,57')
  })

  it('debe formatear sin decimales cuando se especifica 0', () => {
    expect(formatNumber(1234.567, 0)).toBe('1.235')
  })

  it('debe formatear con decimales personalizados', () => {
    expect(formatNumber(1234.56789, 3)).toBe('1.234,568')
  })

  it('debe manejar números enteros', () => {
    expect(formatNumber(1000, 2)).toBe('1.000,00')
  })

  it('debe manejar valores negativos', () => {
    const result = formatNumber(-1234.56)
    expect(result).toContain('-1.234')
  })

  it('debe manejar cero', () => {
    expect(formatNumber(0, 2)).toBe('0,00')
  })
})

describe('formatDate', () => {
  // Usar UTC para evitar problemas de timezone
  const testDate = new Date('2025-01-15T12:00:00Z')

  describe('variant: short', () => {
    it('debe formatear en formato corto (es-CL)', () => {
      const result = formatDate(testDate, 'short', 'es-CL')
      // Verificar componentes en lugar de string exacto (por timezone)
      expect(result).toContain('15')
      expect(result).toContain('01')
      expect(result).toContain('2025')
    })

    it('debe formatear en formato corto (en-US)', () => {
      const result = formatDate(testDate, 'short', 'en-US')
      expect(result).toBe('01/15/2025')
    })

    it('debe usar short como default', () => {
      const result = formatDate(testDate)
      expect(result).toContain('15')
      expect(result).toContain('01')
      expect(result).toContain('2025')
    })
  })

  describe('variant: long', () => {
    it('debe formatear en formato largo (es-CL)', () => {
      const result = formatDate(testDate, 'long', 'es-CL')
      expect(result).toContain('15')
      expect(result).toContain('enero')
      expect(result).toContain('2025')
    })

    it('debe formatear en formato largo (en-US)', () => {
      const result = formatDate(testDate, 'long', 'en-US')
      expect(result).toContain('January')
      expect(result).toContain('15')
      expect(result).toContain('2025')
    })
  })

  describe('variant: full', () => {
    it('debe formatear con fecha y hora (es-CL)', () => {
      const result = formatDate(testDate, 'full', 'es-CL')
      expect(result).toContain('15')
      expect(result).toContain('enero')
      expect(result).toContain('2025')
      // No verificar hora específica por timezone
      expect(result).toMatch(/\d{1,2}:\d{2}/) // Debe contener hora en formato HH:MM
    })

    it('debe formatear con fecha y hora (en-US)', () => {
      const result = formatDate(testDate, 'full', 'en-US')
      expect(result).toContain('January')
      expect(result).toContain('15')
      expect(result).toContain('2025')
      // No verificar hora específica por timezone
      expect(result).toMatch(/\d{1,2}:\d{2}/) // Debe contener hora en formato HH:MM
    })
  })

  describe('edge cases', () => {
    it('debe aceptar Date object', () => {
      const date = new Date('2025-01-15T12:00:00Z')
      const result = formatDate(date, 'short', 'es-CL')
      expect(result).toContain('15')
      expect(result).toContain('01')
      expect(result).toContain('2025')
    })

    it('debe manejar diferentes locales', () => {
      const resultES = formatDate(testDate, 'short', 'es-AR')
      const resultEN = formatDate(testDate, 'short', 'en-US')
      expect(resultES).not.toBe(resultEN)
    })
  })

  describe('usar es-CL como default locale', () => {
    it('debe usar es-CL cuando no se especifica locale', () => {
      const result = formatDate(testDate, 'short')
      expect(result).toBe('15-01-2025') // Formato chileno
    })
  })
})
