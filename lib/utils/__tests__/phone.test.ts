import { describe, it, expect } from 'vitest'
import { normalizePhone, validateChileanPhone, formatPhoneForDisplay } from '../phone'

// =============================================================================
// normalizePhone - ~12 tests
// =============================================================================
describe('normalizePhone', () => {
  describe('valores nulos y vacíos', () => {
    it('retorna string vacío para null', () => {
      expect(normalizePhone(null)).toBe('')
    })

    it('retorna string vacío para undefined', () => {
      expect(normalizePhone(undefined)).toBe('')
    })

    it('retorna string vacío para string vacío', () => {
      expect(normalizePhone('')).toBe('')
    })

    it('retorna string vacío para solo espacios', () => {
      expect(normalizePhone('   ')).toBe('')
    })
  })

  describe('números ya con prefijo +', () => {
    it('mantiene número con +56 sin cambios', () => {
      expect(normalizePhone('+56912345678')).toBe('+56912345678')
    })

    it('mantiene número con otro prefijo sin cambios', () => {
      expect(normalizePhone('+1234567890')).toBe('+1234567890')
    })
  })

  describe('números con código país sin +', () => {
    it('agrega + a número que inicia con 56', () => {
      expect(normalizePhone('56912345678')).toBe('+56912345678')
    })
  })

  describe('números locales (sin código país)', () => {
    it('agrega +56 a número de 9 dígitos', () => {
      expect(normalizePhone('912345678')).toBe('+56912345678')
    })

    it('agrega +56 a número de 8 dígitos', () => {
      expect(normalizePhone('12345678')).toBe('+5612345678')
    })
  })

  describe('limpieza de caracteres especiales', () => {
    it('elimina espacios', () => {
      expect(normalizePhone('9 1234 5678')).toBe('+56912345678')
    })

    it('elimina guiones', () => {
      expect(normalizePhone('9-1234-5678')).toBe('+56912345678')
    })

    it('elimina paréntesis', () => {
      expect(normalizePhone('(9) 1234 5678')).toBe('+56912345678')
    })

    it('elimina puntos', () => {
      expect(normalizePhone('9.1234.5678')).toBe('+56912345678')
    })

    it('maneja combinación de caracteres especiales', () => {
      expect(normalizePhone('+56 (9) 1234-5678')).toBe('+56912345678')
    })
  })

  describe('código de país personalizado', () => {
    it('usa código de país personalizado', () => {
      expect(normalizePhone('123456789', '54')).toBe('+54123456789')
    })

    it('detecta código país personalizado existente', () => {
      expect(normalizePhone('54123456789', '54')).toBe('+54123456789')
    })
  })
})

// =============================================================================
// validateChileanPhone - ~10 tests
// =============================================================================
describe('validateChileanPhone', () => {
  describe('valores vacíos (considerados válidos/opcionales)', () => {
    it('retorna true para string vacío', () => {
      expect(validateChileanPhone('')).toBe(true)
    })
  })

  describe('números válidos', () => {
    it('acepta celular chileno válido', () => {
      expect(validateChileanPhone('+56912345678')).toBe(true)
    })

    it('acepta teléfono fijo RM (2)', () => {
      expect(validateChileanPhone('+56212345678')).toBe(true)
    })

    it('acepta teléfono fijo regional (3-9)', () => {
      expect(validateChileanPhone('+56331234567')).toBe(true)
      expect(validateChileanPhone('+56451234567')).toBe(true)
      expect(validateChileanPhone('+56712345678')).toBe(true)
    })
  })

  describe('números inválidos', () => {
    it('rechaza número sin prefijo +56', () => {
      expect(validateChileanPhone('912345678')).toBe(false)
    })

    it('rechaza número con prefijo incorrecto', () => {
      expect(validateChileanPhone('+54912345678')).toBe(false)
    })

    it('rechaza número que inicia con 0', () => {
      expect(validateChileanPhone('+56012345678')).toBe(false)
    })

    it('rechaza número que inicia con 1', () => {
      expect(validateChileanPhone('+56112345678')).toBe(false)
    })

    it('rechaza número con menos de 9 dígitos', () => {
      expect(validateChileanPhone('+5691234567')).toBe(false) // 8 dígitos
    })

    it('rechaza número con más de 9 dígitos', () => {
      expect(validateChileanPhone('+569123456789')).toBe(false) // 10 dígitos
    })
  })
})

// =============================================================================
// formatPhoneForDisplay - ~8 tests
// =============================================================================
describe('formatPhoneForDisplay', () => {
  describe('valores vacíos', () => {
    it('retorna string vacío para null/vacío', () => {
      expect(formatPhoneForDisplay('')).toBe('')
    })
  })

  describe('formato correcto', () => {
    it('formatea número chileno normalizado', () => {
      expect(formatPhoneForDisplay('+56912345678')).toBe('+56 9 1234 5678')
    })

    it('formatea teléfono fijo', () => {
      expect(formatPhoneForDisplay('+56212345678')).toBe('+56 2 1234 5678')
    })
  })

  describe('normalización automática', () => {
    it('normaliza y formatea número sin prefijo', () => {
      expect(formatPhoneForDisplay('912345678')).toBe('+56 9 1234 5678')
    })

    it('normaliza y formatea número con espacios', () => {
      expect(formatPhoneForDisplay('9 1234 5678')).toBe('+56 9 1234 5678')
    })
  })

  describe('números no chilenos', () => {
    it('retorna sin formato especial si no es formato +56 de 12 chars', () => {
      // Números con otro prefijo no se formatean con espacios
      expect(formatPhoneForDisplay('+1234567890')).toBe('+1234567890')
    })

    it('retorna sin formato si longitud diferente', () => {
      expect(formatPhoneForDisplay('+56123')).toBe('+56123')
    })
  })
})
