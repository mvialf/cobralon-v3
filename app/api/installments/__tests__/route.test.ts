/**
 * Tests para app/api/installments/route.ts (GET)
 *
 * Valida:
 * - Paginación
 * - Filtros (status, paymentId, customerId, fechas)
 * - Formato de respuesta
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    installment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { GET } from '../route'

// Helper para crear request
function createRequest(searchParams: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/installments')
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new Request(url)
}

describe('GET /api/installments', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.installment.findMany).mockResolvedValue([])
    vi.mocked(prisma.installment.count).mockResolvedValue(0)
  })

  describe('paginación', () => {
    it('debe retornar lista vacía cuando no hay cuotas', async () => {
      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.installments).toEqual([])
      expect(data.pagination.total).toBe(0)
    })

    it('debe usar paginación por defecto', async () => {
      await GET(createRequest())

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      )
    })

    it('debe respetar parámetros de paginación', async () => {
      const response = await GET(createRequest({ page: '2', limit: '20' }))
      const data = await response.json()

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      )
      expect(data.pagination.page).toBe(2)
      expect(data.pagination.limit).toBe(20)
    })

    it('debe limitar máximo a 100 registros', async () => {
      await GET(createRequest({ limit: '500' }))

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      )
    })

    it('debe calcular totalPages correctamente', async () => {
      vi.mocked(prisma.installment.count).mockResolvedValue(45)

      const response = await GET(createRequest({ limit: '10' }))
      const data = await response.json()

      expect(data.pagination.totalPages).toBe(5)
    })
  })

  describe('filtros', () => {
    it('debe filtrar por status', async () => {
      await GET(createRequest({ status: 'pending' }))

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending',
          }),
        })
      )
    })

    it('debe filtrar por paymentId', async () => {
      await GET(createRequest({ paymentId: 'payment-123' }))

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paymentId: 'payment-123',
          }),
        })
      )
    })

    it('debe filtrar por customerId', async () => {
      await GET(createRequest({ customerId: 'customer-123' }))

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            payment: { customerId: 'customer-123' },
          }),
        })
      )
    })

    it('debe filtrar por rango de fechas', async () => {
      await GET(
        createRequest({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
      )

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      )
    })

    it('debe permitir solo startDate', async () => {
      await GET(createRequest({ startDate: '2024-01-01' }))

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              gte: expect.any(Date),
            },
          }),
        })
      )
    })

    it('debe permitir solo endDate', async () => {
      await GET(createRequest({ endDate: '2024-01-31' }))

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: {
              lte: expect.any(Date),
            },
          }),
        })
      )
    })

    it('debe combinar múltiples filtros', async () => {
      await GET(
        createRequest({
          status: 'paid',
          customerId: 'customer-1',
          startDate: '2024-01-01',
        })
      )

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'paid',
            payment: { customerId: 'customer-1' },
            dueDate: { gte: expect.any(Date) },
          },
        })
      )
    })
  })

  describe('ordenamiento', () => {
    it('debe ordenar por dueDate y installmentNumber', async () => {
      await GET(createRequest())

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        })
      )
    })
  })

  describe('relaciones incluidas', () => {
    it('debe incluir payment con customer y allocations', async () => {
      vi.mocked(prisma.installment.findMany).mockResolvedValue([
        {
          id: 'inst-1',
          installmentNumber: 1,
          amount: new Decimal(100000),
          dueDate: new Date(),
          status: 'pending',
          payment: {
            id: 'pay-1',
            amount: new Decimal(300000),
            customer: { id: 'c1', name: 'Test', phone: '+56912345678' },
            paymentMethod: { id: 'pm1', name: 'Efectivo', icon: 'cash' },
            allocations: [
              {
                id: 'alloc-1',
                allocatedAmount: new Decimal(300000),
                project: { id: 'p1', projectNumber: 'P-001' },
              },
            ],
          },
        },
      ] as never)

      const response = await GET(createRequest())
      const data = await response.json()

      expect(data.installments[0].payment.customer.name).toBe('Test')
      expect(data.installments[0].payment.allocations).toHaveLength(1)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando Prisma falla', async () => {
      vi.mocked(prisma.installment.findMany).mockRejectedValue(new Error('DB Error'))

      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al obtener cuotas')
    })
  })
})
