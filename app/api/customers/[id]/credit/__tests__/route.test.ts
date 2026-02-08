/**
 * Tests para app/api/customers/[id]/credit/route.ts (GET)
 *
 * Valida:
 * - Obtención de crédito y transacciones
 * - Formato de respuesta
 * - Límite de transacciones
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

// Mock del logger middleware
vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (handler: Function) => {
    return async (
      request: NextRequest,
      context?: { params: Promise<Record<string, string>> }
    ) => {
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
  },
}))

import { prisma } from '@/lib/db'
import { GET } from '../route'

// Helper para crear params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Helper para crear request
function createRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/customers/test-id/credit', {
    method: 'GET',
  })
}

describe('GET /api/customers/[id]/credit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 404 cuando cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const response = await GET(createRequest(), createParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Cliente no encontrado')
  })

  it('debe retornar creditBalance y transacciones vacías', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
      creditBalance: new Decimal(0),
      creditTransactions: [],
    } as never)

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.creditBalance).toBeDefined()
    expect(data.transactions).toEqual([])
  })

  it('debe retornar crédito disponible', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
      creditBalance: new Decimal(150000),
      creditTransactions: [],
    } as never)

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Number(data.creditBalance)).toBe(150000)
  })

  it('debe retornar historial de transacciones', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
      creditBalance: new Decimal(50000),
      creditTransactions: [
        {
          id: 'tx-1',
          amount: new Decimal(100000),
          type: 'DEPOSIT',
          description: 'Pago excedente',
          createdAt: new Date('2024-01-15'),
          project: { id: 'p1', projectNumber: 'P-001', projectName: 'Test' },
          payment: { id: 'pay-1', amount: new Decimal(500000), date: new Date() },
        },
        {
          id: 'tx-2',
          amount: new Decimal(-50000),
          type: 'WITHDRAWAL',
          description: 'Aplicado a proyecto',
          createdAt: new Date('2024-01-16'),
          project: { id: 'p2', projectNumber: 'P-002', projectName: null },
          payment: null,
        },
      ],
    } as never)

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.transactions).toHaveLength(2)
    expect(data.transactions[0].type).toBe('DEPOSIT')
    expect(data.transactions[1].type).toBe('WITHDRAWAL')
  })

  it('debe incluir relaciones de proyecto y pago', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
      creditBalance: new Decimal(0),
      creditTransactions: [
        {
          id: 'tx-1',
          amount: new Decimal(100000),
          type: 'DEPOSIT',
          description: 'Test',
          createdAt: new Date(),
          project: { id: 'p1', projectNumber: 'P-001', projectName: 'Mi Proyecto' },
          payment: { id: 'pay-1', amount: new Decimal(500000), date: new Date() },
        },
      ],
    } as never)

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(data.transactions[0].project).toBeDefined()
    expect(data.transactions[0].project.projectNumber).toBe('P-001')
    expect(data.transactions[0].payment).toBeDefined()
  })

  it('debe solicitar últimas 50 transacciones', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
      creditBalance: new Decimal(0),
      creditTransactions: [],
    } as never)

    await GET(createRequest(), createParams('customer-1'))

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      select: expect.objectContaining({
        creditTransactions: expect.objectContaining({
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      }),
    })
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.customer.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener información de crédito')
  })
})
