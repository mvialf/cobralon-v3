/**
 * Tests para app/api/customers/[id]/account/route.ts (GET)
 *
 * Valida:
 * - Obtención de estado de cuenta del cliente
 * - Cálculo de balance por proyecto
 * - Formato de respuesta
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

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
function createRequest(): Request {
  return new Request('http://localhost:3000/api/customers/test-id/account', {
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
      projects: [],
    } as never)

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
      projects: [
        {
          id: 'project-1',
          projectNumber: 'P-001',
          projectName: 'Mi Proyecto',
          totalAmount: new Decimal(1190000),
          balance: new Decimal(690000),
          currency: 'CLP',
        },
        {
          id: 'project-2',
          projectNumber: 'P-002',
          projectName: null,
          totalAmount: new Decimal(500000),
          balance: new Decimal(500000),
          currency: 'CLP',
        },
      ],
    } as never)

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
      projects: [
        {
          id: 'project-1',
          projectNumber: 'P-001',
          projectName: 'Test',
          totalAmount: new Decimal(1000000),
          balance: new Decimal(700000),
          currency: 'CLP',
        },
      ],
    } as never)

    const response = await GET(createRequest(), createParams('customer-1'))
    const data = await response.json()

    expect(data.projects[0].totalPaid).toBe(300000)
  })

  it('debe convertir Decimal a number', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
      projects: [
        {
          id: 'project-1',
          projectNumber: 'P-001',
          projectName: null,
          totalAmount: new Decimal(1000000),
          balance: new Decimal(1000000),
          currency: 'CLP',
        },
      ],
    } as never)

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
