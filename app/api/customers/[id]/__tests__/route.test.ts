/**
 * Tests para app/api/customers/[id]/route.ts (GET/PUT/DELETE endpoints)
 *
 * Valida:
 * - UUID validation (withApiHandler)
 * - GET: Obtención de cliente, 404 cuando no existe
 * - PUT: Validación Zod (updateCustomerApiSchema), email duplicado → 409
 * - DELETE: Eliminación, 404 cuando no existe
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock de logger-middleware (requerido por withApiHandler)
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
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET, PUT, DELETE } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function createContext(id: string = VALID_UUID) {
  return { params: Promise.resolve({ id }) }
}

async function callGET(id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/customers/' + id)
  return (GET as any)(request, createContext(id))
}

async function callPUT(body: Record<string, unknown>, id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/customers/' + id, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  return (PUT as any)(request, createContext(id))
}

async function callDELETE(id: string = VALID_UUID) {
  const request = new NextRequest('http://localhost:3000/api/customers/' + id, { method: 'DELETE' })
  return (DELETE as any)(request, createContext(id))
}

describe('UUID validation', () => {
  it('debe rechazar UUID inválido', async () => {
    const response = await callGET('not-a-uuid')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })
})

describe('GET /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar 404 cuando cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Cliente no encontrado')
  })

  it('debe retornar cliente cuando existe', async () => {
    const mockCustomer = {
      id: VALID_UUID,
      name: 'Juan Pérez',
      email: 'juan@test.com',
      phone: '+56912345678',
      creditBalance: 50000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('Juan Pérez')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.customer.findUnique).mockRejectedValue(new Error('DB Error'))

    const response = await callGET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al obtener cliente')
  })
})

describe('PUT /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Test',
      phone: '+56912345678',
    } as never)
    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.customer.update).mockResolvedValue({
      id: VALID_UUID,
      name: 'Nuevo Nombre',
      phone: '+56912345678',
    } as never)
  })

  describe('validaciones', () => {
    it('debe retornar 404 cuando cliente no existe', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const response = await callPUT({ name: 'Nuevo Nombre' })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Cliente no encontrado')
    })

    it('debe rechazar email inválido (Zod)', async () => {
      const response = await callPUT({ email: 'no-es-email' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar email duplicado en otro cliente', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue({
        id: 'other-customer',
        email: 'duplicate@test.com',
      } as never)

      const response = await callPUT({ email: 'duplicate@test.com' })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('Ya existe otro cliente con ese email')
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar solo el nombre', async () => {
      const response = await callPUT({ name: 'Nuevo Nombre' })

      expect(response.status).toBe(200)
      expect(prisma.customer.update).toHaveBeenCalled()
    })

    it('debe actualizar teléfono', async () => {
      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: VALID_UUID,
        name: 'Test',
        phone: '+56987654321',
      } as never)

      const response = await callPUT({ phone: '+56987654321' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.phone).toBe('+56987654321')
    })

    it('debe permitir email del mismo cliente (sin cambio)', async () => {
      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null)

      const response = await callPUT({ email: 'same@test.com' })

      expect(response.status).toBe(200)
    })

    it('debe permitir limpiar email (empty string → null)', async () => {
      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: VALID_UUID,
        name: 'Test',
        phone: '+56912345678',
        email: null,
      } as never)

      const response = await callPUT({ email: '' })

      expect(response.status).toBe(200)
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: VALID_UUID },
        data: expect.objectContaining({ email: null }),
      })
    })

    it('debe aceptar body vacío (partial schema)', async () => {
      const response = await callPUT({})

      expect(response.status).toBe(200)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando Prisma falla', async () => {
      vi.mocked(prisma.customer.update).mockRejectedValue(new Error('DB Error'))

      const response = await callPUT({ name: 'Nuevo' })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar cliente')
    })
  })
})

describe('DELETE /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Test',
    } as never)
    vi.mocked(prisma.customer.delete).mockResolvedValue({
      id: VALID_UUID,
      name: 'Test',
    } as never)
  })

  it('debe retornar 404 cuando cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const response = await callDELETE()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Cliente no encontrado')
  })

  it('debe eliminar cliente existente', async () => {
    const response = await callDELETE()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Cliente eliminado')
  })

  it('debe manejar errores de base de datos', async () => {
    vi.mocked(prisma.customer.delete).mockRejectedValue(new Error('FK Constraint'))

    const response = await callDELETE()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Error al eliminar cliente')
  })
})
