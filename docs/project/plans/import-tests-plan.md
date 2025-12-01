# Plan: Tests de Importación de Datos

**Fecha:** 2025-12-01
**Estado:** Propuesto
**Prioridad:** Media-Alta

## Contexto

El módulo de importación/exportación Excel tiene **179 tests unitarios** en `lib/excel/__tests__/`, pero carece de:
1. Tests de API routes (`/api/*/import`)
2. Tests de UI (dialogs de importación)
3. Tests E2E (flujo completo)

## Alcance

| Entidad | API Route | Dialog UI | Tests E2E |
|---------|-----------|-----------|-----------|
| Payments | `/api/payments/import` | `import-payment-dialog.tsx` | ✅ Incluido |
| Projects | `/api/projects/import` | `import-project-dialog.tsx` | ✅ Incluido |
| Customers | `/api/customers/import` | `import-customer-dialog.tsx` | ✅ Incluido |

---

## Fase 1: Tests de API Routes (Vitest)

**Ubicación:** `app/api/**/import/__tests__/route.test.ts`

### 1.1 Payment Import API (~15 tests)

```
app/api/payments/import/__tests__/route.test.ts
```

**Casos a cubrir:**
- ✅ Importación exitosa (1 pago válido)
- ✅ Importación de múltiples pagos válidos
- ✅ Error: array vacío → 400
- ✅ Error: proyecto no encontrado → 207 Multi-status
- ✅ Error: método de pago no encontrado → 207
- ✅ Error: método no permite cuotas → 207
- ✅ Error: cuotas exceden máximo → 207
- ✅ Creación de Payment + PaymentAllocation en transacción
- ✅ Verificar currency se toma del proyecto
- ✅ Campos opcionales (reference, notes, selectedInstallments)
- ✅ Respuesta 201 con paymentIds
- ✅ Respuesta 207 con errores parciales

**Mocking requerido:**
- `prisma.project.findMany` → Mock de proyectos
- `prisma.paymentMethod.findMany` → Mock de métodos
- `prisma.$transaction` → Mock de transacción
- Logger middleware

### 1.2 Project Import API (~12 tests)

```
app/api/projects/import/__tests__/route.test.ts
```

**Casos a cubrir:**
- ✅ Importación exitosa de proyecto
- ✅ Múltiples proyectos válidos
- ✅ Error: cliente no encontrado
- ✅ Error: estado no encontrado
- ✅ Normalización de teléfono (+56)
- ✅ Normalización de región (nombre → código)
- ✅ Campos opcionales (apartment, windowsCount, squareMeters, description)
- ✅ Cálculo de totalAmount (subtotal + IVA)
- ✅ Respuesta 201 con projectIds
- ✅ Respuesta 207 con errores parciales

### 1.3 Customer Import API (~10 tests)

```
app/api/customers/import/__tests__/route.test.ts
```

**Casos a cubrir:**
- ✅ Importación exitosa de cliente
- ✅ Múltiples clientes válidos
- ✅ Error: array vacío
- ✅ Error: duplicado por teléfono
- ✅ Normalización de teléfono
- ✅ Email opcional
- ✅ Respuesta 201 con customerIds
- ✅ Respuesta 207 con errores parciales

### Patrón de Test de API

```typescript
// Ejemplo: app/api/payments/import/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { prisma } from '@/lib/db'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    project: { findMany: vi.fn() },
    paymentMethod: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// Mock logger middleware (passthrough)
vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (handler: Function) => handler,
}))

describe('POST /api/payments/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('importa pagos válidos exitosamente', async () => {
    // Arrange
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: '1', projectNumber: 'P-001', customerId: 'c1', currency: 'CLP' }
    ])
    vi.mocked(prisma.paymentMethod.findMany).mockResolvedValue([
      { id: 'm1', name: 'Transferencia', active: true, hasInstallments: false }
    ])
    vi.mocked(prisma.$transaction).mockResolvedValue({ id: 'pay-1' })

    const request = new Request('http://localhost/api/payments/import', {
      method: 'POST',
      body: JSON.stringify({
        payments: [{
          projectNumber: 'P-001',
          amount: 500000,
          date: new Date(),
          paymentMethodName: 'Transferencia'
        }]
      })
    })

    // Act
    const response = await POST(request, { logger: mockLogger })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(201)
    expect(data.imported).toBe(1)
  })
})
```

---

## Fase 2: Tests de UI - Dialogs (Vitest + Testing Library)

**Ubicación:** `components/dialogs/**/import-*-dialog.test.tsx`

### 2.1 ImportPaymentDialog (~18 tests)

```
components/dialogs/payments/__tests__/import-payment-dialog.test.tsx
```

**Casos a cubrir:**

**Estado: Upload**
- ✅ Renderiza botón "Importar Pagos"
- ✅ Click abre Sheet
- ✅ Muestra dropzone con instrucciones
- ✅ Muestra botón "Descargar Template"
- ✅ Rechaza archivo no-Excel → muestra error
- ✅ Rechaza archivo >5MB → muestra error
- ✅ Acepta archivo .xlsx válido → pasa a preview

