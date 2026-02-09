/**
 * Tests para ImportPaymentDialog
 *
 * Verifica el flujo de importación de pagos desde Excel:
 * - Estado Upload: dropzone, instrucciones, template
 * - Estado Preview: tabla de datos, contadores
 * - Estado Importing: progress bar
 * - Estado Complete: mensaje de éxito
 * - Manejo de errores
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPaymentDialog } from '../import-payment-dialog'
import type { PaymentParseResult } from '@/lib/excel/payment-parser'

// Mock de parsePaymentExcel y validateExcelFile
const mockParsePaymentExcel = vi.fn()
const mockValidateExcelFile = vi.fn()

vi.mock('@/lib/excel/payment-parser', () => ({
  parsePaymentExcel: (...args: unknown[]) => mockParsePaymentExcel(...args),
  validateExcelFile: (...args: unknown[]) => mockValidateExcelFile(...args),
}))

// Mock de downloadPaymentTemplate
vi.mock('@/lib/excel/payment-template', () => ({
  downloadPaymentTemplate: vi.fn(),
}))

// Mock de ImportPreviewTable (para simplificar)
vi.mock('@/components/forms/payments/import-preview-table', () => ({
  ImportPreviewTable: ({
    payments,
    validCount,
    errorCount,
  }: {
    payments: unknown[]
    validCount: number
    errorCount: number
  }) => (
    <div data-testid="preview-table">
      <span data-testid="valid-count">{validCount}</span>
      <span data-testid="error-count">{errorCount}</span>
      <span data-testid="payments-count">{payments.length}</span>
    </div>
  ),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// =============================================================================
// TEST DATA
// =============================================================================

const validParseResult = {
  payments: [
    {
      rowNumber: 2,
      isValid: true,
      errors: [] as string[],
      data: {
        projectNumber: 'PRO-001',
        amount: 500000,
        date: new Date('2024-06-15'),
        paymentMethodName: 'Transferencia',
      },
    },
    {
      rowNumber: 3,
      isValid: true,
      errors: [] as string[],
      data: {
        projectNumber: 'PRO-002',
        amount: 250000,
        date: new Date('2024-07-20'),
        paymentMethodName: 'Efectivo',
      },
    },
  ],
  validCount: 2,
  errorCount: 0,
  totalRows: 2,
}

const mixedParseResult = {
  payments: [
    {
      rowNumber: 2,
      isValid: true,
      errors: [] as string[],
      data: {
        projectNumber: 'PRO-001',
        amount: 500000,
        date: new Date(),
        paymentMethodName: 'Transferencia',
      },
    },
    {
      rowNumber: 3,
      isValid: false,
      errors: ['Proyecto no encontrado'],
      data: null,
    },
  ],
  validCount: 1,
  errorCount: 1,
  totalRows: 2,
}

const zeroValidParseResult = {
  payments: [
    {
      rowNumber: 2,
      isValid: false,
      errors: ['Proyecto no encontrado'],
      data: null,
    },
  ],
  validCount: 0,
  errorCount: 1,
  totalRows: 1,
}

// =============================================================================
// HELPERS
// =============================================================================

function createMockFile(name = 'test.xlsx'): File {
  return new File(['mock content'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Helper: abre el dialog y sube un archivo via el input del dropzone.
 * Retorna el userEvent instance para encadenar acciones.
 */
async function openAndUploadFile(
  props: { onImportComplete?: () => void } = {},
  parseResult: PaymentParseResult = validParseResult,
) {
  mockParsePaymentExcel.mockResolvedValue(parseResult)
  const user = userEvent.setup()

  render(<ImportPaymentDialog {...props} />)

  // Abrir el sheet
  await user.click(screen.getByRole('button', { name: /importar pagos/i }))

  // Subir archivo via el input oculto del dropzone
  const file = createMockFile()
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)

  // Esperar a que el parseo se complete y transicione a preview
  await waitFor(() => {
    expect(screen.getByTestId('preview-table')).toBeInTheDocument()
  })

  return user
}

