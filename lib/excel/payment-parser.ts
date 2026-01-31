import {
  findColumnIndex,
  parseDate,
  parseNumber,
  validateExcelFile as validateExcelFileHelper,
} from './helpers'

// Re-export validateExcelFile con tamaño máximo de 5MB para pagos (default)
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  return validateExcelFileHelper(file, 5)
}

/**
 * Datos parseados de un pago individual desde Excel
 */
export interface ParsedPaymentRow {
  // Relaciones (búsqueda por identificadores)
  projectNumber: string // Buscar proyecto por número

  // Campos del pago
  amount: number
  date: Date
  paymentMethodName: string // Buscar método por nombre

  // Campos opcionales
  selectedInstallments?: number
  reference?: string
  notes?: string
}

/**
 * Resultado del parsing de un pago individual
 */
export interface ParsedPayment {
  data: ParsedPaymentRow | null
  errors: string[]
  rowNumber: number
  isValid: boolean
}

/**
 * Resultado del parsing completo del archivo Excel
 */
export interface PaymentParseResult {
  payments: ParsedPayment[]
  validCount: number
  errorCount: number
  totalRows: number
}

/**
 * Columnas esperadas en el Excel (case-insensitive, sin acentos)
 */
const EXPECTED_COLUMNS = {
  projectNumber: [
    'numero proyecto',
    'proyecto',
    'n proyecto',
    'project number',
    'numero de proyecto',
  ],
  amount: ['monto', 'amount', 'total', 'valor'],
  date: ['fecha', 'date', 'fecha pago', 'fecha de pago'],
  paymentMethod: ['metodo', 'metodo de pago', 'method', 'payment method', 'metodo pago'],
  installments: ['cuotas', 'installments', 'n cuotas', 'numero cuotas'],
  reference: ['referencia', 'reference', 'n referencia', 'comprobante', 'boleta'],
  notes: ['notas', 'notes', 'observaciones', 'comentarios', 'descripcion', 'descripción'],
}

/**
 * Parsea un archivo Excel y extrae datos de pagos
 */
export async function parsePaymentExcel(file: File): Promise<PaymentParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }

    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx')
        const data = e.target?.result
        if (!data) {
          reject(new Error('No se pudo leer el contenido del archivo'))
          return
        }

        // Leer workbook
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })

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
          blankrows: false,
          raw: false, // Preservar formato de celdas
        })

        if (rawData.length < 2) {
          reject(
            new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos')
          )
          return
        }

        // Primera fila son los headers
        const headers = rawData[0] as string[]

        // Encontrar índices de columnas requeridas
        const projectNumberIndex = findColumnIndex(headers, EXPECTED_COLUMNS.projectNumber)
        const amountIndex = findColumnIndex(headers, EXPECTED_COLUMNS.amount)
        const dateIndex = findColumnIndex(headers, EXPECTED_COLUMNS.date)
        const paymentMethodIndex = findColumnIndex(headers, EXPECTED_COLUMNS.paymentMethod)

        // Validar columnas requeridas
        const missingColumns: string[] = []
        if (projectNumberIndex === null) missingColumns.push('Número Proyecto')
        if (amountIndex === null) missingColumns.push('Monto')
        if (dateIndex === null) missingColumns.push('Fecha')
        if (paymentMethodIndex === null) missingColumns.push('Método de Pago')

        if (missingColumns.length > 0) {
          reject(
            new Error(
              `Faltan columnas requeridas: ${missingColumns.join(', ')}.\n` +
                `Columnas encontradas: ${headers.join(', ')}`
            )
          )
          return
        }

        // Columnas opcionales
        const installmentsIndex = findColumnIndex(headers, EXPECTED_COLUMNS.installments)
        const referenceIndex = findColumnIndex(headers, EXPECTED_COLUMNS.reference)
        const notesIndex = findColumnIndex(headers, EXPECTED_COLUMNS.notes)

        // Parsear cada fila
        const payments: ParsedPayment[] = []

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i]
          const rowNumber = i + 1

          // Saltar filas completamente vacías
          if (!row || row.every((cell) => !cell)) {
            continue
          }

          const errors: string[] = []

          // Extraer valores
          const projectNumber = String(row[projectNumberIndex!] || '').trim()
          const amount = parseNumber(row[amountIndex!])
          const dateValue = row[dateIndex!]
          const paymentMethodName = String(row[paymentMethodIndex!] || '').trim()
          const selectedInstallments =
            installmentsIndex !== null ? parseNumber(row[installmentsIndex], 0) : undefined
          const reference =
            referenceIndex !== null ? String(row[referenceIndex] || '').trim() : undefined
          const notes = notesIndex !== null ? String(row[notesIndex] || '').trim() : undefined

          // Validar campos requeridos
          if (!projectNumber) errors.push('Número de proyecto es requerido')
          if (!amount || amount <= 0) errors.push('Monto debe ser mayor a 0')
          if (!paymentMethodName) errors.push('Método de pago es requerido')

          // Parsear fecha
          const date = await parseDate(dateValue)
          if (!date) {
            errors.push('Fecha inválida (formato esperado: DD/MM/YYYY)')
          }

          // Validar cuotas si existe
          if (selectedInstallments !== undefined && selectedInstallments !== 0) {
            if (selectedInstallments < 1) {
              errors.push('Cuotas debe ser mayor o igual a 1')
            }
            if (!Number.isInteger(selectedInstallments)) {
              errors.push('Cuotas debe ser un número entero')
            }
          }

          if (errors.length === 0 && date) {
            payments.push({
              data: {
                projectNumber,
                amount,
                date,
                paymentMethodName,
                selectedInstallments:
                  selectedInstallments && selectedInstallments > 0
                    ? selectedInstallments
                    : undefined,
                reference: reference || undefined,
                notes: notes || undefined,
              },
              errors: [],
              rowNumber,
              isValid: true,
            })
          } else {
            payments.push({
              data: null,
              errors,
              rowNumber,
              isValid: false,
            })
          }
        }

        const validCount = payments.filter((p) => p.isValid).length
        const errorCount = payments.filter((p) => !p.isValid).length

        resolve({
          payments,
          validCount,
          errorCount,
          totalRows: payments.length,
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
