/**
 * Tests para app/api/payments/route.ts (POST endpoint)
 *
 * Valida:
 * - Validaciones de entrada
 * - Reglas de negocio para allocations
 * - Validación de crédito aplicado
 *
 * NOTA: Estos tests mockean Prisma y se enfocan en validaciones,
 * no en la creación real de registros.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock del logger middleware
vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (handler: Function) => {
    return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      }
      const mockContext = context || { params: Promise.resolve({}) }
      return handler(request, mockLogger, mockContext)
    }
  },
}))

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
    },
    paymentMethod: {
      findUnique: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}))

// Mock de business logic
vi.mock('@/lib/business-logic/update-project-balance', () => ({
  updateProjectBalance: vi.fn().mockResolvedValue(0),
  updateMultipleProjectBalances: vi.fn().mockResolvedValue(1),
}))

vi.mock('@/lib/business-logic/credit-management', () => ({
  canApplyCredit: vi.fn().mockReturnValue({ valid: true }),
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

// Helper para llamar al handler con context mock
async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

// Helper para crear request
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/payments', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Payload base válido
const validPayload = {
  type: 'Project',
  customerId: 'customer-1',
  amount: 100000,
  currency: 'CLP',
  date: '2024-01-15',
  paymentMethodId: 'pm-1',
  allocations: [{ projectId: 'project-1', allocatedAmount: 100000 }],
}

describe('POST /api/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks por defecto
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test Customer',
      creditBalance: 0,
    } as never)

    vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
      id: 'pm-1',
      name: 'Efectivo',
    } as never)

    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: 'project-1', customerId: 'customer-1', currency: 'CLP' },
    ] as never)

    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: 'project-1',
      balance: 100000,
    } as never)

    const defaultPaymentCreateResult = {
      id: 'payment-1',
      allocations: [{ id: 'alloc-1' }],
      installments: [],
    }

    vi.mocked(prisma.payment.create).mockResolvedValue(defaultPaymentCreateResult as never)

    // Mock $transaction para ejecutar el callback con un tx mock
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        payment: { create: vi.fn().mockResolvedValue(defaultPaymentCreateResult) },
        project: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'project-1', projectNumber: '1001', balance: 0, customerId: 'customer-1' },
          ]),
          update: vi.fn(),
        },
        customer: { update: vi.fn() },
        creditTransaction: { create: vi.fn() },
      }
      return fn(mockTx as never)
    })
  })

  describe('validaciones de tipo', () => {
    it('debe rechazar tipo inválido', async () => {
      const request = createRequest({ ...validPayload, type: 'Invalid' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('tipo de pago')
    })

    it('debe rechazar sin tipo', async () => {
      const { type: _, ...noType } = validPayload
      const request = createRequest(noType)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe aceptar tipo Project', async () => {
      const request = createRequest({ ...validPayload, type: 'Project' })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe aceptar tipo Customer', async () => {
      const request = createRequest({ ...validPayload, type: 'Customer' })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('validaciones de campos requeridos', () => {
    it('debe rechazar sin customerId', async () => {
      const { customerId: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('cliente')
    })

    it('debe rechazar amount <= 0', async () => {
      const request = createRequest({ ...validPayload, amount: 0 })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('monto')
    })

    it('debe rechazar amount negativo', async () => {
      const request = createRequest({ ...validPayload, amount: -1000 })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar sin fecha', async () => {
      const { date: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('fecha')
    })

    it('debe rechazar moneda inválida', async () => {
      const request = createRequest({ ...validPayload, currency: 'INVALID' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('moneda')
    })

    it('debe rechazar sin paymentMethodId', async () => {
      const { paymentMethodId: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('validaciones de allocations', () => {
    it('debe rechazar sin allocations', async () => {
      const { allocations: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('asignar')
    })

    it('debe rechazar allocations vacías', async () => {
      const request = createRequest({ ...validPayload, allocations: [] })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar tipo Project con múltiples allocations', async () => {
      const request = createRequest({
        ...validPayload,
        type: 'Project',
        allocations: [
          { projectId: 'p1', allocatedAmount: 50000 },
          { projectId: 'p2', allocatedAmount: 50000 },
        ],
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('exactamente 1')
    })

    it('debe aceptar tipo Customer con múltiples allocations', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        { id: 'p1', customerId: 'customer-1', currency: 'CLP' },
        { id: 'p2', customerId: 'customer-1', currency: 'CLP' },
      ] as never)

      const request = createRequest({
        ...validPayload,
        type: 'Customer',
        allocations: [
          { projectId: 'p1', allocatedAmount: 50000 },
          { projectId: 'p2', allocatedAmount: 50000 },
        ],
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe rechazar projectIds duplicados', async () => {
      const request = createRequest({
        ...validPayload,
        type: 'Customer',
        allocations: [
          { projectId: 'p1', allocatedAmount: 50000 },
          { projectId: 'p1', allocatedAmount: 50000 },
        ],
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('mismo proyecto')
    })
  })

  describe('validación de suma de allocations', () => {
    it('debe rechazar suma diferente al amount', async () => {
      const request = createRequest({
        ...validPayload,
        amount: 100000,
        allocations: [{ projectId: 'project-1', allocatedAmount: 90000 }],
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('suma')
    })

    it('debe aceptar suma igual al amount', async () => {
      const request = createRequest({
        ...validPayload,
        amount: 100000,
        allocations: [{ projectId: 'project-1', allocatedAmount: 100000 }],
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe aceptar suma dentro de tolerancia (0.01)', async () => {
      const request = createRequest({
        ...validPayload,
        amount: 100000,
        allocations: [{ projectId: 'project-1', allocatedAmount: 100000.005 }],
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe rechazar suma fuera de tolerancia', async () => {
      const request = createRequest({
        ...validPayload,
        amount: 100000,
        allocations: [{ projectId: 'project-1', allocatedAmount: 100000.02 }],
      })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('validación de entidades existentes', () => {
    it('debe rechazar cliente inexistente', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('cliente')
    })

    it('debe rechazar método de pago inexistente', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue(null)

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('método de pago')
    })

    it('debe rechazar proyecto inexistente', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([])

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('proyectos')
    })
  })

  describe('validación de consistencia de datos', () => {
    it('debe rechazar proyectos de diferente cliente', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        { id: 'project-1', customerId: 'other-customer', currency: 'CLP' },
      ] as never)

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('mismo cliente')
    })

    it('debe rechazar proyectos con moneda diferente al pago', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        { id: 'project-1', customerId: 'customer-1', currency: 'USD' },
      ] as never)

      const request = createRequest({ ...validPayload, currency: 'CLP' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('moneda')
    })
  })

  describe('validación de crédito aplicado', () => {
    it('debe rechazar crédito en pago tipo Customer', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        { id: 'p1', customerId: 'customer-1', currency: 'CLP' },
        { id: 'p2', customerId: 'customer-1', currency: 'CLP' },
      ] as never)

      const request = createRequest({
        ...validPayload,
        type: 'Customer',
        allocations: [
          { projectId: 'p1', allocatedAmount: 50000 },
          { projectId: 'p2', allocatedAmount: 50000 },
        ],
        creditApplied: 10000,
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('solo puede aplicarse a pagos de proyecto')
    })

    it('debe aceptar crédito en pago tipo Project con 1 allocation', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        creditBalance: 50000,
      } as never)

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          payment: { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) },
          project: {
            findUnique: vi.fn().mockResolvedValue({ id: 'project-1', balance: 100000 }),
            findMany: vi.fn().mockResolvedValue([
              { id: 'project-1', projectNumber: '1001', balance: 0, customerId: 'customer-1' },
            ]),
            update: vi.fn(),
          },
          customer: {
            findUnique: vi.fn().mockResolvedValue({ creditBalance: 50000 }),
            update: vi.fn(),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          creditTransaction: { create: vi.fn() },
        }
        return fn(mockTx as never)
      })

      const request = createRequest({
        ...validPayload,
        type: 'Project',
        creditApplied: 10000,
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('creación exitosa', () => {
    it('debe crear pago con allocations', async () => {
      const request = createRequest(validPayload)
      const response = await callPOST(request)

      expect(response.status).toBe(201)
      // La creación ocurre dentro de $transaction, verificar que se llamó
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('debe incluir datos del pago en respuesta', async () => {
      const customPaymentResult = {
        id: 'payment-123',
        type: 'Project',
        amount: 100000,
        allocations: [{ id: 'alloc-1', allocatedAmount: 100000 }],
        installments: [],
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          payment: { create: vi.fn().mockResolvedValue(customPaymentResult) },
          project: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'project-1', projectNumber: '1001', balance: 0, customerId: 'customer-1' },
            ]),
            update: vi.fn(),
          },
          customer: { update: vi.fn() },
          creditTransaction: { create: vi.fn() },
        }
        return fn(mockTx as never)
      })

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(data.id).toBe('payment-123')
      expect(data.allocations).toHaveLength(1)
    })
  })
})
