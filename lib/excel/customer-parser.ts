import * as XLSX from 'xlsx'
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer-validations'

/**
 * Resultado del parsing de un cliente individual
 */
export interface ParsedCustomer {
  data: CustomerFormData | null
  errors: string[]
  rowNumber: number
  isValid: boolean
}

/**
 * Resultado del parsing completo del archivo Excel
 */
export interface ParseResult {
  customers: ParsedCustomer[]
  validCount: number
  errorCount: number
  totalRows: number
}

/**
 * Columnas esperadas en el Excel (case-insensitive)
 */
const EXPECTED_COLUMNS = {
  name: ['nombre', 'name', 'cliente', 'customer'],
  phone: ['telefono', 'teléfono', 'phone', 'fono', 'celular'],
  email: ['email', 'correo', 'mail', 'e-mail'],
}

/**
 * Normaliza el nombre de una columna para matching
 */
function normalizeColumnName(column: string): string {
  return column
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
}

/**
 * Encuentra el índice de una columna en el header
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number | null {
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeColumnName(headers[i])
    if (possibleNames.some((name) => normalized.includes(name))) {
      return i
    }
  }
  return null
}

/**
 * Parsea un archivo Excel y valida los datos de clientes
 */
export async function parseCustomerExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('No se pudo leer el contenido del archivo'))
          return
        }

        // Leer workbook
        const workbook = XLSX.read(data, { type: 'binary' })

        // Obtener primera hoja
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          reject(new Error('El archivo Excel está vacío'))
          return
        }

        const worksheet = workbook.Sheets[firstSheetName]

        // Convertir a array de arrays
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false, // Ignorar filas vacías
        })

        if (rawData.length < 2) {
          reject(
            new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos')
          )
          return
        }

        // Primera fila son los headers
        const headers = rawData[0] as string[]

        // Encontrar índices de columnas
        const nameIndex = findColumnIndex(headers, EXPECTED_COLUMNS.name)
        const phoneIndex = findColumnIndex(headers, EXPECTED_COLUMNS.phone)
        const emailIndex = findColumnIndex(headers, EXPECTED_COLUMNS.email)

        if (nameIndex === null || phoneIndex === null) {
          reject(
            new Error(
              'El archivo debe tener al menos las columnas "Nombre" y "Teléfono".\n' +
                'Columnas encontradas: ' +
                headers.join(', ')
            )
          )
          return
        }

        // Parsear cada fila
        const customers: ParsedCustomer[] = []

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i]
          const rowNumber = i + 1 // Excel es 1-indexed

          // Saltar filas completamente vacías
          if (!row || row.every((cell) => !cell)) {
            continue
          }

          const rawCustomer = {
            name: String(row[nameIndex] || '').trim(),
            phone: String(row[phoneIndex] || '').trim(),
            email: emailIndex !== null ? String(row[emailIndex] || '').trim() : '',
          }

          // Validar con Zod
          const result = customerSchema.safeParse(rawCustomer)

          if (result.success) {
            customers.push({
              data: result.data,
              errors: [],
              rowNumber,
              isValid: true,
            })
          } else {
            const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`)

            customers.push({
              data: null,
              errors,
              rowNumber,
              isValid: false,
            })
          }
        }

        const validCount = customers.filter((c) => c.isValid).length
        const errorCount = customers.filter((c) => !c.isValid).length

        resolve({
          customers,
          validCount,
          errorCount,
          totalRows: customers.length,
        })
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error('Error desconocido al procesar el archivo')
        )
      }
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Valida que un archivo sea un Excel válido
 */
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
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

  // Validar tamaño (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'El archivo no debe superar 5MB',
    }
  }

  return { valid: true }
}
