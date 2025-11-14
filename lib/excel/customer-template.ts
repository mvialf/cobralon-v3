import * as XLSX from 'xlsx'

/**
 * Datos de ejemplo para el template
 */
const EXAMPLE_DATA = [
  {
    Nombre: 'Juan Pérez',
    Teléfono: '987654321',
    Email: 'juan@example.com',
  },
  {
    Nombre: 'María González',
    Teléfono: '912345678',
    Email: '',
  },
  {
    Nombre: 'Pedro Soto',
    Teléfono: '956789012',
    Email: 'pedro@example.com',
  },
]

/**
 * Genera y descarga un archivo Excel template para importar clientes
 */
export function downloadCustomerTemplate(): void {
  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos de ejemplo
  const worksheet = XLSX.utils.json_to_sheet(EXAMPLE_DATA)

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 25 }, // Nombre
    { wch: 15 }, // Teléfono
    { wch: 30 }, // Email
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')

  // Generar archivo
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  // Crear blob y descargar
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `template-clientes-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Genera un template vacío (sin datos de ejemplo)
 */
export function downloadEmptyCustomerTemplate(): void {
  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet solo con headers
  const worksheet = XLSX.utils.json_to_sheet([{ Nombre: '', Teléfono: '', Email: '' }])

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 25 }, // Nombre
    { wch: 15 }, // Teléfono
    { wch: 30 }, // Email
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')

  // Generar archivo
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  // Crear blob y descargar
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `template-clientes-vacio-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
