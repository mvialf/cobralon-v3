/**
 * Tests para app/api/customers/[id]/account/route.ts (GET)
 *
 * Valida:
 * - Obtención de estado de cuenta del cliente
 * - Cálculo de balance por proyecto
 * - Formato de respuesta
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
    $queryRaw: vi.fn(),
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
  return new NextRequest('http://localhost:3000/api/customers/test-id/account', {
    method: 'GET',
  })
}

describe('GET /api/customers/[id]/account', () => {
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

  it('debe retornar cliente sin proyectos', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Juan Pérez',
    } as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customer.id).toBe('customer-1')
    expect(data.customer.name).toBe('Juan Pérez')
    expect(data.projects).toEqual([])
  })

  it('debe derivar balance y totalPaid de cada proyecto', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test Customer',
    } as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          id: 'project-1',
          projectNumber: 'P-001',
          projectName: 'Mi Proyecto',
          totalAmount: new Decimal(1190000),
          settledTotal: new Decimal(500000),
          balance: new Decimal(690000),
          currency: 'CLP',
        },
        {
          id: 'project-2',
          projectNumber: 'P-002',
          projectName: null,
          totalAmount: new Decimal(500000),
          settledTotal: new Decimal(0),
          balance: new Decimal(500000),
          currency: 'CLP',
        },
      ])

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.projects).toHaveLength(2)
    expect(data.projects[0].balance).toBe(690000)
    expect(data.projects[0].totalPaid).toBe(500000)
    expect(data.projects[1].balance).toBe(500000)
    expect(data.projects[1].totalPaid).toBe(0)
  })

  it('debe incluir totalPaid en cada proyecto', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
    } as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          id: 'project-1',
          projectNumber: 'P-001',
          projectName: 'Test',
          totalAmount: new Decimal(1000000),
          settledTotal: new Decimal(300000),
          balance: new Decimal(700000),
          currency: 'CLP',
        },
      ])

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(data.projects[0].totalPaid).toBe(300000)
  })

  it('debe convertir Decimal a number', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
    } as never)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          id: 'project-1',
          projectNumber: 'P-001',
          projectName: null,
          totalAmount: new Decimal(1000000),
          settledTotal: new Decimal(0),
          balance: new Decimal(1000000),
          currency: 'CLP',
        },
      ])

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(typeof data.projects[0].totalAmount).toBe('number')
    expect(typeof data.projects[0].balance).toBe('number')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.customer.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener estado de cuenta')
  })
})
