/**
 * Tests para app/api/customers/[id]/route.ts (GET/PUT/DELETE endpoints)
 *
 * Valida:
 * - GET: Obtención de cliente, 404 cuando no existe
 * - PUT: Validaciones, email duplicado, actualización exitosa
 * - DELETE: Eliminación, 404 cuando no existe
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET, PUT, DELETE } from '../route'

// Helper para crear params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Helper para crear request
function createRequest(method: string, body?: Record<string, unknown>): Request {
  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new Request('http://localhost:3000/api/customers/test-id', init)
}

describe('GET /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 404 cuando cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const request = createRequest('GET')
    const response = await GET(request, createParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Cliente no encontrado')
  })

  it('debe retornar cliente cuando existe', async () => {
    const mockCustomer = {
      id: 'customer-1',
      name: 'Juan Pérez',
      email: 'juan@test.com',
      phone: '+56912345678',
      creditBalance: 50000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

    const request = createRequest('GET')
    const response = await GET(request, createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('customer-1')
    expect(data.name).toBe('Juan Pérez')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.customer.findUnique).mockRejectedValue(new Error('DB Error'))

    const request = createRequest('GET')
    const response = await GET(request, createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener cliente')
  })
})

describe('PUT /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validaciones', () => {
    it('debe retornar 404 cuando cliente no existe', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { name: 'Nuevo Nombre' })
      const response = await PUT(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Cliente no encontrado')
    })

    it('debe rechazar teléfono vacío cuando se intenta actualizar', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
      } as never)

      const request = createRequest('PUT', { phone: '' })
      const response = await PUT(request, createParams('customer-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('teléfono')
    })

    it('debe rechazar email inválido', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
      } as never)

      const request = createRequest('PUT', { email: 'no-es-email' })
      const response = await PUT(request, createParams('customer-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('email no es válido')
    })

    it('debe rechazar email duplicado en otro cliente', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
      } as never)
      vi.mocked(prisma.customer.findFirst).mockResolvedValue({
        id: 'other-customer',
        email: 'duplicate@test.com',
      } as never)

      const request = createRequest('PUT', { email: 'duplicate@test.com' })
      const response = await PUT(request, createParams('customer-1'))
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('Ya existe otro cliente con ese email')
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar solo el nombre', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Nombre Anterior',
        phone: '+56912345678',
      } as never)
      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: 'customer-1',
        name: 'Nuevo Nombre',
        phone: '+56912345678',
      } as never)

      const request = createRequest('PUT', { name: 'Nuevo Nombre' })
      const response = await PUT(request, createParams('customer-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Nuevo Nombre')
    })

    it('debe actualizar teléfono', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
      } as never)
      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56987654321',
      } as never)

      const request = createRequest('PUT', { phone: '+56987654321' })
      const response = await PUT(request, createParams('customer-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.phone).toBe('+56987654321')
    })

    it('debe permitir email del mismo cliente (sin cambio)', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
        email: 'same@test.com',
      } as never)
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null) // No hay duplicados
      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
        email: 'same@test.com',
      } as never)

      const request = createRequest('PUT', { email: 'same@test.com' })
      const response = await PUT(request, createParams('customer-1'))

      expect(response.status).toBe(200)
    })

    it('debe permitir limpiar email (null)', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
        email: 'old@test.com',
      } as never)
      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
        email: null,
      } as never)

      const request = createRequest('PUT', { email: '' })
      const response = await PUT(request, createParams('customer-1'))

      expect(response.status).toBe(200)
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: expect.objectContaining({ email: null }),
      })
    })

    it('debe trimear espacios en valores', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
      } as never)
      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: 'customer-1',
        name: 'Nuevo',
        phone: '+56999999999',
      } as never)

      const request = createRequest('PUT', {
        name: '  Nuevo  ',
        phone: '  +56999999999  ',
      })
      await PUT(request, createParams('customer-1'))

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: expect.objectContaining({
          name: 'Nuevo',
          phone: '+56999999999',
        }),
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando Prisma falla', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 'customer-1',
        name: 'Test',
        phone: '+56912345678',
      } as never)
      vi.mocked(prisma.customer.update).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('PUT', { name: 'Nuevo' })
      const response = await PUT(request, createParams('customer-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar cliente')
    })
  })
})

describe('DELETE /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 404 cuando cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const request = createRequest('DELETE')
    const response = await DELETE(request, createParams('nonexistent'))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Cliente no encontrado')
  })

  it('debe eliminar cliente existente', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
    } as never)
    vi.mocked(prisma.customer.delete).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
    } as never)

    const request = createRequest('DELETE')
    const response = await DELETE(request, createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Cliente eliminado')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: 'customer-1',
      name: 'Test',
    } as never)
    vi.mocked(prisma.customer.delete).mockRejectedValue(new Error('FK Constraint'))

    const request = createRequest('DELETE')
    const response = await DELETE(request, createParams('customer-1'))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al eliminar cliente')
  })
})
