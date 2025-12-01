import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseProjectExcel, validateExcelFile } from '../project-parser'

// =============================================================================
// Helper para crear archivos Excel de prueba
// =============================================================================
function createExcelFile(data: unknown[][], sheetName = 'Sheet1'): File {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return new File([blob], 'test.xlsx', { type: blob.type })
}

// Headers estándar para proyectos
const STANDARD_HEADERS = [
  'Numero Proyecto',
  'Glosa',
  'Cliente',
  'Telefono',
  'Calle',
  'Depto',
  'Comuna',
  'Region',
  'Estado',
  'Fecha',
  'Subtotal',
  'IVA',
  'Ventanas',
  'M2',
  'Descripcion',
]

// Fila de datos válida
const VALID_ROW = [
  'P-001',
  'Proyecto Test',
  'Juan Pérez',
  '912345678',
  'Av. Principal 123',
  'Depto 45',
  'Santiago',
  '13',
  'En Proceso',
  '15/06/2024',
  1000000,
  19,
  10,
  25.5,
  'Descripción del proyecto',
]

// =============================================================================
// validateExcelFile - Tests específicos para proyectos (10MB límite)
// =============================================================================
describe('validateExcelFile (project-parser)', () => {
  it('acepta archivos Excel válidos', () => {
    const file = createExcelFile([STANDARD_HEADERS, VALID_ROW])
    const result = validateExcelFile(file)
    expect(result.valid).toBe(true)
  })

  it('rechaza archivos que exceden 10MB', () => {
    // El límite para proyectos es 10MB
    const largeBuffer = new ArrayBuffer(11 * 1024 * 1024) // 11MB
    const blob = new Blob([largeBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const file = new File([blob], 'large.xlsx', { type: blob.type })

    const result = validateExcelFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('10MB')
  })
})

// =============================================================================
// parseProjectExcel - Tests
// =============================================================================
describe('parseProjectExcel', () => {
  describe('parsing exitoso', () => {
    it('parsea Excel con datos válidos', async () => {
      const data = [STANDARD_HEADERS, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.errorCount).toBe(0)
      expect(result.totalRows).toBe(1)
    })

    it('parsea múltiples filas válidas', async () => {
      const data = [
        STANDARD_HEADERS,
        VALID_ROW,
        [
          'P-002',
          'Otro Proyecto',
          'María González',
          '987654321',
          'Calle Secundaria 456',
          '',
          'Providencia',
          'Metropolitana',
          'Pendiente',
          '20/07/2024',
          500000,
          19,
          5,
          12.5,
          '',
        ],
      ]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.validCount).toBe(2)
      expect(result.totalRows).toBe(2)
    })

    it('normaliza teléfono chileno', async () => {
      const data = [STANDARD_HEADERS, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.projects[0].data?.phone).toBe('+56912345678')
    })

    it('normaliza región por nombre', async () => {
      const row = [...VALID_ROW]
      row[7] = 'Metropolitana' // Nombre en lugar de código
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.projects[0].data?.region).toBe('13')
    })

    it('acepta código de región directamente', async () => {
      const data = [STANDARD_HEADERS, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.projects[0].data?.region).toBe('13')
    })

    it('maneja campos opcionales vacíos', async () => {
      // Headers sin columnas opcionales problemáticas
      const headers = [
        'Numero Proyecto',
        'Cliente',
        'Telefono',
        'Calle',
        'Comuna',
        'Region',
        'Estado',
        'Fecha',
        'Subtotal',
      ]
      const row = [
        'P-001',
        'Juan Pérez',
        '912345678',
        'Av. Principal 123',
        'Santiago',
        '13',
        'En Proceso',
        '15/06/2024',
        1000000,
      ]
      const data = [headers, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      // Debe parsear correctamente sin campos opcionales
      expect(result.validCount).toBe(1)
      // Campos no incluidos en headers serán undefined
      expect(result.projects[0].data?.projectName).toBeFalsy()
      expect(result.projects[0].data?.description).toBeFalsy()
    })

    it('usa IVA default 19 si no se proporciona', async () => {
      // Headers sin columna IVA
      const headers = [
        'Numero Proyecto',
        'Cliente',
        'Telefono',
        'Calle',
        'Comuna',
        'Region',
        'Estado',
        'Fecha',
        'Subtotal',
      ]
      const row = [
        'P-001',
        'Juan Pérez',
        '912345678',
        'Av. Principal 123',
        'Santiago',
        '13',
        'En Proceso',
        '15/06/2024',
        1000000,
      ]
      const data = [headers, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.projects[0].data?.taxRate).toBe(19)
    })

    it('ignora filas vacías', async () => {
      const data = [
        STANDARD_HEADERS,
        VALID_ROW,
        ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''], // Fila vacía
        [...VALID_ROW].map((v, i) => (i === 0 ? 'P-002' : v)),
      ]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.totalRows).toBe(2) // Solo 2 filas con datos
    })
  })

  describe('nombres alternativos de columnas', () => {
    it('encuentra columna con nombre alternativo "Project Number"', async () => {
      const headers = [...STANDARD_HEADERS]
      headers[0] = 'Project Number'
      const data = [headers, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.projects[0].data?.projectNumber).toBe('P-001')
    })

    it('ignora mayúsculas/minúsculas en headers', async () => {
      const headers = STANDARD_HEADERS.map((h) => h.toUpperCase())
      const data = [headers, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.validCount).toBe(1)
    })
  })

  describe('validación de datos', () => {
    it('marca como inválido si número proyecto está vacío', async () => {
      const row = [...VALID_ROW]
      row[0] = '' // Número proyecto vacío
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].isValid).toBe(false)
      expect(result.projects[0].errors.some((e) => e.includes('proyecto'))).toBe(true)
    })

    it('marca como inválido si cliente está vacío', async () => {
      const row = [...VALID_ROW]
      row[2] = '' // Cliente vacío
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].isValid).toBe(false)
    })

    it('marca como inválido si calle está vacía', async () => {
      const row = [...VALID_ROW]
      row[4] = '' // Calle vacía
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].isValid).toBe(false)
    })

    it('marca como inválido si comuna está vacía', async () => {
      const row = [...VALID_ROW]
      row[6] = '' // Comuna vacía
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
    })

    it('marca como inválido si región es inválida', async () => {
      const row = [...VALID_ROW]
      row[7] = 'Region Inventada' // Región inválida
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].errors.some((e) => e.includes('Región'))).toBe(true)
    })

    it('marca como inválido si estado está vacío', async () => {
      const row = [...VALID_ROW]
      row[8] = '' // Estado vacío
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
    })

    it('marca como inválido si fecha es inválida', async () => {
      const row = [...VALID_ROW]
      row[9] = 'no-es-fecha'
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].errors.some((e) => e.includes('Fecha'))).toBe(true)
    })

    it('marca como inválido si subtotal es 0 o negativo', async () => {
      const row = [...VALID_ROW]
      row[10] = 0 // Subtotal 0
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].errors.some((e) => e.includes('Subtotal'))).toBe(true)
    })

    it('acepta teléfono vacío (opcional)', async () => {
      const row = [...VALID_ROW]
      row[3] = '' // Teléfono vacío
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.projects[0].data?.phone).toBe(undefined)
    })

    it('marca como inválido si teléfono tiene formato incorrecto', async () => {
      const row = [...VALID_ROW]
      row[3] = '123' // Teléfono muy corto
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].errors.some((e) => e.includes('Teléfono'))).toBe(true)
    })

    it('valida rango de IVA', async () => {
      const row = [...VALID_ROW]
      row[11] = 150 // IVA > 100%
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.projects[0].errors.some((e) => e.includes('IVA'))).toBe(true)
    })

    it('incluye número de fila en resultados', async () => {
      const data = [STANDARD_HEADERS, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.projects[0].rowNumber).toBe(2) // Excel es 1-indexed + header
    })
  })

  describe('errores de estructura', () => {
    it('rechaza archivo sin columnas requeridas', async () => {
      const data = [
        ['Columna1', 'Columna2'], // Sin columnas requeridas
        ['Value1', 'Value2'],
      ]

      const file = createExcelFile(data)

      await expect(parseProjectExcel(file)).rejects.toThrow('Faltan columnas requeridas')
    })

    it('rechaza archivo con solo headers (sin datos)', async () => {
      const data = [STANDARD_HEADERS] // Solo una fila

      const file = createExcelFile(data)

      await expect(parseProjectExcel(file)).rejects.toThrow(
        'El archivo debe tener al menos una fila de encabezados y una fila de datos'
      )
    })

    it('rechaza archivo vacío', async () => {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Sheet1')
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' })
      const file = new File([blob], 'empty.xlsx', { type: blob.type })

      await expect(parseProjectExcel(file)).rejects.toThrow()
    })
  })

  describe('contadores', () => {
    it('cuenta correctamente válidos e inválidos', async () => {
      const data = [
        STANDARD_HEADERS,
        VALID_ROW, // Válido
        [...VALID_ROW].map((v, i) => (i === 0 ? '' : v)), // Inválido - sin número proyecto
        [...VALID_ROW].map((v, i) => (i === 0 ? 'P-002' : v)), // Válido
        [...VALID_ROW].map((v, i) => {
          if (i === 0) return 'P-003'
          if (i === 10) return -100 // Subtotal negativo
          return v
        }), // Inválido
      ]

      const file = createExcelFile(data)
      const result = await parseProjectExcel(file)

      expect(result.validCount).toBe(2)
      expect(result.errorCount).toBe(2)
      expect(result.totalRows).toBe(4)
    })
  })
})
