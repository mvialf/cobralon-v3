import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parsePaymentExcel, validateExcelFile } from '../payment-parser'

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

// Headers estándar para pagos
const STANDARD_HEADERS = [
  'Numero Proyecto',
  'Monto',
  'Fecha',
  'Metodo de Pago',
  'Cuotas',
  'Referencia',
  'Notas',
]

// Fila de datos válida
const VALID_ROW = ['P-001', 500000, '15/06/2024', 'Transferencia', 3, 'REF-001', 'Pago inicial']

// =============================================================================
// validateExcelFile - Tests específicos para pagos (5MB límite)
// =============================================================================
describe('validateExcelFile (payment-parser)', () => {
  it('acepta archivos Excel válidos', () => {
    const file = createExcelFile([STANDARD_HEADERS, VALID_ROW])
    const result = validateExcelFile(file)
    expect(result.valid).toBe(true)
  })

  it('rechaza archivos que exceden 5MB', () => {
    // El límite para pagos es 5MB (default)
    const largeBuffer = new ArrayBuffer(6 * 1024 * 1024) // 6MB
    const blob = new Blob([largeBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const file = new File([blob], 'large.xlsx', { type: blob.type })

    const result = validateExcelFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('5MB')
  })
})

// =============================================================================
// parsePaymentExcel - Tests
// =============================================================================
describe('parsePaymentExcel', () => {
  describe('parsing exitoso', () => {
    it('parsea Excel con datos válidos', async () => {
      const data = [STANDARD_HEADERS, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.errorCount).toBe(0)
      expect(result.totalRows).toBe(1)
    })

    it('extrae todos los campos correctamente', async () => {
      const data = [STANDARD_HEADERS, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      const payment = result.payments[0].data
      expect(payment?.projectNumber).toBe('P-001')
      expect(payment?.amount).toBe(500000)
      expect(payment?.paymentMethodName).toBe('Transferencia')
      expect(payment?.selectedInstallments).toBe(3)
      expect(payment?.reference).toBe('REF-001')
      expect(payment?.notes).toBe('Pago inicial')
    })

    it('parsea múltiples filas válidas', async () => {
      const data = [
        STANDARD_HEADERS,
        VALID_ROW,
        ['P-002', 250000, '20/07/2024', 'Efectivo', 1, '', ''],
      ]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(2)
      expect(result.totalRows).toBe(2)
    })

    it('maneja campos opcionales vacíos', async () => {
      // Headers solo con requeridos
      const headers = ['Numero Proyecto', 'Monto', 'Fecha', 'Metodo de Pago']
      const row = ['P-001', 500000, '15/06/2024', 'Transferencia']
      const data = [headers, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(1)
      const payment = result.payments[0].data
      expect(payment?.selectedInstallments).toBeUndefined()
      expect(payment?.reference).toBeUndefined()
      expect(payment?.notes).toBeUndefined()
    })

    it('ignora cuotas 0 (las trata como undefined)', async () => {
      const row = [...VALID_ROW]
      row[4] = 0 // Cuotas = 0
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.payments[0].data?.selectedInstallments).toBeUndefined()
    })

    it('ignora filas vacías', async () => {
      const data = [
        STANDARD_HEADERS,
        VALID_ROW,
        ['', '', '', '', '', '', ''], // Fila vacía
        ['P-002', 250000, '20/07/2024', 'Efectivo', '', '', ''],
      ]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.totalRows).toBe(2) // Solo 2 filas con datos
    })
  })

  describe('nombres alternativos de columnas', () => {
    it('encuentra columna con nombre alternativo "Proyecto"', async () => {
      const headers = ['Proyecto', 'Monto', 'Fecha', 'Metodo']
      const row = ['P-001', 500000, '15/06/2024', 'Transferencia']
      const data = [headers, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.payments[0].data?.projectNumber).toBe('P-001')
    })

    it('encuentra columna "amount" en inglés', async () => {
      const headers = ['Proyecto', 'Amount', 'Date', 'Method']
      const row = ['P-001', 500000, '15/06/2024', 'Transferencia']
      const data = [headers, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.payments[0].data?.amount).toBe(500000)
    })

    it('ignora mayúsculas/minúsculas en headers', async () => {
      const headers = ['NUMERO PROYECTO', 'MONTO', 'FECHA', 'METODO DE PAGO']
      const row = ['P-001', 500000, '15/06/2024', 'Transferencia']
      const data = [headers, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(1)
    })
  })

  describe('validación de datos', () => {
    it('marca como inválido si número proyecto está vacío', async () => {
      const row = [...VALID_ROW]
      row[0] = '' // Número proyecto vacío
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.payments[0].isValid).toBe(false)
      expect(result.payments[0].errors.some((e) => e.includes('proyecto'))).toBe(true)
    })

    it('marca como inválido si monto es 0', async () => {
      const row = [...VALID_ROW]
      row[1] = 0 // Monto = 0
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.payments[0].errors.some((e) => e.includes('Monto'))).toBe(true)
    })

    it('marca como inválido si monto es negativo', async () => {
      const row = [...VALID_ROW]
      row[1] = -100 // Monto negativo
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.errorCount).toBe(1)
    })

    it('marca como inválido si método de pago está vacío', async () => {
      const row = [...VALID_ROW]
      row[3] = '' // Método vacío
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.payments[0].errors.some((e) => e.includes('Método'))).toBe(true)
    })

    it('marca como inválido si fecha es inválida', async () => {
      const row = [...VALID_ROW]
      row[2] = 'no-es-fecha'
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.payments[0].errors.some((e) => e.includes('Fecha'))).toBe(true)
    })

    it('marca como inválido si cuotas es negativo', async () => {
      const row = [...VALID_ROW]
      row[4] = -1 // Cuotas negativas
      const data = [STANDARD_HEADERS, row]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.payments[0].errors.some((e) => e.includes('Cuotas'))).toBe(true)
    })

    it('incluye número de fila en resultados', async () => {
      const data = [STANDARD_HEADERS, VALID_ROW]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.payments[0].rowNumber).toBe(2) // Excel es 1-indexed + header
    })
  })

  describe('errores de estructura', () => {
    it('rechaza archivo sin columnas requeridas', async () => {
      const data = [
        ['Columna1', 'Columna2'], // Sin columnas requeridas
        ['Value1', 'Value2'],
      ]

      const file = createExcelFile(data)

      await expect(parsePaymentExcel(file)).rejects.toThrow('Faltan columnas requeridas')
    })

    it('indica qué columnas faltan', async () => {
      const data = [
        ['Numero Proyecto', 'Fecha'], // Sin Monto ni Método
        ['P-001', '15/06/2024'],
      ]

      const file = createExcelFile(data)

      await expect(parsePaymentExcel(file)).rejects.toThrow('Monto')
    })

    it('rechaza archivo con solo headers (sin datos)', async () => {
      const data = [STANDARD_HEADERS] // Solo una fila

      const file = createExcelFile(data)

      await expect(parsePaymentExcel(file)).rejects.toThrow(
        'El archivo debe tener al menos una fila de encabezados y una fila de datos'
      )
    })

    it('rechaza archivo vacío', async () => {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Sheet1')
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' })
      const file = new File([blob], 'empty.xlsx', { type: blob.type })

      await expect(parsePaymentExcel(file)).rejects.toThrow()
    })
  })

  describe('contadores', () => {
    it('cuenta correctamente válidos e inválidos', async () => {
      const data = [
        STANDARD_HEADERS,
        VALID_ROW, // Válido
        ['', 500000, '15/06/2024', 'Transferencia', '', '', ''], // Inválido - sin proyecto
        ['P-002', 250000, '20/07/2024', 'Efectivo', '', '', ''], // Válido
        ['P-003', -100, '25/07/2024', 'Cheque', '', '', ''], // Inválido - monto negativo
      ]

      const file = createExcelFile(data)
      const result = await parsePaymentExcel(file)

      expect(result.validCount).toBe(2)
      expect(result.errorCount).toBe(2)
      expect(result.totalRows).toBe(4)
    })
  })
})
