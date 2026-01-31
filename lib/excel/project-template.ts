/**
 * Datos de ejemplo para el template
 */
const EXAMPLE_DATA = [
  {
    'Número Proyecto': 'PRJ-001',
    Glosa: 'Instalación ventanas living',
    Cliente: 'Juan Pérez',
    Teléfono: '987654321',
    Calle: "Av. Libertador Bernardo O'Higgins 1234",
    Depto: 'Oficina 501',
    Comuna: 'Santiago',
    Región: 'Región Metropolitana',
    Estado: 'En Proceso',
    Fecha: '15/01/2025',
    Subtotal: 1500000,
    'IVA (%)': 19,
    Ventanas: 3,
    'M²': 12.5,
    Descripción: 'Instalación de 3 ventanas de termopanel',
  },
  {
    'Número Proyecto': 'PRJ-002',
    Glosa: '',
    Cliente: 'María González',
    Teléfono: '912345678',
    Calle: 'Los Aromos 567',
    Depto: '',
    Comuna: 'Providencia',
    Región: 'Región Metropolitana',
    Estado: 'Cotización',
    Fecha: '16/01/2025',
    Subtotal: 2800000,
    'IVA (%)': 19,
    Ventanas: 5,
    'M²': 22,
    Descripción: '',
  },
  {
    'Número Proyecto': 'PRJ-003',
    Glosa: 'Reparación ventana rota',
    Cliente: 'Pedro Soto',
    Teléfono: '956789012',
    Calle: 'San Martín 890',
    Depto: 'Casa 12',
    Comuna: 'Las Condes',
    Región: 'Región Metropolitana',
    Estado: 'Finalizado',
    Fecha: '10/01/2025',
    Subtotal: 450000,
    'IVA (%)': 19,
    Ventanas: 1,
    'M²': 3.5,
    Descripción: 'Reparación urgente ventana quebrada',
  },
]

/**
 * Genera y descarga un archivo Excel template para importar proyectos
 */
export async function downloadProjectTemplate(): Promise<void> {
  const XLSX = await import('xlsx')

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos de ejemplo
  const worksheet = XLSX.utils.json_to_sheet(EXAMPLE_DATA)

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 15 }, // Número Proyecto
    { wch: 30 }, // Glosa
    { wch: 25 }, // Cliente
    { wch: 12 }, // Teléfono
    { wch: 40 }, // Calle
    { wch: 12 }, // Depto
    { wch: 18 }, // Comuna
    { wch: 25 }, // Región
    { wch: 15 }, // Estado
    { wch: 12 }, // Fecha
    { wch: 12 }, // Subtotal
    { wch: 10 }, // IVA (%)
    { wch: 10 }, // Ventanas
    { wch: 10 }, // M²
    { wch: 40 }, // Descripción
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyectos')

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
  link.download = `template-proyectos-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Genera un template vacío (sin datos de ejemplo)
 */
export async function downloadEmptyProjectTemplate(): Promise<void> {
  const XLSX = await import('xlsx')

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet solo con headers
  const worksheet = XLSX.utils.json_to_sheet([
    {
      'Número Proyecto': '',
      Glosa: '',
      Cliente: '',
      Teléfono: '',
      Calle: '',
      Depto: '',
      Comuna: '',
      Región: '',
      Estado: '',
      Fecha: '',
      Subtotal: '',
      'IVA (%)': '',
      Ventanas: '',
      'M²': '',
      Descripción: '',
    },
  ])

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 15 }, // Número Proyecto
    { wch: 30 }, // Glosa
    { wch: 25 }, // Cliente
    { wch: 12 }, // Teléfono
    { wch: 40 }, // Calle
    { wch: 12 }, // Depto
    { wch: 18 }, // Comuna
    { wch: 25 }, // Región
    { wch: 15 }, // Estado
    { wch: 12 }, // Fecha
    { wch: 12 }, // Subtotal
    { wch: 10 }, // IVA (%)
    { wch: 10 }, // Ventanas
    { wch: 10 }, // M²
    { wch: 40 }, // Descripción
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyectos')

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
  link.download = `template-proyectos-vacio-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
