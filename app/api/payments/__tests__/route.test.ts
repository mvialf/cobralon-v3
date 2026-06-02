/**
 * Tests para app/api/payments/route.ts (GET y POST endpoints)
 *
 * Valida:
 * - GET: Listado con filtros, paginación y facets
 * - POST: Contrato HTTP, validación Zod y traducción de errores
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { BusinessError } from '@/lib/api-handler'

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
      createMany: vi.fn(),
    },
    projectApplication: {
      createMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/use-cases/payments/create-payment', () => ({
  createPayment: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { createPayment } from '@/lib/use-cases/payments/create-payment'
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
    vi.mocked(createPayment).mockResolvedValue({
      id: 'payment-1',
      allocations: [],
      installments: [],
    } as never)
  })

  describe('validaciones Zod del body', () => {
    it('debe rechazar tipo inválido', async () => {
      const request = createRequest({ ...validPayload, type: 'Invalid' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
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

    it('debe rechazar sin customerId', async () => {
      const { customerId: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Datos inválidos')
    })

    it('debe rechazar amount <= 0', async () => {
      const request = createRequest({ ...validPayload, amount: 0 })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Datos inválidos')
    })

    it('debe rechazar amount negativo', async () => {
      const request = createRequest({ ...validPayload, amount: -1000 })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar crédito top-level en payload API', async () => {
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
      expect(data.error).toBe('Datos inválidos')
      expect(createPayment).not.toHaveBeenCalled()
    })

    it('debe rechazar sin fecha', async () => {
      const { date: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Datos inválidos')
    })

    it('debe rechazar moneda inválida', async () => {
      const request = createRequest({ ...validPayload, currency: 'INVALID' })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Datos inválidos')
    })

    it('debe rechazar sin paymentMethodId', async () => {
      const { paymentMethodId: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })

    it('debe rechazar sin allocations', async () => {
      const { allocations: _, ...payload } = validPayload
      const request = createRequest(payload)
      const response = await callPOST(request)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Datos inválidos')
    })

    it('debe rechazar allocations vacías', async () => {
      const request = createRequest({ ...validPayload, allocations: [] })
      const response = await callPOST(request)

      expect(response.status).toBe(400)
    })


    it('debe aceptar tipo Customer con múltiples allocations', async () => {
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
      expect(createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Customer',
          allocations: [
            expect.objectContaining({ projectId: 'p1', allocatedAmount: 50000 }),
            expect.objectContaining({ projectId: 'p2', allocatedAmount: 50000 }),
          ],
        }),
        expect.any(Object)
      )
    })

  })

  describe('creación exitosa', () => {
    it('debe crear pago con allocations', async () => {
      const request = createRequest(validPayload)
      const response = await callPOST(request)

      expect(response.status).toBe(201)
      expect(createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Project',
          customerId: 'customer-1',
          amount: 100000,
          currency: 'CLP',
          paymentMethodId: 'pm-1',
          date: expect.any(Date),
          allocations: [
            expect.objectContaining({
              projectId: 'project-1',
              allocatedAmount: 100000,
              creditApplied: 0,
            }),
          ],
        }),
        expect.objectContaining({
          child: expect.any(Function),
        })
      )
    })

    it('debe incluir datos del pago en respuesta', async () => {
      const customPaymentResult = {
        id: 'payment-123',
        type: 'Project',
        amount: 100000,
        allocations: [
          {
            id: 'alloc-1',
            projectId: 'project-1',
            allocatedAmount: 100000,
            project: { id: 'project-1' },
          },
        ],
        installments: [],
      }
      vi.mocked(createPayment).mockResolvedValueOnce(customPaymentResult as never)

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(data.id).toBe('payment-123')
      expect(data.allocations).toHaveLength(1)
    })
  })

  describe('traducción de errores', () => {
    it('debe traducir BusinessError a status HTTP', async () => {
      vi.mocked(createPayment).mockRejectedValueOnce(new BusinessError('Crédito insuficiente', 400))

      const request = createRequest(validPayload)
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Crédito insuficiente')
    })

    it('debe traducir error inesperado a fallback 500', async () => {
      vi.mocked(createPayment).mockRejectedValueOnce(new Error('TX failed'))

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
          project: {
            id: 'p1',
            projectNumber: '1001',
            projectName: null,
            totalAmount: 200000,
            currency: 'CLP',
          },
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

  it('debe aplicar filtro search via $queryRaw + IDs', async () => {
    // $queryRaw busca IDs de payments que matchean por nombre de cliente/proyecto
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: 'pay-1' }, { id: 'pay-2' }] as never)
    vi.mocked(prisma.payment.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.payment.count).mockResolvedValue(0)

    await callGET(createGETRequest({ search: 'Juan' }))

    expect(prisma.$queryRaw).toHaveBeenCalled()
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['pay-1', 'pay-2'] },
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

    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }))
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
