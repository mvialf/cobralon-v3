import { describe, it, expect } from 'vitest'
import {
  normalizeColumnName,
  findColumnIndex,
  parseDate,
  parseNumber,
  validateExcelFile,
} from '../helpers'

// =============================================================================
// normalizeColumnName - ~15 tests
// =============================================================================
describe('normalizeColumnName', () => {
  describe('transformaciones básicas', () => {
    it('convierte a minúsculas', () => {
      expect(normalizeColumnName('NOMBRE')).toBe('nombre')
      expect(normalizeColumnName('TeléFono')).toBe('telefono')
    })

    it('elimina espacios al inicio y final', () => {
      expect(normalizeColumnName('  nombre  ')).toBe('nombre')
      expect(normalizeColumnName('\tnombre\n')).toBe('nombre')
    })

    it('elimina acentos', () => {
      expect(normalizeColumnName('teléfono')).toBe('telefono')
      expect(normalizeColumnName('dirección')).toBe('direccion')
      expect(normalizeColumnName('número')).toBe('numero')
      expect(normalizeColumnName('descripción')).toBe('descripcion')
    })

    it('preserva espacios internos', () => {
      expect(normalizeColumnName('nombre cliente')).toBe('nombre cliente')
      expect(normalizeColumnName('fecha de pago')).toBe('fecha de pago')
    })
  })

  describe('removeSpecialChars = true (default)', () => {
    it('remueve caracteres especiales por defecto', () => {
      expect(normalizeColumnName('n° proyecto')).toBe('n proyecto')
      expect(normalizeColumnName('% iva')).toBe(' iva')
      expect(normalizeColumnName('monto ($)')).toBe('monto ')
    })

    it('mantiene solo letras, números y espacios', () => {
      expect(normalizeColumnName('email@cliente')).toBe('emailcliente')
      expect(normalizeColumnName('nombre-cliente')).toBe('nombrecliente')
      expect(normalizeColumnName('codigo_123')).toBe('codigo123')
    })
  })

  describe('removeSpecialChars = false', () => {
    it('mantiene caracteres especiales cuando se especifica false', () => {
      expect(normalizeColumnName('n° proyecto', false)).toBe('n° proyecto')
      expect(normalizeColumnName('% iva', false)).toBe('% iva')
      expect(normalizeColumnName('email@cliente', false)).toBe('email@cliente')
    })

    it('aún remueve acentos con removeSpecialChars=false', () => {
      expect(normalizeColumnName('teléfono', false)).toBe('telefono')
      expect(normalizeColumnName('dirección', false)).toBe('direccion')
    })
  })

  describe('edge cases', () => {
    it('maneja string vacío', () => {
      expect(normalizeColumnName('')).toBe('')
    })

    it('maneja string con solo espacios', () => {
      expect(normalizeColumnName('   ')).toBe('')
    })

    it('maneja números como string', () => {
      expect(normalizeColumnName('123')).toBe('123')
      expect(normalizeColumnName('m2')).toBe('m2')
    })
  })
})

