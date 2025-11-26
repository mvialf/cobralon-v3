import * as XLSX from 'xlsx'

import type { Decimal } from '@prisma/client/runtime/library'

/**
 * Tipo de cliente para exportación
 * Incluye campos calculados como conteo de proyectos
 */
export interface CustomerExportData {
  id: string
  name: string
  phone: string
  email: string | null
  creditBalance: number | string | Decimal // Puede venir como Decimal de Prisma
  createdAt: Date | string
  _count?: {
    projects: number
  }
}

/**
 * Transforma los datos de cliente al formato de Excel
 */
function transformCustomerData(customers: CustomerExportData[]) {
  return customers.map((customer) => ({
    Nombre: customer.name,
    Teléfono: customer.phone,
    Email: customer.email || '',
    'Saldo a Favor': Number(customer.creditBalance),
    'Fecha Registro': new Date(customer.createdAt).toLocaleDateString('es-CL'),
    Proyectos: customer._count?.projects ?? 0,
  }))
}

/**
 * Genera y descarga un archivo Excel con los clientes
 * @param customers - Array de clientes a exportar
 * @param filename - Nombre del archivo (sin extensión)
 */
export function exportCustomersToExcel(customers: CustomerExportData[], filename?: string): void {
  // Transformar datos
  const data = transformCustomerData(customers)

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 30 }, // Nombre
    { wch: 15 }, // Teléfono
    { wch: 30 }, // Email
    { wch: 15 }, // Saldo a Favor
    { wch: 15 }, // Fecha Registro
    { wch: 12 }, // Proyectos
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
  link.download = filename
    ? `${filename}.xlsx`
    : `clientes-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Genera el buffer del Excel para uso en API routes (server-side)
 * @param customers - Array de clientes a exportar
 * @returns ArrayBuffer del archivo Excel (compatible con Response/Blob)
 */
export function generateCustomersExcelBuffer(customers: CustomerExportData[]): ArrayBuffer {
  // Transformar datos
  const data = transformCustomerData(customers)

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 30 }, // Nombre
    { wch: 15 }, // Teléfono
    { wch: 30 }, // Email
    { wch: 15 }, // Saldo a Favor
    { wch: 15 }, // Fecha Registro
    { wch: 12 }, // Proyectos
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')

  // Generar array buffer
  const excelArray: number[] = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  // Convertir a ArrayBuffer (compatible con Blob y Response)
  return new Uint8Array(excelArray).buffer
}
