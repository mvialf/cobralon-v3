import { normalizePhone } from '@/lib/utils/phone'
import { normalizeRegionValue } from '@/lib/regiones-chile'
import {
  findColumnIndex,
  parseDate,
  parseNumber,
  validateExcelFile as validateExcelFileHelper,
} from './helpers'

// Re-export validateExcelFile con tamaño máximo de 10MB para proyectos
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  return validateExcelFileHelper(file, 10)
}

/**
 * Datos parseados de un proyecto individual desde Excel
 */
export interface ParsedProjectRow {
  // Campos básicos
  projectNumber: string
  projectName?: string
  customerName: string
  phone?: string // Opcional - fallback a customer.phone si no se proporciona

  // Dirección
  street: string
  apartment?: string
  comuna: string
  region: string

  // Estado y fecha
  projectStatusName: string
  date: Date

  // Financials
  subtotal: number
  taxRate: number // Default 19%

  // Métricas opcionales
  windowsCount: number
  squareMeters: number
  description?: string
}

/**
 * Resultado del parsing de un proyecto individual
 */
export interface ParsedProject {
  data: ParsedProjectRow | null
  errors: string[]
  rowNumber: number
  isValid: boolean
}

/**
 * Resultado del parsing completo del archivo Excel
 */
export interface ProjectParseResult {
  projects: ParsedProject[]
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
    'numero',
    'n proyecto',
    'project number',
    'numero de proyecto',
  ],
  projectName: ['glosa', 'nombre proyecto', 'project name', 'nombre'],
  customerName: ['cliente', 'customer', 'nombre cliente', 'client'],
  phone: ['telefono', 'teléfono', 'phone', 'fono', 'celular'],
  street: ['calle', 'street', 'direccion', 'dirección'],
  apartment: ['depto', 'departamento', 'apartment', 'oficina', 'numero', 'nro'],
  comuna: ['comuna', 'city', 'municipality'],
  region: ['region', 'región', 'state'],
  projectStatus: ['estado', 'status', 'estado proyecto', 'project status'],
  date: ['fecha', 'date', 'fecha ingreso', 'fecha de ingreso'],
  subtotal: ['subtotal', 'monto', 'amount', 'valor'],
  taxRate: ['iva', 'impuesto', 'tax', 'tasa impuesto', '% iva'],
  windowsCount: ['ventanas', 'elementos', 'windows', 'cantidad'],
  squareMeters: ['m2', 'metros', 'square meters', 'm²', 'metros cuadrados'],
  description: ['descripcion', 'descripción', 'description', 'observaciones', 'notas'],
}

/**
 * Parsea un archivo Excel y extrae datos de proyectos
 */