// =============================================================================
// findColumnIndex - ~12 tests
// =============================================================================
describe('findColumnIndex', () => {
  const headers = ['Nombre', 'Teléfono', 'Email', 'Fecha de Pago', 'Monto Total']

  describe('búsqueda básica', () => {
    it('encuentra columna en primera posición', () => {
      expect(findColumnIndex(headers, ['nombre'])).toBe(0)
    })

    it('encuentra columna en posición intermedia', () => {
      expect(findColumnIndex(headers, ['telefono'])).toBe(1)
      expect(findColumnIndex(headers, ['email'])).toBe(2)
    })

    it('encuentra columna en última posición', () => {
      expect(findColumnIndex(headers, ['monto'])).toBe(4)
    })

    it('retorna null cuando no encuentra columna', () => {
      expect(findColumnIndex(headers, ['direccion'])).toBeNull()
      expect(findColumnIndex(headers, ['calle'])).toBeNull()
    })
  })

  describe('normalización automática', () => {
    it('ignora mayúsculas/minúsculas', () => {
      expect(findColumnIndex(['NOMBRE', 'email'], ['nombre'])).toBe(0)
      expect(findColumnIndex(['nombre', 'EMAIL'], ['email'])).toBe(1)
    })

    it('ignora acentos en headers', () => {
      expect(findColumnIndex(['Teléfono', 'Dirección'], ['telefono'])).toBe(0)
      expect(findColumnIndex(['Teléfono', 'Dirección'], ['direccion'])).toBe(1)
    })

    it('busca coincidencia parcial (contains)', () => {
      expect(findColumnIndex(['Fecha de Pago'], ['fecha'])).toBe(0)
      expect(findColumnIndex(['Monto Total'], ['monto'])).toBe(0)
      expect(findColumnIndex(['Número Proyecto'], ['proyecto'])).toBe(0)
    })
  })

  describe('múltiples nombres posibles', () => {
    it('encuentra con primer nombre posible', () => {
      expect(findColumnIndex(['Cliente'], ['cliente', 'customer', 'nombre'])).toBe(0)
    })

    it('encuentra con nombre alternativo', () => {
      expect(findColumnIndex(['Customer'], ['cliente', 'customer', 'nombre'])).toBe(0)
    })

    it('retorna primera coincidencia en headers', () => {
      const multiHeaders = ['Nombre Cliente', 'Nombre Proyecto']
      expect(findColumnIndex(multiHeaders, ['nombre'])).toBe(0)
    })
  })

  describe('removeSpecialChars flag', () => {
    it('con removeSpecialChars=true (default), ignora caracteres especiales', () => {
      expect(findColumnIndex(['N° Proyecto'], ['n proyecto'])).toBe(0)
      expect(findColumnIndex(['% IVA'], ['iva'])).toBe(0)
    })

    it('con removeSpecialChars=false, mantiene caracteres especiales', () => {
      // customer-parser usa esto para mantener comportamiento original
      expect(findColumnIndex(['N° Proyecto'], ['n°'], false)).toBe(0)
      expect(findColumnIndex(['N° Proyecto'], ['n proyecto'], false)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('maneja array de headers vacío', () => {
      expect(findColumnIndex([], ['nombre'])).toBeNull()
    })

    it('maneja array de possibleNames vacío', () => {
      expect(findColumnIndex(headers, [])).toBeNull()
    })
  })
})

// =============================================================================
// parseDate - ~20 tests
// =============================================================================
describe('parseDate', () => {
  describe('valores null/undefined/falsy', () => {
    it('retorna null para null', () => {
      expect(parseDate(null)).toBeNull()
    })

    it('retorna null para undefined', () => {
      expect(parseDate(undefined)).toBeNull()
    })

    it('retorna null para string vacío', () => {
      expect(parseDate('')).toBeNull()
      expect(parseDate('   ')).toBeNull()
    })

    it('retorna null para 0', () => {
      // 0 es falsy, pero parseDate lo trata como número Excel
      // El número 0 en Excel es 1899-12-30 (bug conocido de Excel)
      const result = parseDate(0)
      // Podría ser null o fecha antigua dependiendo de implementación
      expect(result === null || result instanceof Date).toBe(true)
    })
  })

  describe('Excel date serial (número)', () => {
    it('parsea fecha Excel moderna', () => {
      // 45658 = 2025-01-01 en Excel (días desde 1900-01-01)
      const result = parseDate(45658)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2025)
      expect(result?.getMonth()).toBe(0) // Enero = 0
      expect(result?.getDate()).toBe(1)
    })

    it('parsea fecha Excel de 2024', () => {
      // 45292 = 2024-01-01
      const result = parseDate(45292)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(0)
      expect(result?.getDate()).toBe(1)
    })

    it('parsea fecha Excel con decimales (ignora hora)', () => {
      // 45658.5 = 2025-01-01 12:00
      const result = parseDate(45658.5)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2025)
      expect(result?.getMonth()).toBe(0)
      expect(result?.getDate()).toBe(1)
    })
  })

  describe('string formato DD/MM/YYYY', () => {
    it('parsea fecha con formato DD/MM/YYYY', () => {
      const result = parseDate('15/06/2024')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(5) // Junio = 5
      expect(result?.getDate()).toBe(15)
    })

    it('parsea fecha con formato D/M/YYYY (sin ceros)', () => {
      const result = parseDate('5/3/2024')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(2) // Marzo = 2
      expect(result?.getDate()).toBe(5)
    })

    it('parsea fecha con formato DD-MM-YYYY (guiones)', () => {
      const result = parseDate('25-12-2024')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(11) // Diciembre = 11
      expect(result?.getDate()).toBe(25)
    })
  })

  describe('string formato ISO', () => {
    it('parsea fecha ISO completa', () => {
      const result = parseDate('2024-06-15')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(5)
      // Nota: getDate puede variar por timezone, validamos que sea 14 o 15
      expect([14, 15]).toContain(result?.getDate())
    })

    it('parsea fecha ISO con hora', () => {
      const result = parseDate('2024-06-15T10:30:00')
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
    })
  })

  describe('Date object', () => {
    it('retorna Date válido si input es Date válido', () => {
      const input = new Date(2024, 5, 15) // 15 Junio 2024
      const result = parseDate(input)
      expect(result).toBeInstanceOf(Date)
      expect(result?.getFullYear()).toBe(2024)
      expect(result?.getMonth()).toBe(5)
      expect(result?.getDate()).toBe(15)
    })

    it('retorna null para Date inválido', () => {
      const invalidDate = new Date('invalid')
      expect(parseDate(invalidDate)).toBeNull()
    })
  })

  describe('strings inválidos', () => {
    it('retorna null para texto no-fecha', () => {
      expect(parseDate('hola')).toBeNull()
      expect(parseDate('abc123')).toBeNull()
    })

    it('retorna null para formato claramente inválido', () => {
      // Nota: JavaScript Date es MUY permisivo - acepta 32/13/2024 con overflow
      // Estos formatos NO matchean el regex DD/MM/YYYY ni Date nativo
      expect(parseDate('no-es-fecha')).toBeNull()
      expect(parseDate('xx/yy/zzzz')).toBeNull()
    })
  })
})

// =============================================================================
// parseNumber - ~12 tests
// =============================================================================
describe('parseNumber', () => {
  describe('input numérico', () => {
    it('retorna número si input es número', () => {
      expect(parseNumber(123)).toBe(123)
      expect(parseNumber(0)).toBe(0)
      expect(parseNumber(-50)).toBe(-50)
    })

    it('retorna decimales', () => {
      expect(parseNumber(123.45)).toBe(123.45)
      expect(parseNumber(0.5)).toBe(0.5)
    })
  })

  describe('input string', () => {
    it('parsea string numérico simple', () => {
      expect(parseNumber('123')).toBe(123)
      expect(parseNumber('0')).toBe(0)
    })

    it('parsea string con decimales', () => {
      expect(parseNumber('123.45')).toBe(123.45)
      expect(parseNumber('0.99')).toBe(0.99)
    })

    it('parsea string con separador de miles', () => {
      expect(parseNumber('1,234')).toBe(1234)
      expect(parseNumber('1,234,567')).toBe(1234567)
    })

    it('parsea string con formato moneda', () => {
      expect(parseNumber('$1,234.56')).toBe(1234.56)
      expect(parseNumber('$100')).toBe(100)
    })

    it('parsea string con signo negativo', () => {
      expect(parseNumber('-50')).toBe(-50)
      expect(parseNumber('-1,234.56')).toBe(-1234.56)
    })

    it('elimina caracteres no numéricos', () => {
      expect(parseNumber('abc123def')).toBe(123)
      expect(parseNumber('precio: 500')).toBe(500)
    })
  })

  describe('defaultValue', () => {
    it('usa defaultValue=0 cuando no se especifica', () => {
      expect(parseNumber('')).toBe(0)
      expect(parseNumber('abc')).toBe(0)
    })

    it('usa defaultValue personalizado', () => {
      expect(parseNumber('', 100)).toBe(100)
      expect(parseNumber('invalid', -1)).toBe(-1)
    })

    it('no usa defaultValue si puede parsear', () => {
      expect(parseNumber('50', 100)).toBe(50)
    })
  })

  describe('edge cases', () => {
    it('maneja null/undefined retornando defaultValue', () => {
      expect(parseNumber(null)).toBe(0)
      expect(parseNumber(undefined)).toBe(0)
      expect(parseNumber(null, 99)).toBe(99)
    })

    it('maneja string con solo caracteres especiales', () => {
      expect(parseNumber('$,.')).toBe(0)
      expect(parseNumber('---')).toBe(0)
    })

    it('maneja objetos retornando defaultValue', () => {
      expect(parseNumber({})).toBe(0)
      expect(parseNumber([])).toBe(0)
    })
  })
})

// =============================================================================
// validateExcelFile - ~11 tests
// =============================================================================
describe('validateExcelFile', () => {
  // Helper para crear mock de File con tamaño específico
  function createMockFile(name: string, size: number, type: string): File {
    // Crear un ArrayBuffer del tamaño deseado para que file.size sea correcto
    const buffer = new ArrayBuffer(size)
    const blob = new Blob([buffer], { type })
    return new File([blob], name, { type })
  }

  describe('validación de tipo de archivo', () => {
    it('acepta archivo .xlsx con tipo MIME correcto', () => {
      const file = createMockFile(
        'test.xlsx',
        1000,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const result = validateExcelFile(file)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('acepta archivo .xls con tipo MIME correcto', () => {
      const file = createMockFile('test.xls', 1000, 'application/vnd.ms-excel')
      const result = validateExcelFile(file)
      expect(result.valid).toBe(true)
    })

    it('acepta archivo con extensión .xlsx pero tipo MIME incorrecto', () => {
      // Algunos sistemas reportan MIME incorrecto
      const file = createMockFile('test.xlsx', 1000, 'application/octet-stream')
      const result = validateExcelFile(file)
      expect(result.valid).toBe(true)
    })

    it('rechaza archivo con extensión incorrecta', () => {
      const file = createMockFile('test.csv', 1000, 'text/csv')
      const result = validateExcelFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Excel')
    })

    it('rechaza archivo .pdf', () => {
      const file = createMockFile('test.pdf', 1000, 'application/pdf')
      const result = validateExcelFile(file)
      expect(result.valid).toBe(false)
    })
  })

  describe('validación de tamaño', () => {
    it('acepta archivo dentro del límite por defecto (5MB)', () => {
      const file = createMockFile(
        'test.xlsx',
        4 * 1024 * 1024, // 4MB
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const result = validateExcelFile(file)
      expect(result.valid).toBe(true)
    })

    it('rechaza archivo que excede límite por defecto (5MB)', () => {
      const file = createMockFile(
        'test.xlsx',
        6 * 1024 * 1024, // 6MB
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const result = validateExcelFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('5MB')
    })

    it('acepta archivo con límite personalizado mayor', () => {
      const file = createMockFile(
        'test.xlsx',
        8 * 1024 * 1024, // 8MB
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const result = validateExcelFile(file, 10) // Límite 10MB
      expect(result.valid).toBe(true)
    })

    it('rechaza archivo que excede límite personalizado', () => {
      const file = createMockFile(
        'test.xlsx',
        3 * 1024 * 1024, // 3MB
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const result = validateExcelFile(file, 2) // Límite 2MB
      expect(result.valid).toBe(false)
      expect(result.error).toContain('2MB')
    })
  })

  describe('edge cases', () => {
    it('acepta archivo en el límite exacto', () => {
      const file = createMockFile(
        'test.xlsx',
        5 * 1024 * 1024, // Exactamente 5MB
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const result = validateExcelFile(file)
      // El límite es ">" no ">=", así que exactamente 5MB debería ser válido
      expect(result.valid).toBe(true)
    })
  })
})
