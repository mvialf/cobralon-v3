/**
 * Script para generar fixtures Excel de prueba
 *
 * Ejecutar con: npx tsx tests/fixtures/generate-fixtures.ts
 */
import * as XLSX from 'xlsx'
import * as path from 'path'

const FIXTURES_DIR = __dirname

// =============================================================================
// PAGOS FIXTURES
// =============================================================================

function generatePagosTest() {
  const data = [
    [
      'Numero Proyecto',
      'Monto',
      'Fecha',
      'Metodo de Pago',
      'Cuotas',
      'Referencia',
      'Notas',
    ],
    ['PRO-001', 500000, '15/06/2024', 'Transferencia', '', 'REF-001', 'Pago inicial'],
    ['PRO-002', 250000, '20/07/2024', 'Efectivo', '', '', 'Segundo pago'],
    ['PRO-003', 750000, '25/08/2024', 'Cheque', '', 'CHQ-123', ''],
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, 'pagos-test.xlsx'))
  console.log('✅ pagos-test.xlsx generado')
}

function generatePagosMixtos() {
  const data = [
    [
      'Numero Proyecto',
      'Monto',
      'Fecha',
      'Metodo de Pago',
      'Cuotas',
      'Referencia',
      'Notas',
    ],
    // Válidos
    ['PRO-001', 500000, '15/06/2024', 'Transferencia', '', 'REF-001', 'Pago válido 1'],
    ['PRO-002', 250000, '20/07/2024', 'Efectivo', '', '', 'Pago válido 2'],
    // Inválidos
    ['', 100000, '25/08/2024', 'Cheque', '', '', 'Sin número proyecto'], // Sin proyecto
    ['PRO-003', -50000, '30/08/2024', 'Transferencia', '', '', 'Monto negativo'], // Monto negativo
    ['PRO-004', 300000, 'fecha-invalida', 'Efectivo', '', '', 'Fecha inválida'], // Fecha inválida
    ['PRO-005', 400000, '01/09/2024', '', '', '', 'Sin método de pago'], // Sin método
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, 'pagos-mixtos.xlsx'))
  console.log('✅ pagos-mixtos.xlsx generado')
}

function generatePagosInvalido() {
  const data = [
    [
      'Numero Proyecto',
      'Monto',
      'Fecha',
      'Metodo de Pago',
      'Cuotas',
      'Referencia',
      'Notas',
    ],
    ['', 100000, '25/08/2024', 'Cheque', '', '', 'Sin número proyecto'],
    ['PRO-001', 0, '30/08/2024', 'Transferencia', '', '', 'Monto cero'],
    ['PRO-002', 300000, '', 'Efectivo', '', '', 'Sin fecha'],
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, 'pagos-invalido.xlsx'))
  console.log('✅ pagos-invalido.xlsx generado')
}

// =============================================================================
// PROYECTOS FIXTURES
// =============================================================================

function generateProyectosTest() {
  const data = [
    [
      'Numero Proyecto',
      'Glosa',
      'Cliente',
      'Telefono',
      'Calle',
      'Depto',
      'Comuna',
      'Region',
      'Estado',
      'Fecha',
      'Subtotal',
      'IVA',
      'Ventanas',
      'M2',
      'Descripcion',
    ],
    [
      'PRO-TEST-001',
      'Proyecto Test 1',
      'Juan Pérez',
      '912345678',
      'Av. Principal 123',
      'Depto 45',
      'Santiago',
      '13',
      'En Proceso',
      '15/06/2024',
      1000000,
      19,
      10,
      25.5,
      'Proyecto de prueba 1',
    ],
    [
      'PRO-TEST-002',
      'Proyecto Test 2',
      'María González',
      '987654321',
      'Calle Secundaria 456',
      '',
      'Providencia',
      'Metropolitana',
      'Pendiente',
      '20/07/2024',
      500000,
      19,
      5,
      12.5,
      '',
    ],
    [
      'PRO-TEST-003',
      'Proyecto Test 3',
      'Carlos López',
      '+56911111111',
      'Pasaje Norte 789',
      'Casa 10',
      'Las Condes',
      '13',
      'Completado',
      '25/08/2024',
      2000000,
      19,
      20,
      50,
      'Proyecto grande',
    ],
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyectos')
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, 'proyectos-test.xlsx'))
  console.log('✅ proyectos-test.xlsx generado')
}