**Estado: Preview**
- ✅ Muestra tabla de preview con datos parseados
- ✅ Muestra contadores (válidos/errores)
- ✅ Botón "Volver" regresa a upload
- ✅ Botón "Importar X Pagos" habilitado si hay válidos
- ✅ Botón deshabilitado si validCount = 0

**Estado: Importing**
- ✅ Muestra progress bar
- ✅ Muestra mensaje "Importando X pagos..."

**Estado: Complete**
- ✅ Muestra ícono de éxito
- ✅ Muestra contador de importados
- ✅ Botón "Cerrar" cierra y resetea
- ✅ Llama onImportComplete callback

**Error Handling**
- ✅ Muestra error de API en estado preview

### 2.2 ImportProjectDialog (~15 tests)

Similar estructura con campos específicos de proyectos.

### 2.3 ImportCustomerDialog (~12 tests)

Similar estructura con campos específicos de clientes.

### Patrón de Test de Dialog

```typescript
// components/dialogs/payments/__tests__/import-payment-dialog.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ImportPaymentDialog } from '../import-payment-dialog'

// Mocks
vi.mock('@/lib/excel/payment-parser', () => ({
  validateExcelFile: vi.fn(),
  parsePaymentExcel: vi.fn(),
}))

vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  })),
}))

describe('ImportPaymentDialog', () => {
  it('renderiza botón "Importar Pagos"', () => {
    render(<ImportPaymentDialog />)
    expect(screen.getByRole('button', { name: /importar pagos/i })).toBeInTheDocument()
  })

  it('abre Sheet al hacer click', async () => {
    const user = userEvent.setup()
    render(<ImportPaymentDialog />)

    await user.click(screen.getByRole('button', { name: /importar pagos/i }))

    expect(screen.getByText(/importar pagos desde excel/i)).toBeInTheDocument()
  })
})
```

### Consideraciones de Mocking

1. **react-dropzone:** Mock completo con onDrop simulado
2. **XLSX:** Ya mockeado en tests de parsers
3. **fetch:** Mock global para API calls
4. **Radix Sheet:** Ya tiene mocks en vitest.setup.ts

---

## Fase 3: Tests E2E (Playwright)

**Ubicación:** `tests/e2e/import-*.spec.ts`

### 3.1 import-payments.spec.ts (~8 tests)

```typescript
// tests/e2e/import-payments.spec.ts
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Importación de Pagos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByRole('heading', { name: /pagos/i })).toBeVisible()
  })

  test('debe abrir el dialog de importación', async ({ page }) => {
    await page.getByRole('button', { name: /importar pagos/i }).click()
    await expect(page.getByText(/importar pagos desde excel/i)).toBeVisible()
  })

  test('debe mostrar instrucciones de columnas', async ({ page }) => {
    await page.getByRole('button', { name: /importar pagos/i }).click()
    await expect(page.getByText(/número proyecto/i)).toBeVisible()
    await expect(page.getByText(/monto/i)).toBeVisible()
    await expect(page.getByText(/fecha/i)).toBeVisible()
    await expect(page.getByText(/método de pago/i)).toBeVisible()
  })

  test('debe descargar template de ejemplo', async ({ page }) => {
    await page.getByRole('button', { name: /importar pagos/i }).click()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /descargar template/i }).click()
    ])

    expect(download.suggestedFilename()).toContain('pagos')
    expect(download.suggestedFilename()).toContain('.xlsx')
  })

  test('debe rechazar archivo no-Excel', async ({ page }) => {
    await page.getByRole('button', { name: /importar pagos/i }).click()

    // Subir archivo inválido
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an excel file')
    })

    await expect(page.getByText(/archivo inválido|excel/i)).toBeVisible()
  })

  test('flujo completo de importación con archivo válido', async ({ page }) => {
    await page.getByRole('button', { name: /importar pagos/i }).click()

    // Subir archivo Excel de prueba
    const testFile = path.join(__dirname, '../fixtures/pagos-test.xlsx')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile)

    // Esperar preview
    await expect(page.getByText(/vista previa/i)).toBeVisible()

    // Verificar tabla de preview
    await expect(page.getByRole('table')).toBeVisible()

    // Click importar
    await page.getByRole('button', { name: /importar \d+ pago/i }).click()

    // Verificar éxito
    await expect(page.getByText(/importación completada|exitosa/i)).toBeVisible()
  })

  test('debe manejar errores parciales', async ({ page }) => {
    // Archivo con algunos pagos inválidos
    await page.getByRole('button', { name: /importar pagos/i }).click()

    const testFile = path.join(__dirname, '../fixtures/pagos-mixtos.xlsx')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFile)

    // Verificar que muestra errores en preview
    await expect(page.getByText(/error|inválido/i)).toBeVisible()

    // Verificar contadores
    await expect(page.getByText(/válidos/i)).toBeVisible()
    await expect(page.getByText(/errores/i)).toBeVisible()
  })

  test('debe cancelar importación con botón Volver', async ({ page }) => {
    await page.getByRole('button', { name: /importar pagos/i }).click()

    // Subir archivo
    const testFile = path.join(__dirname, '../fixtures/pagos-test.xlsx')
    await page.locator('input[type="file"]').setInputFiles(testFile)

    // Esperar preview
    await expect(page.getByText(/vista previa/i)).toBeVisible()

    // Click volver
    await page.getByRole('button', { name: /volver/i }).click()

    // Verificar que regresa a upload
    await expect(page.getByText(/arrastra un archivo/i)).toBeVisible()
  })
})
```

