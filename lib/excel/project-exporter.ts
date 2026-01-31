import type { Decimal } from '@prisma/client/runtime/library'

/**
 * Tipo de proyecto para exportación
 * Incluye relaciones necesarias (customer, projectStatus)
 */
export interface ProjectExportData {
  id: string
  projectNumber: string
  projectName: string | null
  phone: string
  street: string
  apartment: string | null
  comuna: string
  region: string
  date: Date | string
  subtotal: number | string | Decimal
  taxRate: number | string | Decimal
  total: number | string | Decimal
  balance: number | string | Decimal
  windowsCount: number
  squareMeters: number | string | Decimal
  description: string | null
  customer: {
    name: string
  }
  projectStatus?: {
    name: string
  } | null
}

/**
 * Transforma los datos de proyecto al formato de Excel
 */
function transformProjectData(projects: ProjectExportData[]) {
  return projects.map((project) => ({
    'Número Proyecto': project.projectNumber,
    Glosa: project.projectName || '',
    Cliente: project.customer.name,
    Teléfono: project.phone,
    Calle: project.street,
    Depto: project.apartment || '',
    Comuna: project.comuna,
    Región: project.region,
    Estado: project.projectStatus?.name || 'Sin estado',
    Fecha: new Date(project.date).toLocaleDateString('es-CL'),
    Subtotal: Number(project.subtotal),
    'IVA (%)': Number(project.taxRate),
    Total: Number(project.total),
    Saldo: Number(project.balance),
    Ventanas: project.windowsCount,
    'M²': Number(project.squareMeters),
    Descripción: project.description || '',
  }))
}

/**
 * Genera y descarga un archivo Excel con los proyectos (client-side)
 * @param projects - Array de proyectos a exportar
 * @param filename - Nombre del archivo (sin extensión)
 */
export async function exportProjectsToExcel(
  projects: ProjectExportData[],
  filename?: string
): Promise<void> {
  const XLSX = await import('xlsx')

  // Transformar datos
  const data = transformProjectData(projects)

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos
  const worksheet = XLSX.utils.json_to_sheet(data)

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
    { wch: 12 }, // Total
    { wch: 12 }, // Saldo
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
  link.download = filename
    ? `${filename}.xlsx`
    : `proyectos-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Genera el buffer del Excel para uso en API routes (server-side)
 * @param projects - Array de proyectos a exportar
 * @returns ArrayBuffer del archivo Excel (compatible con Response/Blob)
 */
export async function generateProjectsExcelBuffer(
  projects: ProjectExportData[]
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx')

  // Transformar datos
  const data = transformProjectData(projects)

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos
  const worksheet = XLSX.utils.json_to_sheet(data)

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
    { wch: 12 }, // Total
    { wch: 12 }, // Saldo
    { wch: 10 }, // Ventanas
    { wch: 10 }, // M²
    { wch: 40 }, // Descripción
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyectos')

  // Generar array buffer
  const excelArray: number[] = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  // Convertir a ArrayBuffer (compatible con Blob y Response)
  return new Uint8Array(excelArray).buffer
}
