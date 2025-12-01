import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseCustomerExcel } from '../customer-parser'

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

// =============================================================================
// parseCustomerExcel - Tests
// =============================================================================
describe('parseCustomerExcel', () => {
  describe('parsing exitoso', () => {
    it('parsea Excel con datos válidos', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['Juan Pérez', '912345678', 'juan@example.com'],
        ['María González', '987654321', 'maria@example.com'],
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.validCount).toBe(2)
      expect(result.errorCount).toBe(0)
      expect(result.totalRows).toBe(2)
    })

    it('normaliza teléfonos automáticamente', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['Test User', '912345678', ''],
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.customers[0].data?.phone).toBe('+56912345678')
    })

    it('maneja email opcional', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['Sin Email', '912345678', ''],
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.customers[0].data?.email).toBe('')
    })

    it('encuentra columnas con nombres alternativos', async () => {
      // Usar nombres alternativos de columnas
      const data = [
        ['Cliente', 'Fono', 'Correo'], // Nombres alternativos
        ['Test User', '912345678', 'test@example.com'],
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.validCount).toBe(1)
      expect(result.customers[0].data?.name).toBe('Test User')
    })

    it('ignora mayúsculas/minúsculas en headers', async () => {
      const data = [
        ['NOMBRE', 'TELÉFONO', 'EMAIL'],
        ['Test User', '912345678', 'test@example.com'],
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.validCount).toBe(1)
    })

    it('ignora filas vacías', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['User 1', '912345678', ''],
        ['', '', ''], // Fila vacía
        ['User 2', '987654321', ''],
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.totalRows).toBe(2) // Solo 2 filas con datos
    })
  })

  describe('validación de datos', () => {
    it('marca como inválido si nombre está vacío', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['', '912345678', 'test@example.com'], // Nombre vacío
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.customers[0].isValid).toBe(false)
      expect(result.customers[0].errors.some((e) => e.includes('nombre'))).toBe(true)
    })

    it('marca como inválido si teléfono está vacío', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['Test User', '', 'test@example.com'], // Teléfono vacío
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.customers[0].isValid).toBe(false)
    })

    it('marca como inválido si teléfono tiene formato incorrecto', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['Test User', '123', 'test@example.com'], // Teléfono muy corto
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.customers[0].isValid).toBe(false)
    })

    it('valida email cuando se proporciona', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['Test User', '912345678', 'not-an-email'], // Email inválido
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.errorCount).toBe(1)
      expect(result.customers[0].isValid).toBe(false)
    })

    it('incluye número de fila en resultados', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['User 1', '912345678', ''],
        ['User 2', '987654321', ''],
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.customers[0].rowNumber).toBe(2) // Excel es 1-indexed
      expect(result.customers[1].rowNumber).toBe(3)
    })
  })

  describe('errores de estructura', () => {
    it('rechaza archivo sin columnas requeridas', async () => {
      const data = [
        ['Columna1', 'Columna2'], // Sin Nombre ni Teléfono
        ['Value1', 'Value2'],
      ]

      const file = createExcelFile(data)

      await expect(parseCustomerExcel(file)).rejects.toThrow()
    })

    it('rechaza archivo con solo headers (sin datos)', async () => {
      const data = [['Nombre', 'Teléfono', 'Email']] // Solo una fila

      const file = createExcelFile(data)

      await expect(parseCustomerExcel(file)).rejects.toThrow(
        'El archivo debe tener al menos una fila de encabezados y una fila de datos'
      )
    })

    it('rechaza archivo vacío', async () => {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), 'Sheet1')
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' })
      const file = new File([blob], 'empty.xlsx', { type: blob.type })

      await expect(parseCustomerExcel(file)).rejects.toThrow()
    })
  })

  describe('contadores', () => {
    it('cuenta correctamente válidos e inválidos', async () => {
      const data = [
        ['Nombre', 'Teléfono', 'Email'],
        ['Valid User', '912345678', ''], // Válido
        ['', '912345678', ''], // Inválido - sin nombre
        ['Another Valid', '987654321', ''], // Válido
        ['Bad Phone', '123', ''], // Inválido - teléfono corto
      ]

      const file = createExcelFile(data)
      const result = await parseCustomerExcel(file)

      expect(result.validCount).toBe(2)
      expect(result.errorCount).toBe(2)
      expect(result.totalRows).toBe(4)
    })
  })
})