### 3.2 import-projects.spec.ts (~6 tests)

Similar estructura adaptada para proyectos.

### 3.3 import-customers.spec.ts (~6 tests)

Similar estructura adaptada para clientes.

### Fixtures Requeridas

Crear archivos Excel de prueba en `tests/fixtures/`:

```
tests/
├── fixtures/
│   ├── pagos-test.xlsx          # 3-5 pagos válidos
│   ├── pagos-mixtos.xlsx        # 2 válidos + 2 con errores
│   ├── pagos-invalido.xlsx      # Todos con errores
│   ├── proyectos-test.xlsx      # 3-5 proyectos válidos
│   ├── proyectos-mixtos.xlsx    # 2 válidos + 2 con errores
│   ├── clientes-test.xlsx       # 3-5 clientes válidos
│   └── clientes-mixtos.xlsx     # 2 válidos + 2 con errores
└── e2e/
    ├── import-payments.spec.ts
    ├── import-projects.spec.ts
    └── import-customers.spec.ts
```

### Script para Generar Fixtures

```typescript
// tests/scripts/generate-fixtures.ts
import * as XLSX from 'xlsx'
import * as fs from 'fs'

function generatePaymentFixture() {
  const data = [
    ['Numero Proyecto', 'Monto', 'Fecha', 'Metodo de Pago', 'Cuotas', 'Referencia', 'Notas'],
    ['P-001', 500000, '15/06/2024', 'Transferencia', '', 'REF-001', 'Pago test'],
    ['P-002', 250000, '20/07/2024', 'Efectivo', '', '', ''],
    ['P-003', 750000, '25/08/2024', 'Cheque', '', 'CHQ-123', ''],
  ]

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pagos')

  XLSX.writeFile(workbook, 'tests/fixtures/pagos-test.xlsx')
}
```

---

## Resumen de Entregables

| Fase | Archivo | Tests | Prioridad |
|------|---------|-------|-----------|
| 1.1 | `api/payments/import/__tests__/route.test.ts` | ~15 | Alta |
| 1.2 | `api/projects/import/__tests__/route.test.ts` | ~12 | Media |
| 1.3 | `api/customers/import/__tests__/route.test.ts` | ~10 | Media |
| 2.1 | `dialogs/payments/__tests__/import-payment-dialog.test.tsx` | ~18 | Alta |
| 2.2 | `dialogs/projects/__tests__/import-project-dialog.test.tsx` | ~15 | Media |
| 2.3 | `dialogs/customers/__tests__/import-customer-dialog.test.tsx` | ~12 | Media |
| 3.0 | `tests/fixtures/*.xlsx` | - | Alta |
| 3.1 | `tests/e2e/import-payments.spec.ts` | ~8 | Alta |
| 3.2 | `tests/e2e/import-projects.spec.ts` | ~6 | Media |
| 3.3 | `tests/e2e/import-customers.spec.ts` | ~6 | Media |

**Total nuevos tests:** ~102

---

## Orden de Implementación Recomendado

### Sprint 1: Foundation (Payments)
1. ✅ Generar fixtures Excel (`tests/fixtures/pagos-*.xlsx`)
2. ✅ API tests para payments import
3. ✅ Dialog tests para ImportPaymentDialog
4. ✅ E2E tests para importación de pagos

### Sprint 2: Expand (Projects + Customers)
5. ✅ Generar fixtures para proyectos y clientes
6. ✅ API tests para projects import
7. ✅ API tests para customers import
8. ✅ Dialog tests para ambos
9. ✅ E2E tests para ambos

---

## Dependencias

- **Vitest:** Ya configurado ✅
- **Testing Library:** Ya configurado ✅
- **Playwright:** Ya configurado ✅
- **Fixtures Excel:** **Pendiente crear**
- **Mocks de Prisma:** **Pendiente crear**

---

## Criterios de Aceptación

- [ ] Todos los tests pasan localmente
- [ ] Coverage de API routes > 80%
- [ ] Coverage de dialogs > 70%
- [ ] E2E tests pasan en CI (Chrome + Firefox)
- [ ] Fixtures Excel versionadas en Git
- [ ] Documentación de tests actualizada

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Mocks de Prisma complejos | Alta | Medio | Usar patrón establecido en otros tests |
| Dropzone difícil de mockear | Media | Medio | Mock a nivel de hook, no componente |
| Fixtures se desactualizan | Baja | Alto | Script de generación + validación en CI |
| E2E flaky por timing | Media | Medio | waitFor + retries en Playwright config |
