/**
 * Tests para funciones de normalización de regiones
 *
 * Valida:
 * - normalizeRegionValue(): Conversión de códigos y nombres
 * - getRegionCodigoByNombre(): Búsqueda insensible a acentos
 * - Edge cases y backward compatibility
 */

import { describe, it, expect } from 'vitest'
import { normalizeRegionValue, getRegionCodigoByNombre, getRegionByCodigo } from '../regiones-chile'

describe('normalizeRegionValue()', () => {
  describe('Fast path: códigos válidos', () => {
    it('debe mantener código válido sin cambios', () => {
      expect(normalizeRegionValue('13')).toBe('13')
    })

    it('debe mantener código con ceros leading', () => {
      expect(normalizeRegionValue('05')).toBe('05')
    })

    it('debe mantener todos los códigos válidos', () => {
      const validCodes = [
        '01',
        '02',
        '03',
        '04',
        '05',
        '06',
        '07',
        '08',
        '09',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
      ]

      validCodes.forEach((code) => {
        expect(normalizeRegionValue(code)).toBe(code)
      })
    })

    it('debe manejar código con espacios (trimming)', () => {
      expect(normalizeRegionValue('  13  ')).toBe('13')
    })
  })

  describe('Slow path: nombres a códigos', () => {
    it('debe convertir nombre completo a código', () => {
      expect(normalizeRegionValue('Región Metropolitana de Santiago')).toBe('13')
    })

    it('debe convertir nombre corto a código', () => {
      expect(normalizeRegionValue('Metropolitana')).toBe('13')
    })

    it('debe convertir nombre de Valparaíso (con tilde)', () => {
      expect(normalizeRegionValue('Región de Valparaíso')).toBe('05')
    })

    it('debe convertir "Valparaiso" sin tilde (edge case crítico)', () => {
      expect(normalizeRegionValue('Región de Valparaiso')).toBe('05')
    })

    it('debe convertir Antofagasta sin "Región"', () => {
      expect(normalizeRegionValue('Antofagasta')).toBe('02')
    })

    it('debe convertir todos los nombres conocidos', () => {
      const testCases = [
        { input: 'Tarapacá', expected: '01' },
        { input: 'Antofagasta', expected: '02' },
        { input: 'Atacama', expected: '03' },
        { input: 'Coquimbo', expected: '04' },
        { input: "O'Higgins", expected: '06' },
        { input: 'Maule', expected: '07' },
        { input: 'Biobío', expected: '08' },
        { input: 'Araucanía', expected: '09' },
        { input: 'Los Lagos', expected: '10' },
        { input: 'Aysén', expected: '11' },
        { input: 'Magallanes', expected: '12' },
        { input: 'Los Ríos', expected: '14' },
        { input: 'Arica y Parinacota', expected: '15' },
        { input: 'Ñuble', expected: '16' },
      ]

      testCases.forEach(({ input, expected }) => {
        expect(normalizeRegionValue(input)).toBe(expected)
      })
    })
  })

  describe('Case insensitivity', () => {
    it('debe funcionar con mayúsculas', () => {
      expect(normalizeRegionValue('REGIÓN METROPOLITANA')).toBe('13')
    })

    it('debe funcionar con minúsculas', () => {
      expect(normalizeRegionValue('región metropolitana')).toBe('13')
    })

    it('debe funcionar con mixed case', () => {
      expect(normalizeRegionValue('ReGiÓn MeTrOpOlItAnA')).toBe('13')
    })
  })

  describe('Accent insensitivity', () => {
    it('debe manejar "region" sin acento', () => {
      expect(normalizeRegionValue('Region Metropolitana')).toBe('13')
    })

    it('debe manejar "Biobio" sin tilde', () => {
      expect(normalizeRegionValue('Biobio')).toBe('08')
    })

    it('debe manejar "Nuble" sin tilde', () => {
      expect(normalizeRegionValue('Nuble')).toBe('16')
    })
  })

  describe('Espacios y trimming', () => {
    it('debe trimear espacios al inicio y final', () => {
      expect(normalizeRegionValue('  Metropolitana  ')).toBe('13')
    })

    it('debe manejar múltiples espacios internos', () => {
      expect(normalizeRegionValue('Región   Metropolitana')).toBe('13')
    })
  })

  describe('Valores inválidos', () => {
    it('debe retornar null para string vacío', () => {
      expect(normalizeRegionValue('')).toBeNull()
    })

    it('debe retornar null para solo espacios', () => {
      expect(normalizeRegionValue('   ')).toBeNull()
    })

    it('debe retornar null para código inválido', () => {
      expect(normalizeRegionValue('99')).toBeNull()
    })

    it('debe retornar null para nombre inválido', () => {
      expect(normalizeRegionValue('Atlantida')).toBeNull()
    })

    it('debe retornar null para región inexistente', () => {
      expect(normalizeRegionValue('Región de la Luna')).toBeNull()
    })
  })

  describe('Formatos reales de datos externos', () => {
    it('debe manejar "Región Metropolitana" (formato más común)', () => {
      expect(normalizeRegionValue('Región Metropolitana')).toBe('13')
    })

    it('debe manejar "Region de Antofagasta" (sin acento, variant real)', () => {
      expect(normalizeRegionValue('Region de Antofagasta')).toBe('02')
    })

    it('debe manejar nombre con prefijo "de" inconsistente', () => {
      expect(normalizeRegionValue('Región de Valparaiso')).toBe('05')
      expect(normalizeRegionValue('Región Valparaíso')).toBe('05')
    })
  })
})

