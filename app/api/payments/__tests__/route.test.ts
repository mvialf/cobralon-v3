/**
 * Tests para app/api/payments/route.ts (GET y POST endpoints)
 *
 * Valida:
 * - GET: Listado con filtros, paginación y facets
 * - POST: Validaciones de entrada
 * - POST: Reglas de negocio para allocations
 * - POST: Validación de crédito aplicado
 * - POST: Sobrepagos y generación de créditos
 * - POST: Errores en transacción
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock automático de logger-middleware (usa lib/__mocks__/logger-middleware.ts)
vi.mock('@/lib/logger-middleware')

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
    },
    paymentMethod: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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

vi.mock('@/lib/business-logic/update-customer-credit-balance', () => ({
  updateCustomerCreditBalance: vi.fn().mockResolvedValue(0),
}))

import { prisma } from '@/lib/db'
import { canApplyCredit } from '@/lib/business-logic/credit-management'
import { updateCustomerCreditBalance } from '@/lib/business-logic/update-customer-credit-balance'
import { GET, POST } from '../route'

// Helper para llamar al handler con context mock
async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

// Helper para llamar GET con context mock
async function callGET(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (GET as any)(request, context)
}

// Helper para crear request POST
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/payments', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper para crear request GET con query params
function createGETRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/payments')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
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
      // Debe recalcular creditBalance desde ledger
      expect(updateCustomerCreditBalance).toHaveBeenCalledWith('customer-1', expect.anything())
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

  describe('sobrepagos (generación de crédito)', () => {
    it('debe generar crédito cuando proyecto tiene balance negativo', async () => {
      const txPayment = { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) }
      const txProject = {
        findMany: vi.fn().mockResolvedValue([
          { id: 'project-1', projectNumber: '1001', balance: -5000, customerId: 'customer-1' },
        ]),
        update: vi.fn(),
      }
      const txCreditTransaction = { create: vi.fn() }

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({ payment: txPayment, project: txProject, customer: {}, creditTransaction: txCreditTransaction } as never)
      })

      const request = createRequest(validPayload)
      const response = await callPOST(request)

      expect(response.status).toBe(201)
      // Debe ajustar balance a 0
      expect(txProject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'project-1' },
          data: expect.objectContaining({ balance: expect.anything() }),
        })
      )
      // Debe crear CreditTransaction tipo OVERPAYMENT
      expect(txCreditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'OVERPAYMENT',
            customerId: 'customer-1',
          }),
        })
      )
      // Debe recalcular creditBalance desde ledger
      expect(updateCustomerCreditBalance).toHaveBeenCalledWith('customer-1', expect.anything())
    })

    it('debe generar créditos para múltiples proyectos con sobrepago', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        { id: 'p1', customerId: 'customer-1', currency: 'CLP' },
        { id: 'p2', customerId: 'customer-1', currency: 'CLP' },
      ] as never)

      const txCreditTransaction = { create: vi.fn() }
      const txProject = {
        findMany: vi.fn().mockResolvedValue([
          { id: 'p1', projectNumber: '1001', balance: -3000, customerId: 'customer-1' },
          { id: 'p2', projectNumber: '1002', balance: -2000, customerId: 'customer-1' },
        ]),
        update: vi.fn(),
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          payment: { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) },
          project: txProject,
          customer: { update: vi.fn() },
          creditTransaction: txCreditTransaction,
        } as never)
      })

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
      expect(txCreditTransaction.create).toHaveBeenCalledTimes(2)
    })

    it('no debe generar crédito cuando balance >= 0', async () => {
      const txCreditTransaction = { create: vi.fn() }
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          payment: { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) },
          project: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'project-1', projectNumber: '1001', balance: 5000, customerId: 'customer-1' },
            ]),
            update: vi.fn(),
          },
          customer: { update: vi.fn() },
          creditTransaction: txCreditTransaction,
        } as never)
      })

      const request = createRequest(validPayload)
      const response = await callPOST(request)

      expect(response.status).toBe(201)
      expect(txCreditTransaction.create).not.toHaveBeenCalled()
    })

    it('debe generar crédito solo para proyectos con balance negativo', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue([
        { id: 'p1', customerId: 'customer-1', currency: 'CLP' },
        { id: 'p2', customerId: 'customer-1', currency: 'CLP' },
      ] as never)

      const txCreditTransaction = { create: vi.fn() }
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          payment: { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) },
          project: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'p1', projectNumber: '1001', balance: -3000, customerId: 'customer-1' },
              { id: 'p2', projectNumber: '1002', balance: 5000, customerId: 'customer-1' },
            ]),
            update: vi.fn(),
          },
          customer: { update: vi.fn() },
          creditTransaction: txCreditTransaction,
        } as never)
      })

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
      // Solo 1 crédito (p1 con balance negativo)
      expect(txCreditTransaction.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('errores en transacción', () => {
    it('debe retornar 404 cuando cliente no se encuentra en TX (crédito)', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          payment: { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) },
          project: { findUnique: vi.fn().mockResolvedValue({ balance: 100000 }), findMany: vi.fn(), update: vi.fn() },
          customer: { findUnique: vi.fn().mockResolvedValue(null) },
          creditTransaction: { create: vi.fn() },
        } as never)
      })

      const request = createRequest({
        ...validPayload,
        creditApplied: 5000,
      })
      const response = await callPOST(request)

      expect(response.status).toBe(404)
    })

    it('debe retornar 404 cuando proyecto no se encuentra en TX (crédito)', async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          payment: { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) },
          project: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn(), update: vi.fn() },
          customer: { findUnique: vi.fn().mockResolvedValue({ creditBalance: 50000 }) },
          creditTransaction: { create: vi.fn() },
        } as never)
      })

      const request = createRequest({
        ...validPayload,
        creditApplied: 5000,
      })
      const response = await callPOST(request)

      expect(response.status).toBe(404)
    })

    it('debe retornar 400 cuando canApplyCredit es inválido en TX', async () => {
      vi.mocked(canApplyCredit).mockReturnValue({ valid: false, error: 'Crédito insuficiente' })

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          payment: { create: vi.fn().mockResolvedValue({ id: 'p1', allocations: [], installments: [] }) },
          project: { findUnique: vi.fn().mockResolvedValue({ balance: 100000 }), findMany: vi.fn(), update: vi.fn() },
          customer: {
            findUnique: vi.fn().mockResolvedValue({ creditBalance: 50000 }),
          },
          creditTransaction: { create: vi.fn() },
        } as never)
      })

      const request = createRequest({
        ...validPayload,
        creditApplied: 5000,
      })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Crédito insuficiente')
    })

    it('debe retornar 500 cuando $transaction rechaza', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('TX failed'))

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear pago')
    })
  })
})

// ============================================================================
// GET /api/payments
// ============================================================================

describe('GET /api/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockPayments = [
    {
      id: 'pay-1',
      type: 'Project',
      amount: 100000,
      date: '2024-01-15',
      customer: { id: 'c1', name: 'Cliente 1', phone: '+56911111111' },
      paymentMethod: { id: 'pm1', name: 'Efectivo', icon: null },
      allocations: [
        {
          id: 'a1',
          allocatedAmount: 100000,
          project: { id: 'p1', projectNumber: '1001', projectName: null, totalAmount: 200000, currency: 'CLP' },
        },
      ],
    },
  ]

  it('debe retornar pagos con paginación por defecto', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue(mockPayments as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(1)

    const response = await callGET(createGETRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.payments).toHaveLength(1)
    expect(data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    })
  })

  it('debe aplicar filtro search con OR conditions', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ search: 'Juan' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ customer: { name: { contains: 'Juan', mode: 'insensitive' } } }),
          ]),
        }),
      })
    )
  })

  it('debe filtrar por tipo Project', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ type: 'Project' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'Project' }),
      })
    )
  })

  it('debe ignorar tipo inválido', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ type: 'Invalid' }))

    const call = vi.mocked(prisma.payment.findMany).mock.calls[0][0]
    expect(call?.where?.type).toBeUndefined()
  })

  it('debe filtrar por paymentMethodId', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ paymentMethodId: 'pm-1' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ paymentMethodId: 'pm-1' }),
      })
    )
  })

  it('debe filtrar por projectNumber via allocations', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ projectNumber: '1001' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          allocations: { some: { project: { projectNumber: '1001' } } },
        }),
      })
    )
  })

  it('debe filtrar por customerId', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ customerId: 'c-1' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customerId: 'c-1' }),
      })
    )
  })

  it('debe filtrar por rango de fechas', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ startDate: '2024-01-01', endDate: '2024-12-31' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      })
    )
  })

  it('debe filtrar solo con startDate', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ startDate: '2024-01-01' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: expect.any(Date) },
        }),
      })
    )
  })

  it('debe filtrar por projectId via allocations', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ projectId: 'proj-1' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          allocations: { some: { projectId: 'proj-1' } },
        }),
      })
    )
  })

  it('debe respetar paginación', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(50)

    const response = await callGET(createGETRequest({ page: '3', limit: '5' }))
    const data = await response.json()

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10, // (3-1)*5
        take: 5,
      })
    )
    expect(data.pagination.totalPages).toBe(10)
  })

  it('debe limitar máximo a 100 registros', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ limit: '200' }))

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    )
  })

  it('debe incluir facets cuando includeFacets=true', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue(mockPayments as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(1)
    vi.mocked(prisma.payment.groupBy)
      .mockResolvedValueOnce([{ type: 'Project', _count: 5 }] as never)
      .mockResolvedValueOnce([{ paymentMethodId: 'pm1', _count: 3 }] as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { projectNumber: '1001', count: BigInt(2) },
    ] as never)
    vi.mocked(prisma.paymentMethod.findMany).mockResolvedValue([
      { id: 'pm1', name: 'Efectivo' },
    ] as never)

    const response = await callGET(createGETRequest({ includeFacets: 'true' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.facets).toBeDefined()
    expect(data.facets.type).toBeDefined()
    expect(data.facets.paymentMethod).toBeDefined()
    expect(data.facets.projectNumber).toBeDefined()
  })

  it('no debe incluir facets por defecto', async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    const response = await callGET(createGETRequest())
    const data = await response.json()

    expect(data.facets).toBeUndefined()
    expect(prisma.payment.groupBy).not.toHaveBeenCalled()
  })

  it('debe retornar 500 cuando findMany falla', async () => {
    vi.mocked(prisma.payment.findMany).mockRejectedValue(new Error('DB Error'))

    const response = await callGET(createGETRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener pagos')
  })
})
