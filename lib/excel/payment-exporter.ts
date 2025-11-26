import * as XLSX from 'xlsx'

import type { Decimal } from '@prisma/client/runtime/library'

/**
 * Tipo de pago para exportación
 * Incluye relaciones necesarias (customer, paymentMethod, allocations)
 */
export interface PaymentExportData {
  id: string
  amount: number | string | Decimal
  currency: string
  date: Date | string
  reference: string | null
  notes: string | null
  type: string
  selectedInstallments: number | null
  customer: {
    name: string
  }
  paymentMethod: {
    name: string
  } | null
  allocations: Array<{
    allocatedAmount: number | string | Decimal
    project: {
      projectNumber: string
      projectName: string | null
    }
  }>
}

/**
 * Transforma los datos de pago al formato de Excel
 */
function transformPaymentData(payments: PaymentExportData[]) {
  return payments.map((payment) => {
    // Concatenar proyectos asignados
    const proyectos = payment.allocations
      .map((a) => {
        const name = a.project.projectName ? ` - ${a.project.projectName}` : ''
        return `${a.project.projectNumber}${name}`
      })
      .join(', ')

    return {
      Fecha: new Date(payment.date).toLocaleDateString('es-CL'),
      Monto: Number(payment.amount),
      Moneda: payment.currency,
      Tipo: payment.type === 'Project' ? 'Proyecto' : 'Cliente',
      Cliente: payment.customer.name,
      'Método de Pago': payment.paymentMethod?.name || 'Sin especificar',
      Proyectos: proyectos,
      Cuotas: payment.selectedInstallments || 1,
      Referencia: payment.reference || '',
      Notas: payment.notes || '',
    }
  })
}

/**
 * Genera y descarga un archivo Excel con los pagos (client-side)
 * @param payments - Array de pagos a exportar
 * @param filename - Nombre del archivo (sin extensión)
 */
export function exportPaymentsToExcel(payments: PaymentExportData[], filename?: string): void {
  // Transformar datos
  const data = transformPaymentData(payments)

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 15 }, // Monto
    { wch: 8 }, // Moneda
    { wch: 10 }, // Tipo
    { wch: 25 }, // Cliente
    { wch: 18 }, // Método de Pago
    { wch: 40 }, // Proyectos
    { wch: 8 }, // Cuotas
    { wch: 20 }, // Referencia
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
  link.download = filename
    ? `${filename}.xlsx`
    : `pagos-${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Genera el buffer del Excel para uso en API routes (server-side)
 * @param payments - Array de pagos a exportar
 * @returns ArrayBuffer del archivo Excel (compatible con Response/Blob)
 */
export function generatePaymentsExcelBuffer(payments: PaymentExportData[]): ArrayBuffer {
  // Transformar datos
  const data = transformPaymentData(payments)

  // Crear workbook
  const workbook = XLSX.utils.book_new()

  // Crear worksheet con datos
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Configurar ancho de columnas
  worksheet['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 15 }, // Monto
    { wch: 8 }, // Moneda
    { wch: 10 }, // Tipo
    { wch: 25 }, // Cliente
    { wch: 18 }, // Método de Pago
    { wch: 40 }, // Proyectos
    { wch: 8 }, // Cuotas
    { wch: 20 }, // Referencia
    { wch: 40 }, // Notas
  ]

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')

  // Generar array buffer
  const excelArray: number[] = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  // Convertir a ArrayBuffer (compatible con Blob y Response)
  return new Uint8Array(excelArray).buffer
}
