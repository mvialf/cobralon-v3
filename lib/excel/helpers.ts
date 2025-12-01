import * as XLSX from 'xlsx'

/**
 * Normaliza el nombre de una columna para matching (case-insensitive, sin acentos)
 *
 * @param column - Nombre de la columna a normalizar
 * @param removeSpecialChars - Si true, remueve caracteres especiales (default: true)
 * @returns Columna normalizada en minúsculas, sin acentos y opcionalmente sin caracteres especiales
 */
export function normalizeColumnName(column: string, removeSpecialChars = true): string {
  let result = column
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos

  if (removeSpecialChars) {
    result = result.replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiales
  }

  return result
}

/**
 * Encuentra el índice de una columna en el header buscando coincidencias parciales
 *
 * @param headers - Array de nombres de columnas del Excel
 * @param possibleNames - Array de posibles nombres a buscar (ya normalizados)
 * @param removeSpecialChars - Pasar a normalizeColumnName (default: true)
 * @returns Índice de la columna encontrada o null si no se encuentra
 */
export function findColumnIndex(
  headers: string[],
  possibleNames: string[],
  removeSpecialChars = true
): number | null {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeColumnName(headers[i], removeSpecialChars)
    if (possibleNames.some((name) => normalized.includes(name))) {
      return i
    }
  }
  return null
}

/**
 * Parsea una fecha desde varios formatos:
 * - Número: Excel date serial (días desde 1900-01-01)
 * - String: DD/MM/YYYY, DD-MM-YYYY, o formato ISO
 * - Date: Retorna si es válido
 *
 * @param value - Valor a parsear
 * @returns Date válido o null si no se puede parsear
 */
export function parseDate(value: unknown): Date | null {
  if (!value) return null

  // Si es un número (Excel date serial)
  if (typeof value === 'number') {
    // Excel dates son días desde 1900-01-01
    const date = XLSX.SSF.parse_date_code(value)
    return new Date(date.y, date.m - 1, date.d)
  }

  // Si es string, intentar parsear
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    // Formato DD/MM/YYYY o DD-MM-YYYY
    const ddmmyyyy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/
    const match = trimmed.match(ddmmyyyy)
    if (match) {
      const [, day, month, year] = match
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }

    // Intentar Date nativo (ISO format, etc.)
    const date = new Date(trimmed)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  // Si ya es Date válido
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value
  }

  return null
}

/**
 * Parsea un número desde string o número
 * Remueve caracteres no numéricos excepto punto y signo
 *
 * @param value - Valor a parsear
 * @param defaultValue - Valor por defecto si no se puede parsear (default: 0)
 * @returns Número parseado o defaultValue
 */
export function parseNumber(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '') // Remover todo excepto dígitos, punto y signo
    const num = parseFloat(cleaned)
    return isNaN(num) ? defaultValue : num
  }
  return defaultValue
}

/**
 * Resultado de validación de archivo Excel
 */
export interface ValidateExcelFileResult {
  valid: boolean
  error?: string
}

/**
 * Valida que un archivo sea un Excel válido (.xlsx o .xls)
 *
 * @param file - Archivo a validar
 * @param maxSizeMB - Tamaño máximo en MB (default: 5)
 * @returns Objeto con resultado de validación
 */
export function validateExcelFile(file: File, maxSizeMB = 5): ValidateExcelFileResult {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ]

  const validExtensions = ['.xlsx', '.xls']

  // Validar tipo MIME
  if (!validTypes.includes(file.type)) {
    const hasValidExtension = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))

    if (!hasValidExtension) {
      return {
        valid: false,
        error: 'El archivo debe ser un Excel (.xlsx o .xls)',
      }
    }
  }

  // Validar tamaño
  const maxSize = maxSizeMB * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `El archivo no debe superar ${maxSizeMB}MB`,
    }
  }

  return { valid: true }
}
