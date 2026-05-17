/**
 * Tests para app/api/customers/route.ts (GET/POST endpoints)
 *
 * Valida:
 * - GET: Paginación, búsqueda, respuesta correcta
 * - POST: Validaciones de entrada, email duplicado, creación exitosa
 *
 * NOTA: Estos tests mockean Prisma y se enfocan en validaciones,
 * no en la creación real de registros.
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
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    project: {
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

// Mock de credit-management (creditBalance se calcula desde ledger)
vi.mock('@/lib/business-logic/credit-management', () => ({
  getCustomerCreditBalances: vi.fn().mockResolvedValue(new Map()),
}))

import { prisma } from '@/lib/db'
import { GET, POST } from '../route'

// Helper para llamar al handler con context mock
async function callGET(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (GET as any)(request, context)
}

async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

// Helper para crear request GET
function createGetRequest(searchParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/customers')
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

// Helper para crear request POST
function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/customers', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.project.groupBy).mockResolvedValue([])
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])
  })

  describe('paginación básica', () => {
    it('debe retornar lista vacía cuando no hay clientes', async () => {
      vi.mocked(prisma.customer.count).mockResolvedValue(0)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])

      const request = createGetRequest()
      const response = await callGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers).toEqual([])
      expect(data.pagination.total).toBe(0)
    })

    it('debe retornar clientes con paginación por defecto', async () => {
      const mockCustomers = [
        { id: '1', name: 'Cliente 1', email: 'c1@test.com', phone: '+56912345678' },
        { id: '2', name: 'Cliente 2', email: 'c2@test.com', phone: '+56912345679' },
      ]
      vi.mocked(prisma.customer.count).mockResolvedValue(2)
      vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers as never)

      const request = createGetRequest()
      const response = await callGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.customers).toHaveLength(2)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
    })

    it('debe respetar parámetros de paginación', async () => {
      vi.mocked(prisma.customer.count).mockResolvedValue(50)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])

      const request = createGetRequest({ page: '2', limit: '20' })
      const response = await callGET(request)
      const data = await response.json()

      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(20)
      expect(data.pagination.totalPages).toBe(3)
    })

    it('debe limitar máximo a 100 registros', async () => {
      vi.mocked(prisma.customer.count).mockResolvedValue(200)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])

      const request = createGetRequest({ limit: '500' })
      const response = await callGET(request)
      const data = await response.json()

      expect(data.pagination.limit).toBe(100)
    })
  })

  describe('búsqueda', () => {
    it('debe buscar por nombre', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: '1' }])
      vi.mocked(prisma.customer.count).mockResolvedValue(1)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([
        { id: '1', name: 'Juan Pérez', email: null, phone: '+56912345678' },
      ] as never)

      const request = createGetRequest({ search: 'Juan' })
      await callGET(request)

      expect(prisma.$queryRaw).toHaveBeenCalled()
      expect(prisma.customer.findMany).toHaveBeenCalled()
    })

    it('debe buscar por email', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: '1' }])
      vi.mocked(prisma.customer.count).mockResolvedValue(1)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])

      const request = createGetRequest({ search: 'test@email.com' })
      await callGET(request)

      expect(prisma.$queryRaw).toHaveBeenCalled()
      expect(prisma.customer.findMany).toHaveBeenCalled()
    })

    it('debe buscar por teléfono', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: '1' }])
      vi.mocked(prisma.customer.count).mockResolvedValue(1)
      vi.mocked(prisma.customer.findMany).mockResolvedValue([])

      const request = createGetRequest({ search: '+56912345678' })
      await callGET(request)

      expect(prisma.$queryRaw).toHaveBeenCalled()
      expect(prisma.customer.findMany).toHaveBeenCalled()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando Prisma falla', async () => {
      vi.mocked(prisma.customer.count).mockRejectedValue(new Error('DB Error'))

      const request = createGetRequest()
      const response = await callGET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al obtener clientes')
    })
  })
})

describe('POST /api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validaciones de campos requeridos', () => {
    it('debe rechazar sin nombre', async () => {
      const request = createPostRequest({ phone: '+56912345678' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['name'] })])
      )
    })

    it('debe rechazar nombre vacío', async () => {
      const request = createPostRequest({ name: '   ', phone: '+56912345678' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['name'] })])
      )
    })

    it('debe rechazar sin teléfono', async () => {
      const request = createPostRequest({ name: 'Test' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['phone'] })])
      )
    })

    it('debe rechazar teléfono vacío', async () => {
      const request = createPostRequest({ name: 'Test', phone: '' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['phone'] })])
      )
    })
  })

  describe('validaciones de email', () => {
    it('debe aceptar cliente sin email', async () => {
      vi.mocked(prisma.customer.create).mockResolvedValue({
        id: '1',
        name: 'Test',
        phone: '+56912345678',
        email: null,
      } as never)

      const request = createPostRequest({ name: 'Test', phone: '+56912345678' })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })

    it('debe rechazar email inválido', async () => {
      const request = createPostRequest({
        name: 'Test',
        phone: '+56912345678',
        email: 'no-es-email',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
      expect(data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['email'] })])
      )
    })

    it('debe rechazar email duplicado', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue({
        id: 'existing',
        email: 'duplicate@test.com',
      } as never)

      const request = createPostRequest({
        name: 'Test',
        phone: '+56912345678',
        email: 'duplicate@test.com',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('Ya existe un cliente con ese email')
    })

    it('debe aceptar email válido único', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.customer.create).mockResolvedValue({
        id: '1',
        name: 'Test',
        phone: '+56912345678',
        email: 'unique@test.com',
      } as never)

      const request = createPostRequest({
        name: 'Test',
        phone: '+56912345678',
        email: 'unique@test.com',
      })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('creación exitosa', () => {
    it('debe crear cliente con campos obligatorios', async () => {
      vi.mocked(prisma.customer.create).mockResolvedValue({
        id: 'new-customer',
        name: 'Juan Pérez',
        phone: '+56912345678',
        email: null,
        creditBalance: 0,
      } as never)

      const request = createPostRequest({
        name: 'Juan Pérez',
        phone: '+56912345678',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-customer')
      expect(data.name).toBe('Juan Pérez')
    })

    it('debe trimear espacios en nombre y teléfono', async () => {
      vi.mocked(prisma.customer.create).mockResolvedValue({
        id: '1',
        name: 'Test',
        phone: '+56912345678',
        email: null,
      } as never)

      const request = createPostRequest({
        name: '  Test  ',
        phone: '  +56912345678  ',
      })
      await callPOST(request)

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test',
          phone: '+56912345678',
        }),
      })
    })

    it('debe crear cliente con todos los campos', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.customer.create).mockResolvedValue({
        id: '1',
        name: 'Test',
        phone: '+56912345678',
        email: 'test@example.com',
      } as never)

      const request = createPostRequest({
        name: 'Test',
        phone: '+56912345678',
        email: 'test@example.com',
      })
      await callPOST(request)

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test',
          phone: '+56912345678',
          email: 'test@example.com',
        }),
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando Prisma falla en creación', async () => {
      vi.mocked(prisma.customer.create).mockRejectedValue(new Error('DB Error'))

      const request = createPostRequest({
        name: 'Test',
        phone: '+56912345678',
      })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al crear cliente')
    })
  })
})
