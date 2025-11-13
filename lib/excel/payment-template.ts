import * as XLSX from 'xlsx'

/**
 * Datos de ejemplo para el template
 */
const EXAMPLE_DATA = [
  {
    'Número Proyecto': 'PRJ-001',
    Monto: 500000,
    Fecha: '15/01/2025',
    'Método de Pago': 'Transferencia',
    Cuotas: '',
    Referencia: 'TRANS-001',
    Notas: 'Pago parcial proyecto ventanas',
  },
  {
    'Número Proyecto': 'PRJ-002',
    Monto: 1200000,
    Fecha: '16/01/2025',
    'Método de Pago': 'Tarjeta de Crédito',
    Cuotas: 3,
    Referencia: 'TC-4521',
    Notas: '',
  },
  {
    'Número Proyecto': 'PRJ-003',
    Monto: 800000,
    Fecha: '17/01/2025',
    'Método de Pago': 'Efectivo',
    Cuotas: '',
    Referencia: 'BOL-789',
    Notas: 'Pago completo en efectivo',
  },
]

/**
 * Genera y descarga un archivo Excel template para importar pagos
 */
export function downloadPaymentTemplate(): void {
  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos de ejemplo
  const worksheet = XLSX.utils.json_to_sheet(EXAMPLE_DATA)

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 18 }, // Número Proyecto
    { wch: 12 }, // Monto
    { wch: 12 }, // Fecha
    { wch: 20 }, // Método de Pago
    { wch: 10 }, // Cuotas
    { wch: 15 }, // Referencia
    { wch: 40 }, // Notas
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')

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
  link.download = `template-pagos-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Genera un template vacío (sin datos de ejemplo)
 */
export function downloadEmptyPaymentTemplate(): void {
  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet solo con headers
  const worksheet = XLSX.utils.json_to_sheet([
    {
      'Número Proyecto': '',
      Monto: '',
      Fecha: '',
      'Método de Pago': '',
      Cuotas: '',
      Referencia: '',
      Notas: '',
    },
  ])

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 18 }, // Número Proyecto
    { wch: 12 }, // Monto
    { wch: 12 }, // Fecha
    { wch: 20 }, // Método de Pago
    { wch: 10 }, // Cuotas
    { wch: 15 }, // Referencia
    { wch: 40 }, // Notas
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')

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
  link.download = `template-pagos-vacio-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
