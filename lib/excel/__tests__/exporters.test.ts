import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { generateCustomersExcelBuffer, type CustomerExportData } from '../customer-exporter'
import { generateProjectsExcelBuffer, type ProjectExportData } from '../project-exporter'
import { generatePaymentsExcelBuffer, type PaymentExportData } from '../payment-exporter'

// =============================================================================
// Helper para leer Excel desde buffer
// =============================================================================
function readExcelFromBuffer(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array' })
}

function getFirstSheetData(workbook: XLSX.WorkBook): unknown[][] {
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { header: 1 })
}

// =============================================================================
// generateCustomersExcelBuffer - 8 tests
// =============================================================================
describe('generateCustomersExcelBuffer', () => {
  const mockCustomers: CustomerExportData[] = [
    {
      id: '1',
      name: 'Juan Pérez',
      phone: '+56912345678',
      email: 'juan@example.com',
      creditBalance: 10000,
      createdAt: new Date('2024-06-15'),
      _count: { projects: 3 },
    },
    {
      id: '2',
      name: 'María González',
      phone: '+56987654321',
      email: null,
      creditBalance: 0,
      createdAt: '2024-07-20',
      _count: { projects: 0 },
    },
  ]

  it('retorna ArrayBuffer válido', async () => {
    const buffer = await generateCustomersExcelBuffer(mockCustomers)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('genera Excel válido que se puede leer', async () => {
    const buffer = await generateCustomersExcelBuffer(mockCustomers)
    const workbook = readExcelFromBuffer(buffer)

    expect(workbook.SheetNames).toContain('Clientes')
    expect(workbook.SheetNames.length).toBe(1)
  })

  it('contiene headers correctos', async () => {
    const buffer = await generateCustomersExcelBuffer(mockCustomers)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const headers = data[0] as string[]
    expect(headers).toContain('Nombre')
    expect(headers).toContain('Teléfono')
    expect(headers).toContain('Email')
    expect(headers).toContain('Saldo a Favor')
    expect(headers).toContain('Fecha Registro')
    expect(headers).toContain('Proyectos')
  })

  it('contiene datos transformados correctamente', async () => {
    const buffer = await generateCustomersExcelBuffer(mockCustomers)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    // Primera fila de datos (índice 1, después de headers)
    const firstRow = data[1] as (string | number)[]
    expect(firstRow).toContain('Juan Pérez')
    expect(firstRow).toContain('+56912345678')
    expect(firstRow).toContain('juan@example.com')
    expect(firstRow).toContain(10000)
    expect(firstRow).toContain(3) // Proyectos
  })

  it('maneja email null correctamente', async () => {
    const buffer = await generateCustomersExcelBuffer(mockCustomers)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    // Segunda fila de datos
    const secondRow = data[2] as (string | number)[]
    expect(secondRow).toContain('María González')
    expect(secondRow).toContain('') // Email vacío
  })

  it('genera Excel para array vacío', async () => {
    const buffer = await generateCustomersExcelBuffer([])
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    // json_to_sheet con array vacío genera hoja vacía
    expect(data.length).toBe(0)
  })

  it('maneja creditBalance como Decimal-like string', async () => {
    const customersWithDecimal: CustomerExportData[] = [
      {
        id: '1',
        name: 'Test',
        phone: '+56912345678',
        email: null,
        creditBalance: '15000.50', // String tipo Decimal
        createdAt: new Date(),
      },
    ]

    const buffer = await generateCustomersExcelBuffer(customersWithDecimal)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const row = data[1] as (string | number)[]
    expect(row).toContain(15000.5)
  })

  it('maneja _count undefined', async () => {
    const customersNoCount: CustomerExportData[] = [
      {
        id: '1',
        name: 'Test',
        phone: '+56912345678',
        email: null,
        creditBalance: 0,
        createdAt: new Date(),
        // Sin _count
      },
    ]

    const buffer = await generateCustomersExcelBuffer(customersNoCount)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const row = data[1] as (string | number)[]
    expect(row).toContain(0) // Proyectos = 0 por defecto
  })
})

// =============================================================================
// generateProjectsExcelBuffer - 8 tests
// =============================================================================
describe('generateProjectsExcelBuffer', () => {
  const mockProjects: ProjectExportData[] = [
    {
      id: '1',
      projectNumber: 'P-001',
      projectName: 'Proyecto Test',
      phone: '+56912345678',
      street: 'Av. Principal 123',
      apartment: 'Depto 45',
      comuna: 'Santiago',
      region: '13',
      date: new Date('2024-06-15'),
      subtotal: 1000000,
      taxRate: 19,
      totalAmount: 1190000,
      balance: 500000,
      windowsCount: 10,
      squareMeters: 25.5,
      description: 'Descripción del proyecto',
      customer: { name: 'Juan Pérez' },
      projectStatus: { name: 'En Proceso' },
    },
    {
      id: '2',
      projectNumber: 'P-002',
      projectName: null,
      phone: '+56987654321',
      street: 'Calle Secundaria 456',
      apartment: null,
      comuna: 'Providencia',
      region: '13',
      date: '2024-07-20',
      subtotal: '500000',
      taxRate: '19',
      totalAmount: '595000',
      balance: '0',
      windowsCount: 5,
      squareMeters: '12.5',
      description: null,
      customer: { name: 'María González' },
      projectStatus: null,
    },
  ]

  it('retorna ArrayBuffer válido', async () => {
    const buffer = await generateProjectsExcelBuffer(mockProjects)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('genera Excel con hoja "Proyectos"', async () => {
    const buffer = await generateProjectsExcelBuffer(mockProjects)
    const workbook = readExcelFromBuffer(buffer)

    expect(workbook.SheetNames).toContain('Proyectos')
  })

  it('contiene headers de proyecto correctos', async () => {
    const buffer = await generateProjectsExcelBuffer(mockProjects)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const headers = data[0] as string[]
    expect(headers).toContain('Número Proyecto')
    expect(headers).toContain('Glosa')
    expect(headers).toContain('Cliente')
    expect(headers).toContain('Estado')
    expect(headers).toContain('Subtotal')
    expect(headers).toContain('Total')
    expect(headers).toContain('Saldo')
  })

  it('contiene datos de proyecto transformados', async () => {
    const buffer = await generateProjectsExcelBuffer(mockProjects)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const firstRow = data[1] as (string | number)[]
    expect(firstRow).toContain('P-001')
    expect(firstRow).toContain('Proyecto Test')
    expect(firstRow).toContain('Juan Pérez')
    expect(firstRow).toContain('En Proceso')
    expect(firstRow).toContain(1000000)
    expect(firstRow).toContain(1190000)
  })

  it('maneja projectStatus null', async () => {
    const buffer = await generateProjectsExcelBuffer(mockProjects)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const secondRow = data[2] as (string | number)[]
    expect(secondRow).toContain('Sin estado')
  })

  it('maneja valores null/undefined', async () => {
    const buffer = await generateProjectsExcelBuffer(mockProjects)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const secondRow = data[2] as (string | number)[]
    expect(secondRow).toContain('') // projectName null
    expect(secondRow).toContain('') // apartment null
  })

  it('convierte Decimal-like strings a números', async () => {
    const buffer = await generateProjectsExcelBuffer(mockProjects)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const secondRow = data[2] as (string | number)[]
    expect(secondRow).toContain(500000) // subtotal como número
    expect(secondRow).toContain(595000) // total como número
  })

  it('genera Excel para array vacío', async () => {
    const buffer = await generateProjectsExcelBuffer([])
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    // json_to_sheet con array vacío genera hoja vacía
    expect(data.length).toBe(0)
  })
})

// =============================================================================
// generatePaymentsExcelBuffer - 8 tests
// =============================================================================
describe('generatePaymentsExcelBuffer', () => {
  const mockPayments: PaymentExportData[] = [
    {
      id: '1',
      amount: 500000,
      currency: 'CLP',
      date: new Date('2024-06-15'),
      reference: 'REF-001',
      notes: 'Pago inicial',
      type: 'Project',
      selectedInstallments: 3,
      customer: { name: 'Juan Pérez' },
      paymentMethod: { name: 'Transferencia' },
      allocations: [
        {
          allocatedAmount: 500000,
          project: { projectNumber: 'P-001', projectName: 'Proyecto Test' },
        },
      ],
    },
    {
      id: '2',
      amount: '250000',
      currency: 'CLP',
      date: '2024-07-20',
      reference: null,
      notes: null,
      type: 'Customer',
      selectedInstallments: null,
      customer: { name: 'María González' },
      paymentMethod: null,
      allocations: [
        {
          allocatedAmount: '100000',
          project: { projectNumber: 'P-002', projectName: null },
        },
        {
          allocatedAmount: '150000',
          project: { projectNumber: 'P-003', projectName: 'Otro Proyecto' },
        },
      ],
    },
  ]

  it('retorna ArrayBuffer válido', async () => {
    const buffer = await generatePaymentsExcelBuffer(mockPayments)
    expect(buffer).toBeInstanceOf(ArrayBuffer)
    expect(buffer.byteLength).toBeGreaterThan(0)
  })

  it('genera Excel con hoja "Pagos"', async () => {
    const buffer = await generatePaymentsExcelBuffer(mockPayments)
    const workbook = readExcelFromBuffer(buffer)

    expect(workbook.SheetNames).toContain('Pagos')
  })

  it('contiene headers de pago correctos', async () => {
    const buffer = await generatePaymentsExcelBuffer(mockPayments)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const headers = data[0] as string[]
    expect(headers).toContain('Fecha')
    expect(headers).toContain('Monto')
    expect(headers).toContain('Moneda')
    expect(headers).toContain('Tipo')
    expect(headers).toContain('Cliente')
    expect(headers).toContain('Método de Pago')
    expect(headers).toContain('Proyectos')
    expect(headers).toContain('Cuotas')
  })

  it('transforma tipo Project a "Proyecto"', async () => {
    const buffer = await generatePaymentsExcelBuffer(mockPayments)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const firstRow = data[1] as (string | number)[]
    expect(firstRow).toContain('Proyecto')
  })

  it('transforma tipo Customer a "Cliente"', async () => {
    const buffer = await generatePaymentsExcelBuffer(mockPayments)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const secondRow = data[2] as (string | number)[]
    expect(secondRow).toContain('Cliente')
  })

  it('concatena múltiples proyectos en allocations', async () => {
    const buffer = await generatePaymentsExcelBuffer(mockPayments)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const secondRow = data[2] as (string | number)[]
    // Buscar el valor que contiene los proyectos concatenados
    const proyectosCell = secondRow.find(
      (cell) => typeof cell === 'string' && cell.includes('P-002') && cell.includes('P-003')
    )
    expect(proyectosCell).toBeDefined()
  })

  it('maneja paymentMethod null', async () => {
    const buffer = await generatePaymentsExcelBuffer(mockPayments)
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    const secondRow = data[2] as (string | number)[]
    expect(secondRow).toContain('Sin especificar')
  })

  it('genera Excel para array vacío', async () => {
    const buffer = await generatePaymentsExcelBuffer([])
    const workbook = readExcelFromBuffer(buffer)
    const data = getFirstSheetData(workbook)

    // json_to_sheet con array vacío genera hoja vacía
    expect(data.length).toBe(0)
  })
})
