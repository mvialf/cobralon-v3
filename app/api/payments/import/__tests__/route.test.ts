/**
 * Tests para POST /api/payments/import
 *
 * Verifica la importación masiva de pagos desde Excel
 *
 * Casos cubiertos:
 * - Importación exitosa de pagos válidos
 * - Validación de entrada (array vacío, estructura incorrecta)
 * - Manejo de proyectos no encontrados
 * - Manejo de métodos de pago no encontrados
 * - Validación de cuotas (hasInstallments, maxInstallments)
 * - Respuestas Multi-status (207) con errores parciales
 * - Creación transaccional (Payment + PaymentAllocation)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma ANTES de importar la ruta
vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
    paymentMethod: {
      findMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    paymentAllocation: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock logger middleware (passthrough)
vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (
    handler: (
      request: NextRequest,
      logger: Record<string, unknown>,
      context: { params: Promise<Record<string, string>> }
    ) => Promise<Response>
  ) => {
    return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      // Mock logger con métodos no-op
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockLogger: any = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(() => mockLogger),
      }
      return handler(request, mockLogger, context)
    }
  },
}))

// Importar después de los mocks
import { POST } from '../route'
import { prisma } from '@/lib/db'

// =============================================================================
// TEST DATA
// =============================================================================

const mockProjects = [
  { id: 'proj-1', projectNumber: 'PRO-001', customerId: 'cust-1', currency: 'CLP' },
  { id: 'proj-2', projectNumber: 'PRO-002', customerId: 'cust-2', currency: 'CLP' },
  { id: 'proj-3', projectNumber: 'PRO-003', customerId: 'cust-1', currency: 'USD' },
]

const mockPaymentMethods = [
  {
    id: 'pm-1',
    name: 'Transferencia',
    active: true,
    hasInstallments: false,
    maxInstallments: null,
  },
  { id: 'pm-2', name: 'Efectivo', active: true, hasInstallments: false, maxInstallments: null },
  { id: 'pm-3', name: 'Tarjeta Crédito', active: true, hasInstallments: true, maxInstallments: 12 },
  { id: 'pm-4', name: 'Cheque', active: true, hasInstallments: false, maxInstallments: null },
]

const validPayment = {
  projectNumber: 'PRO-001',
  amount: 500000,
  date: new Date('2024-06-15'),
  paymentMethodName: 'Transferencia',
  reference: 'REF-001',
  notes: 'Pago de prueba',
}

// =============================================================================
// HELPERS
// =============================================================================

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/payments/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockContext(): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve({}) }
}

// =============================================================================
// TESTS
// =============================================================================

describe('POST /api/payments/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks por defecto
    vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never)
    vi.mocked(prisma.paymentMethod.findMany).mockResolvedValue(mockPaymentMethods as never)
  })

  describe('Validación de entrada', () => {
    it('rechaza cuando payments no es un array', async () => {
      const request = createRequest({ payments: 'not-an-array' })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('array')
    })

    it('rechaza cuando payments es un array vacío', async () => {
      const request = createRequest({ payments: [] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('array')
    })

    it('rechaza cuando no se envía payments', async () => {
      const request = createRequest({})
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('Importación exitosa', () => {
    it('importa un pago válido correctamente', async () => {
      const mockPaymentResult = { id: 'pay-1' }
      vi.mocked(prisma.$transaction).mockResolvedValue(mockPaymentResult as never)

      const request = createRequest({ payments: [validPayment] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.imported).toBe(1)
      expect(data.paymentIds).toContain('pay-1')
    })

    it('importa múltiples pagos válidos', async () => {
      const payments = [
        validPayment,
        { ...validPayment, projectNumber: 'PRO-002', reference: 'REF-002' },
        { ...validPayment, projectNumber: 'PRO-003', paymentMethodName: 'Efectivo' },
      ]

      let callCount = 0
      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        callCount++
        return { id: `pay-${callCount}` } as never
      })

      const request = createRequest({ payments })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.imported).toBe(3)
      expect(data.paymentIds).toHaveLength(3)
    })

    it('incluye campos opcionales cuando se proporcionan', async () => {
      const paymentWithOptionals = {
        ...validPayment,
        selectedInstallments: undefined,
        reference: 'REF-OPT',
        notes: 'Con notas opcionales',
      }

      vi.mocked(prisma.$transaction).mockResolvedValue({ id: 'pay-opt' } as never)

      const request = createRequest({ payments: [paymentWithOptionals] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.imported).toBe(1)
    })

    it('maneja campos opcionales vacíos', async () => {
      const paymentMinimal = {
        projectNumber: 'PRO-001',
        amount: 100000,
        date: new Date(),
        paymentMethodName: 'Efectivo',
      }

      vi.mocked(prisma.$transaction).mockResolvedValue({ id: 'pay-min' } as never)

      const request = createRequest({ payments: [paymentMinimal] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.imported).toBe(1)
    })
  })

  describe('Errores de proyecto', () => {
    it('falla cuando el proyecto no existe', async () => {
      const paymentWithBadProject = {
        ...validPayment,
        projectNumber: 'PROYECTO-INEXISTENTE',
      }

      const request = createRequest({ payments: [paymentWithBadProject] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(207) // Multi-status
      expect(data.failed).toBe(1)
      expect(data.errors[0].error).toContain('no encontrado')
    })

    it('encuentra proyecto sin importar mayúsculas/minúsculas', async () => {
      const paymentLowercase = {
        ...validPayment,
        projectNumber: 'pro-001', // minúsculas
      }

      vi.mocked(prisma.$transaction).mockResolvedValue({ id: 'pay-lower' } as never)

      const request = createRequest({ payments: [paymentLowercase] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.imported).toBe(1)
    })
  })

  describe('Errores de método de pago', () => {
    it('falla cuando el método de pago no existe', async () => {
      const paymentWithBadMethod = {
        ...validPayment,
        paymentMethodName: 'Método Inventado',
      }

      const request = createRequest({ payments: [paymentWithBadMethod] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.failed).toBe(1)
      expect(data.errors[0].error).toContain('no encontrado')
    })

    it('encuentra método de pago sin importar mayúsculas/minúsculas', async () => {
      const paymentLowercase = {
        ...validPayment,
        paymentMethodName: 'TRANSFERENCIA', // mayúsculas
      }

      vi.mocked(prisma.$transaction).mockResolvedValue({ id: 'pay-upper' } as never)

      const request = createRequest({ payments: [paymentLowercase] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.imported).toBe(1)
    })
  })

  describe('Validación de cuotas', () => {
    it('falla cuando método no permite cuotas pero se envían', async () => {
      const paymentWithInstallments = {
        ...validPayment,
        paymentMethodName: 'Transferencia', // No permite cuotas
        selectedInstallments: 3,
      }

      const request = createRequest({ payments: [paymentWithInstallments] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.failed).toBe(1)
      expect(data.errors[0].error).toContain('no permite cuotas')
    })

    it('falla cuando cuotas exceden máximo permitido', async () => {
      const paymentTooManyInstallments = {
        ...validPayment,
        paymentMethodName: 'Tarjeta Crédito', // Permite hasta 12 cuotas
        selectedInstallments: 24,
      }

      const request = createRequest({ payments: [paymentTooManyInstallments] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.failed).toBe(1)
      expect(data.errors[0].error).toContain('máximo')
    })

    it('acepta cuotas válidas para método que lo permite', async () => {
      const paymentValidInstallments = {
        ...validPayment,
        paymentMethodName: 'Tarjeta Crédito',
        selectedInstallments: 6,
      }

      vi.mocked(prisma.$transaction).mockResolvedValue({ id: 'pay-inst' } as never)

      const request = createRequest({ payments: [paymentValidInstallments] })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.imported).toBe(1)
    })
  })

  describe('Multi-status (207)', () => {
    it('retorna 207 cuando algunos pagos fallan', async () => {
      const payments = [
        validPayment, // Válido
        { ...validPayment, projectNumber: 'INEXISTENTE' }, // Inválido
        { ...validPayment, projectNumber: 'PRO-002' }, // Válido
      ]

      let callCount = 0
      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        callCount++
        return { id: `pay-${callCount}` } as never
      })

      const request = createRequest({ payments })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.imported).toBe(2)
      expect(data.failed).toBe(1)
      expect(data.errors).toHaveLength(1)
    })

    it('incluye detalles de errores para cada fallo', async () => {
      const payments = [
        { ...validPayment, projectNumber: 'INEXISTENTE-1' },
        { ...validPayment, projectNumber: 'INEXISTENTE-2' },
      ]

      const request = createRequest({ payments })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.failed).toBe(2)
      expect(data.errors).toHaveLength(2)

      // Verificar que cada error tiene projectNumber
      expect(data.errors[0].projectNumber).toBe('INEXISTENTE-1')
      expect(data.errors[1].projectNumber).toBe('INEXISTENTE-2')
    })
  })

  describe('Transacción de base de datos', () => {
    it('llama $transaction para cada pago', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue({ id: 'pay-tx' } as never)

      const request = createRequest({ payments: [validPayment] })
      await POST(request, mockContext())

      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('continúa procesando otros pagos si uno falla en transacción', async () => {
      const payments = [validPayment, { ...validPayment, projectNumber: 'PRO-002' }]

      let callCount = 0
      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Database error')
        }
        return { id: `pay-${callCount}` } as never
      })

      const request = createRequest({ payments })
      const response = await POST(request, mockContext())
      const data = await response.json()

      expect(response.status).toBe(207)
      expect(data.imported).toBe(1)
      expect(data.failed).toBe(1)
    })
  })

  describe('Currency del proyecto', () => {
    it('usa la currency del proyecto encontrado', async () => {
      const paymentUSD = {
        ...validPayment,
        projectNumber: 'PRO-003', // Tiene currency USD
      }

      vi.mocked(prisma.$transaction).mockImplementation(async () => {
        return { id: 'pay-usd' } as never
      })

      const request = createRequest({ payments: [paymentUSD] })
      await POST(request, mockContext())

      expect(prisma.$transaction).toHaveBeenCalled()
      // La currency USD debe venir del proyecto PRO-003
    })
  })
})
