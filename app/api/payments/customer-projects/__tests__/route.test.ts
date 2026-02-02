/**
 * Tests para app/api/payments/customer-projects/route.ts (GET)
 *
 * Valida:
 * - Proyectos del cliente con balance > 0
 * - Validación de customerId requerido y UUID
 * - Cliente no existe → 404
 * - Orden FIFO (createdAt ASC)
 * - Filtrado en memoria por balance calculado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

vi.mock('@/lib/business-logic/project-balance', () => ({
  calculateProjectBalance: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { calculateProjectBalance } from '@/lib/business-logic/project-balance'
import { GET } from '../route'

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
        currency: 'CLP',
        createdAt: new Date('2024-01-01'),
        customer: { id: validCustomerId, name: 'Cliente Test' },
        paymentAllocations: [{ allocatedAmount: 30000 }],
      },
    ] as never)

    vi.mocked(calculateProjectBalance).mockReturnValue({ balance: 70000 } as never)

    const response = await GET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].balance).toBe(70000)
  })

  it('debe retornar 400 sin customerId', async () => {
    const response = await GET(createRequest())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('customerId')
  })

  it('debe retornar 400 con customerId no UUID', async () => {
    const response = await GET(createRequest({ customerId: 'not-a-uuid' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID')
  })

  it('debe retornar 404 cuando cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const response = await GET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Cliente no encontrado')
  })

  it('debe retornar array vacío cuando todos los proyectos tienen balance 0', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: validCustomerId,
      name: 'Cliente',
    } as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        id: 'p1',
        projectNumber: '1001',
        projectName: null,
        totalAmount: 50000,
        currency: 'CLP',
        createdAt: new Date(),
        customer: { id: validCustomerId, name: 'Cliente' },
        paymentAllocations: [{ allocatedAmount: 50000 }],
      },
    ] as never)
    vi.mocked(calculateProjectBalance).mockReturnValue({ balance: 0 } as never)

    const response = await GET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('debe ordenar por createdAt ASC (FIFO)', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: validCustomerId,
      name: 'Cliente',
    } as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)

    await GET(createRequest({ customerId: validCustomerId }))

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    )
  })

  it('debe retornar 500 cuando ocurre un error', async () => {
    vi.mocked(prisma.customer.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await GET(createRequest({ customerId: validCustomerId }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Error al obtener')
  })
})
