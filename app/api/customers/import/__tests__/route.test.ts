/**
 * Tests para app/api/customers/import/route.ts (POST batch)
 *
 * Valida:
 * - Array de clientes requerido
 * - Validación Zod por cada cliente
 * - Detección de emails duplicados
 * - Creación en batch
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

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock de validaciones
vi.mock('@/lib/validations/customer-validations', () => ({
  customerSchema: {
    safeParse: vi.fn(),
  },
}))

import { prisma } from '@/lib/db'
import { customerSchema } from '@/lib/validations/customer-validations'
import { POST } from '../route'

// Helper para llamar al handler
async function callPOST(request: NextRequest) {
  const context = { params: Promise.resolve({}) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (POST as any)(request, context)
}

// Helper para crear request
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/customers/import', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/customers/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: validación pasa
    vi.mocked(customerSchema.safeParse).mockReturnValue({
      success: true,
      data: { name: 'Test', phone: '+56912345678' },
    } as never)
  })

  describe('validaciones de entrada', () => {
    it('debe rechazar sin array de clientes', async () => {
      const request = createRequest({})
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('array de clientes')
    })

    it('debe rechazar array vacío', async () => {
      const request = createRequest({ customers: [] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('array de clientes')
    })

    it('debe rechazar si no es un array', async () => {
      const request = createRequest({ customers: 'not-an-array' })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('array de clientes')
    })
  })

  describe('validación Zod por cliente', () => {
    it('debe validar cada cliente con schema', async () => {
      const customers = [
        { name: 'Cliente 1', phone: '+56911111111' },
        { name: 'Cliente 2', phone: '+56922222222' },
      ]

      vi.mocked(customerSchema.safeParse)
        .mockReturnValueOnce({ success: true, data: customers[0] } as never)
        .mockReturnValueOnce({ success: true, data: customers[1] } as never)

      vi.mocked(prisma.$transaction).mockResolvedValue([
        { id: '1', ...customers[0] },
        { id: '2', ...customers[1] },
      ])

      const request = createRequest({ customers })
      await callPOST(request)

      expect(customerSchema.safeParse).toHaveBeenCalledTimes(2)
    })

    it('debe rechazar si algún cliente falla validación', async () => {
      const customers = [
        { name: 'Cliente 1', phone: '+56911111111' },
        { name: '', phone: '+56922222222' }, // Inválido
      ]

      vi.mocked(customerSchema.safeParse)
        .mockReturnValueOnce({ success: true, data: customers[0] } as never)
        .mockReturnValueOnce({
          success: false,
          error: { errors: [{ message: 'Nombre es requerido' }] },
        } as never)

      const request = createRequest({ customers })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('errores de validación')
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0].index).toBe(1)
    })

    it('debe incluir todos los errores de validación', async () => {
      const customers = [
        { name: '', phone: '' },
        { name: '', phone: '' },
      ]

      vi.mocked(customerSchema.safeParse)
        .mockReturnValueOnce({
          success: false,
          error: { errors: [{ message: 'Error 1' }] },
        } as never)
        .mockReturnValueOnce({
          success: false,
          error: { errors: [{ message: 'Error 2' }] },
        } as never)

      const request = createRequest({ customers })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.errors).toHaveLength(2)
    })
  })

  describe('detección de duplicados', () => {
    it('debe rechazar emails duplicados existentes', async () => {
      const customers = [
        { name: 'Test 1', phone: '+56911111111', email: 'duplicate@test.com' },
      ]

      vi.mocked(customerSchema.safeParse).mockReturnValue({
        success: true,
        data: customers[0],
      } as never)

      vi.mocked(prisma.customer.findMany).mockResolvedValue([
        { email: 'duplicate@test.com' },
      ] as never)

      const request = createRequest({ customers })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('duplicate@test.com')
      expect(data.duplicates).toContain('duplicate@test.com')
    })

    it('debe permitir clientes sin email', async () => {
      const customers = [
        { name: 'Test 1', phone: '+56911111111' }, // Sin email
      ]

      vi.mocked(customerSchema.safeParse).mockReturnValue({
        success: true,
        data: customers[0],
      } as never)

      vi.mocked(prisma.$transaction).mockResolvedValue([
        { id: '1', ...customers[0], email: null },
      ])

      const request = createRequest({ customers })
      const response = await callPOST(request)

      expect(response.status).toBe(201)
      // No debe buscar duplicados si no hay emails
      expect(prisma.customer.findMany).not.toHaveBeenCalled()
    })
  })

  describe('creación exitosa', () => {
    it('debe crear clientes en batch', async () => {
      const customers = [
        { name: 'Cliente 1', phone: '+56911111111' },
        { name: 'Cliente 2', phone: '+56922222222' },
      ]

      vi.mocked(customerSchema.safeParse)
        .mockReturnValueOnce({ success: true, data: customers[0] } as never)
        .mockReturnValueOnce({ success: true, data: customers[1] } as never)

      vi.mocked(prisma.$transaction).mockResolvedValue([
        { id: '1', ...customers[0], email: null },
        { id: '2', ...customers[1], email: null },
      ])

      const request = createRequest({ customers })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.imported).toBe(2)
      expect(data.customers).toHaveLength(2)
    })

    it('debe retornar clientes creados en respuesta', async () => {
      const customer = { name: 'Test', phone: '+56912345678', email: 'test@test.com' }

      vi.mocked(customerSchema.safeParse).mockReturnValue({
        success: true,
        data: customer,
      } as never)

      vi.mocked(prisma.customer.findMany).mockResolvedValue([])
      vi.mocked(prisma.$transaction).mockResolvedValue([
        { id: 'new-id', ...customer },
      ])

      const request = createRequest({ customers: [customer] })
      const response = await callPOST(request)
      const data = await response.json()

      expect(data.customers[0].id).toBe('new-id')
      expect(data.customers[0].name).toBe('Test')
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      const customers = [{ name: 'Test', phone: '+56912345678' }]

      vi.mocked(customerSchema.safeParse).mockReturnValue({
        success: true,
        data: customers[0],
      } as never)

      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

      const request = createRequest({ customers })
      const response = await callPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al importar clientes')
    })
  })
})