export async function parseProjectExcel(file: File): Promise<ProjectParseResult> {
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
        const customerNameIndex = findColumnIndex(headers, EXPECTED_COLUMNS.customerName)
        const phoneIndex = findColumnIndex(headers, EXPECTED_COLUMNS.phone)
        const streetIndex = findColumnIndex(headers, EXPECTED_COLUMNS.street)
        const comunaIndex = findColumnIndex(headers, EXPECTED_COLUMNS.comuna)
        const regionIndex = findColumnIndex(headers, EXPECTED_COLUMNS.region)
        const statusIndex = findColumnIndex(headers, EXPECTED_COLUMNS.projectStatus)
        const dateIndex = findColumnIndex(headers, EXPECTED_COLUMNS.date)
        const subtotalIndex = findColumnIndex(headers, EXPECTED_COLUMNS.subtotal)

        // Validar columnas requeridas
        const missingColumns: string[] = []
        if (projectNumberIndex === null) missingColumns.push('Número Proyecto')
        if (customerNameIndex === null) missingColumns.push('Cliente')
        if (phoneIndex === null) missingColumns.push('Teléfono')
        if (streetIndex === null) missingColumns.push('Calle')
        if (comunaIndex === null) missingColumns.push('Comuna')
        if (regionIndex === null) missingColumns.push('Región')
        if (statusIndex === null) missingColumns.push('Estado')
        if (dateIndex === null) missingColumns.push('Fecha')
        if (subtotalIndex === null) missingColumns.push('Subtotal')

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
        const projectNameIndex = findColumnIndex(headers, EXPECTED_COLUMNS.projectName)
        const apartmentIndex = findColumnIndex(headers, EXPECTED_COLUMNS.apartment)
        const taxRateIndex = findColumnIndex(headers, EXPECTED_COLUMNS.taxRate)
        const windowsCountIndex = findColumnIndex(headers, EXPECTED_COLUMNS.windowsCount)
        const squareMetersIndex = findColumnIndex(headers, EXPECTED_COLUMNS.squareMeters)
        const descriptionIndex = findColumnIndex(headers, EXPECTED_COLUMNS.description)

        // Parsear cada fila
        const projects: ParsedProject[] = []

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
          const projectName =
            projectNameIndex !== null ? String(row[projectNameIndex] || '').trim() : undefined
          const customerName = String(row[customerNameIndex!] || '').trim()
          const phone = String(row[phoneIndex!] || '').trim()
          const street = String(row[streetIndex!] || '').trim()
          const apartment =
            apartmentIndex !== null ? String(row[apartmentIndex] || '').trim() : undefined
          const comuna = String(row[comunaIndex!] || '').trim()
          const regionInput = String(row[regionIndex!] || '').trim()
          const projectStatusName = String(row[statusIndex!] || '').trim()
          const dateValue = row[dateIndex!]
          const subtotal = parseNumber(row[subtotalIndex!])
          const taxRate = taxRateIndex !== null ? parseNumber(row[taxRateIndex], 19) : 19
          const windowsCount =
            windowsCountIndex !== null ? parseNumber(row[windowsCountIndex], 0) : 0
          const squareMeters =
            squareMetersIndex !== null ? parseNumber(row[squareMetersIndex], 0) : 0
          const description =
            descriptionIndex !== null ? String(row[descriptionIndex] || '').trim() : undefined

          // Normalizar región (convierte nombres a códigos si es necesario)
          const region = normalizeRegionValue(regionInput)

          // Validar campos requeridos
          if (!projectNumber) errors.push('Número de proyecto es requerido')
          if (!customerName) errors.push('Cliente es requerido')
          // phone es opcional - si no se proporciona, se usará el del cliente
          if (!street) errors.push('Calle es requerida')
          if (!comuna) errors.push('Comuna es requerida')
          if (!regionInput) {
            errors.push('Región es requerida')
          } else if (!region) {
            errors.push(
              `Región "${regionInput}" no es válida. Use código (ej: "13") o nombre (ej: "Metropolitana")`
            )
          }
          if (!projectStatusName) errors.push('Estado es requerido')
          if (!subtotal || subtotal <= 0) errors.push('Subtotal debe ser mayor a 0')

          // Parsear fecha
          const date = await parseDate(dateValue)
          if (!date) {
            errors.push('Fecha inválida (formato esperado: DD/MM/YYYY)')
          }

          // Validar teléfono (solo si se proporciona)
          let normalizedPhone = ''
          if (phone) {
            try {
              normalizedPhone = normalizePhone(phone)
              if (!/^\+56[2-9]\d{8}$/.test(normalizedPhone)) {
                errors.push('Teléfono inválido (formato chileno esperado)')
              }
            } catch {
              errors.push('Teléfono inválido')
            }
          }

          // Validar taxRate
          if (taxRate < 0 || taxRate > 100) {
            errors.push('IVA debe estar entre 0% y 100%')
          }

          if (errors.length === 0 && date && region) {
            projects.push({
              data: {
                projectNumber,
                projectName,
                customerName,
                phone: normalizedPhone || undefined, // undefined si está vacío (fallback a customer.phone)
                street,
                apartment,
                comuna,
                region,
                projectStatusName,
                date,
                subtotal,
                taxRate,
                windowsCount,
                squareMeters,
                description,
              },
              errors: [],
              rowNumber,
              isValid: true,
            })
          } else {
            projects.push({
              data: null,
              errors,
              rowNumber,
              isValid: false,
            })
          }
        }

        const validCount = projects.filter((p) => p.isValid).length
        const errorCount = projects.filter((p) => !p.isValid).length

        resolve({
          projects,
          validCount,
          errorCount,
          totalRows: projects.length,
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