/**
 * Helper: flujo completo hasta estado 'complete'.
 */
async function completeFullImportFlow(
  props: { onImportComplete?: () => void } = {},
) {
  const user = await openAndUploadFile(props)

  // Click en botón importar
  const importButton = screen.getByRole('button', { name: /importar 2 pagos/i })
  await user.click(importButton)

  // Esperar a que complete
  await waitFor(() => {
    expect(screen.getByText(/importación exitosa/i)).toBeInTheDocument()
  })

  return user
}

// =============================================================================
// TESTS
// =============================================================================

describe('ImportPaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateExcelFile.mockReturnValue({ valid: true })
    mockParsePaymentExcel.mockResolvedValue(validParseResult)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ imported: 2 }),
    })
  })

  describe('Renderizado inicial', () => {
    it('renderiza botón "Importar Pagos"', () => {
      render(<ImportPaymentDialog />)

      expect(screen.getByRole('button', { name: /importar pagos/i })).toBeInTheDocument()
    })

    it('botón tiene icono de upload', () => {
      render(<ImportPaymentDialog />)

      const button = screen.getByRole('button', { name: /importar pagos/i })
      expect(button.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Estado: Upload', () => {
    it('abre Sheet al hacer click en botón', async () => {
      const user = userEvent.setup()
      render(<ImportPaymentDialog />)

      await user.click(screen.getByRole('button', { name: /importar pagos/i }))

      expect(
        screen.getByText(/sube un archivo excel con los datos de tus pagos/i)
      ).toBeInTheDocument()
    })

    it('muestra instrucciones de columnas requeridas', async () => {
      const user = userEvent.setup()
      render(<ImportPaymentDialog />)

      await user.click(screen.getByRole('button', { name: /importar pagos/i }))

      // Buscar los nombres de las columnas (en elementos strong)
      expect(screen.getByText('Número Proyecto')).toBeInTheDocument()
      expect(screen.getByText('Monto')).toBeInTheDocument()
      expect(screen.getByText('Fecha')).toBeInTheDocument()
      expect(screen.getByText('Método de Pago')).toBeInTheDocument()
    })

    it('muestra botón para descargar template', async () => {
      const user = userEvent.setup()
      render(<ImportPaymentDialog />)

      await user.click(screen.getByRole('button', { name: /importar pagos/i }))

      expect(screen.getByRole('button', { name: /descargar template/i })).toBeInTheDocument()
    })

    it('muestra botón Cancelar', async () => {
      const user = userEvent.setup()
      render(<ImportPaymentDialog />)

      await user.click(screen.getByRole('button', { name: /importar pagos/i }))

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })

    it('muestra error cuando archivo es inválido', async () => {
      mockValidateExcelFile.mockReturnValue({ valid: false, error: 'Solo archivos Excel' })

      const user = userEvent.setup()
      render(<ImportPaymentDialog />)

      await user.click(screen.getByRole('button', { name: /importar pagos/i }))

      const file = createMockFile('test.xlsx')
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('Solo archivos Excel')).toBeInTheDocument()
      })
    })
  })

  describe('Estado: Preview', () => {
    it('muestra tabla de preview después de parsear archivo', async () => {
      await openAndUploadFile()

      expect(screen.getByTestId('preview-table')).toBeInTheDocument()
    })

    it('muestra contadores de válidos y errores', async () => {
      await openAndUploadFile({}, mixedParseResult)

      expect(screen.getByTestId('valid-count')).toHaveTextContent('1')
      expect(screen.getByTestId('error-count')).toHaveTextContent('1')
    })

    it('botón Importar muestra cantidad de pagos válidos', async () => {
      await openAndUploadFile()

      expect(screen.getByRole('button', { name: /importar 2 pagos/i })).toBeInTheDocument()
    })

    it('botón Importar está deshabilitado si no hay válidos', async () => {
      await openAndUploadFile({}, zeroValidParseResult)

      const importButton = screen.getByRole('button', { name: /importar 0 pagos/i })
      expect(importButton).toBeDisabled()
    })

    it('botón Volver regresa a estado Upload', async () => {
      const user = await openAndUploadFile()

      await user.click(screen.getByRole('button', { name: /volver/i }))

      // Debe volver a mostrar el dropzone / estado upload
      await waitFor(() => {
        expect(
        screen.getByText(/sube un archivo excel con los datos de tus pagos/i)
      ).toBeInTheDocument()
      })
    })
  })

  describe('Estado: Importing', () => {
    it('muestra mensaje de progreso durante importación', async () => {
      // Hacer que fetch no resuelva inmediatamente
      let resolveFetch!: (value: unknown) => void
      mockFetch.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
      )

      const user = await openAndUploadFile()

      // Click importar
      await user.click(screen.getByRole('button', { name: /importar 2 pagos/i }))

      // Mientras fetch está pendiente, debe mostrar el estado importing
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })

      // Resolver fetch para limpiar
      resolveFetch({
        ok: true,
        json: async () => ({ imported: 2 }),
      })
    })

    it('muestra progressbar durante importación', async () => {
      let resolveFetch!: (value: unknown) => void
      mockFetch.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
      )

      const user = await openAndUploadFile()
      await user.click(screen.getByRole('button', { name: /importar 2 pagos/i }))

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })

      resolveFetch({
        ok: true,
        json: async () => ({ imported: 2 }),
      })
    })
  })

  describe('Estado: Complete', () => {
    it('muestra ícono de éxito y mensaje', async () => {
      await completeFullImportFlow()

      expect(screen.getByText(/importación exitosa/i)).toBeInTheDocument()
    })

    it('muestra cantidad de pagos importados', async () => {
      await completeFullImportFlow()

      expect(screen.getByText(/se importaron 2 pagos correctamente/i)).toBeInTheDocument()
    })

    it('botón Cerrar está presente en estado complete', async () => {
      await completeFullImportFlow()

      expect(screen.getByRole('button', { name: /cerrar/i })).toBeInTheDocument()
    })

    it('llama onImportComplete callback al completar', async () => {
      const onImportComplete = vi.fn()
      await completeFullImportFlow({ onImportComplete })

      expect(onImportComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe('Manejo de errores', () => {
    it('muestra error cuando parsePaymentExcel falla', async () => {
      mockParsePaymentExcel.mockRejectedValue(new Error('Error al procesar archivo'))

      const user = userEvent.setup()
      render(<ImportPaymentDialog />)

      await user.click(screen.getByRole('button', { name: /importar pagos/i }))

      const file = createMockFile()
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('Error al procesar archivo')).toBeInTheDocument()
      })
    })

    it('muestra error cuando API falla', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Error del servidor' }),
      })

      const user = await openAndUploadFile()
      await user.click(screen.getByRole('button', { name: /importar 2 pagos/i }))

      await waitFor(() => {
        expect(screen.getByText('Error del servidor')).toBeInTheDocument()
      })
    })

    it('vuelve a estado preview si API falla', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Error del servidor' }),
      })

      const user = await openAndUploadFile()
      await user.click(screen.getByRole('button', { name: /importar 2 pagos/i }))

      // Debe volver a preview con el error visible
      await waitFor(() => {
        expect(screen.getByTestId('preview-table')).toBeInTheDocument()
        expect(screen.getByText('Error del servidor')).toBeInTheDocument()
      })
    })
  })

  describe('Integración con props', () => {
    it('llama onImportComplete cuando importación es exitosa', async () => {
      const onImportComplete = vi.fn()
      await completeFullImportFlow({ onImportComplete })

      expect(onImportComplete).toHaveBeenCalledTimes(1)
    })
  })
})
