/**
 * Tests para app/api/payments/customer-projects/route.ts (GET)
 *
 * Valida:
 * - Validación de customerId requerido y UUID (BusinessError)
 * - Cliente no existe → 404
 * - Proyectos del cliente con balance > 0
 * - Orden FIFO (createdAt ASC)
 * - Filtrado en DB por balance > 0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

vi.mock('@/lib/db', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET as _GET } from '../route'

function callGET(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (_GET as any)(request, { params: Promise.resolve({}) })
}

const validCustomerId = '00000000-0000-0000-0000-000000000001'

function createRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/payments/customer-projects')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/payments/customer-projects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar proyectos del cliente con balance > 0', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: validCustomerId,
      name: 'Cliente Test',
    } as never)

    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        id: 'p1',
        projectNumber: '1001',
        projectName: null,
        totalAmount: 100000,
        balance: 70000,
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        customer: { id: validCustomerId, name: 'Cliente Test' },
      },
    ] as never)

    const response = await callGET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].balance).toBe(70000)
  })

  it('debe retornar 400 sin customerId', async () => {
    const response = await callGET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('customerId')
  })

  it('debe retornar 400 con customerId no UUID', async () => {
    const response = await callGET(createRequest({ customerId: 'not-a-uuid' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID')
  })

  it('debe retornar 404 cuando cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const response = await callGET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Cliente no encontrado')
  })

  it('debe retornar array vacío cuando no hay proyectos con balance pendiente', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: validCustomerId,
      name: 'Cliente',
    } as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    const response = await callGET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('debe filtrar por balance > 0 en la query de DB', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: validCustomerId,
      name: 'Cliente',
    } as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    await callGET(createRequest({ customerId: validCustomerId }))

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          balance: { gt: 0 },
        }),
      })
    )
  })

  it('debe ordenar por createdAt ASC (FIFO)', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: validCustomerId,
      name: 'Cliente',
    } as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    await callGET(createRequest({ customerId: validCustomerId }))

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    )
  })

  it('debe retornar 500 cuando ocurre un error inesperado', async () => {
    vi.mocked(prisma.customer.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await callGET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener proyectos del cliente')
  })
})