function generateProyectosMixtos() {
  const data = [
    [
      'Numero Proyecto',
      'Glosa',
      'Cliente',
      'Telefono',
      'Calle',
      'Depto',
      'Comuna',
      'Region',
      'Estado',
      'Fecha',
      'Subtotal',
      'IVA',
      'Ventanas',
      'M2',
      'Descripcion',
    ],
    // Válidos
    [
      'PRO-MIX-001',
      'Proyecto Válido 1',
      'Juan Pérez',
      '912345678',
      'Av. Principal 123',
      '',
      'Santiago',
      '13',
      'En Proceso',
      '15/06/2024',
      1000000,
      19,
      10,
      25.5,
      '',
    ],
    [
      'PRO-MIX-002',
      'Proyecto Válido 2',
      'María González',
      '987654321',
      'Calle Secundaria 456',
      '',
      'Providencia',
      '13',
      'Pendiente',
      '20/07/2024',
      500000,
      19,
      5,
      12.5,
      '',
    ],
    // Inválidos
    [
      '',
      'Sin Número',
      'Cliente Test',
      '912345678',
      'Calle 123',
      '',
      'Santiago',
      '13',
      'Pendiente',
      '01/01/2024',
      100000,
      19,
      1,
      5,
      '',
    ], // Sin número
    [
      'PRO-MIX-003',
      'Sin Cliente',
      '',
      '912345678',
      'Calle 123',
      '',
      'Santiago',
      '13',
      'Pendiente',
      '01/01/2024',
      100000,
      19,
      1,
      5,
      '',
    ], // Sin cliente
    [
      'PRO-MIX-004',
      'Región Inválida',
      'Test',
      '912345678',
      'Calle 123',
      '',
      'Santiago',
      'Región Inventada',
      'Pendiente',
      '01/01/2024',
      100000,
      19,
      1,
      5,
      '',
    ], // Región inválida
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proyectos')
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, 'proyectos-mixtos.xlsx'))
  console.log('✅ proyectos-mixtos.xlsx generado')
}

// =============================================================================
// CLIENTES FIXTURES
// =============================================================================

function generateClientesTest() {
  const data = [
    ['Nombre', 'Teléfono', 'Email'],
    ['Juan Pérez', '912345678', 'juan@example.com'],
    ['María González', '987654321', 'maria@example.com'],
    ['Carlos López', '+56911111111', ''],
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, 'clientes-test.xlsx'))
  console.log('✅ clientes-test.xlsx generado')
}

function generateClientesMixtos() {
  const data = [
    ['Nombre', 'Teléfono', 'Email'],
    // Válidos
    ['Juan Pérez', '912345678', 'juan@example.com'],
    ['María González', '987654321', ''],
    // Inválidos
    ['', '912345678', 'test@example.com'], // Sin nombre
    ['Test Sin Teléfono', '', 'test@example.com'], // Sin teléfono
    ['Test Teléfono Corto', '123', 'test@example.com'], // Teléfono muy corto
    ['Test Email Inválido', '912345678', 'not-an-email'], // Email inválido
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes')
  XLSX.writeFile(workbook, path.join(FIXTURES_DIR, 'clientes-mixtos.xlsx'))
  console.log('✅ clientes-mixtos.xlsx generado')
}

// =============================================================================
// MAIN
// =============================================================================

console.log('Generando fixtures Excel...\n')

// Pagos
generatePagosTest()
generatePagosMixtos()
generatePagosInvalido()

// Proyectos
generateProyectosTest()
generateProyectosMixtos()

// Clientes
generateClientesTest()
generateClientesMixtos()

console.log('\n✅ Todas las fixtures generadas en tests/fixtures/')