describe('getRegionCodigoByNombre()', () => {
  describe('Búsqueda exacta', () => {
    it('debe encontrar región por nombre completo', () => {
      expect(getRegionCodigoByNombre('Región Metropolitana de Santiago')).toBe('13')
    })

    it('debe encontrar región por nombre corto', () => {
      expect(getRegionCodigoByNombre('Metropolitana')).toBe('13')
    })

    it('debe ser case insensitive', () => {
      expect(getRegionCodigoByNombre('metropolitana')).toBe('13')
      expect(getRegionCodigoByNombre('METROPOLITANA')).toBe('13')
    })
  })

  describe('Normalización de acentos (FIX CRÍTICO)', () => {
    it('debe encontrar Valparaíso sin tilde', () => {
      expect(getRegionCodigoByNombre('Valparaiso')).toBe('05')
    })

    it('debe encontrar Valparaíso con tilde', () => {
      expect(getRegionCodigoByNombre('Valparaíso')).toBe('05')
    })

    it('debe encontrar Biobío sin tilde', () => {
      expect(getRegionCodigoByNombre('Biobio')).toBe('08')
    })

    it('debe encontrar Ñuble sin tilde', () => {
      expect(getRegionCodigoByNombre('Nuble')).toBe('16')
    })

    it('debe encontrar "region" sin acento', () => {
      expect(getRegionCodigoByNombre('region metropolitana')).toBe('13')
    })
  })

  describe('Búsqueda parcial', () => {
    it('debe encontrar por substring en nombre completo', () => {
      expect(getRegionCodigoByNombre('Metropolitana de Santiago')).toBe('13')
    })

    it('debe encontrar por substring en nombre corto', () => {
      expect(getRegionCodigoByNombre('Metro')).toBe('13')
    })
  })

  describe('Valores inválidos', () => {
    it('debe retornar null para string vacío', () => {
      expect(getRegionCodigoByNombre('')).toBeNull()
    })

    it('debe retornar null para nombre inexistente', () => {
      expect(getRegionCodigoByNombre('Atlantida')).toBeNull()
    })
  })
})

describe('Integración: getRegionByCodigo() + normalizeRegionValue()', () => {
  it('debe validar que todos los códigos retornados son válidos', () => {
    const testInputs = ['Región Metropolitana', 'Valparaiso', '13', 'Region de Antofagasta']

    testInputs.forEach((input) => {
      const code = normalizeRegionValue(input)
      if (code) {
        const region = getRegionByCodigo(code)
        expect(region).toBeDefined()
        expect(region?.codigo).toBe(code)
      }
    })
  })
})

describe('Casos de regresión (bugs históricos)', () => {
  it('debe manejar "Región de Valparaiso" sin tilde (bug #1)', () => {
    // Este era el caso problemático identificado en migración
    expect(normalizeRegionValue('Región de Valparaiso')).toBe('05')
  })

  it('debe manejar espacios extra como en imports reales', () => {
    expect(normalizeRegionValue('  Región Metropolitana  ')).toBe('13')
  })

  it('debe priorizar búsqueda exacta sobre parcial', () => {
    // Si hay "Los Lagos" y "Lagos", debe preferir match exacto
    expect(getRegionCodigoByNombre('Los Lagos')).toBe('10')
  })
})
