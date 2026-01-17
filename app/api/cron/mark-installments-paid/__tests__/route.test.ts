/**
 * Tests para app/api/cron/mark-installments-paid/route.ts (POST)
 *
 * Valida:
 * - Autenticación con CRON_SECRET
 * - Marca cuotas con dueDate <= now()
 * - Respuesta exitosa
 * - Manejo de errores
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de logger
vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn().mockReturnThis(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    level: 'info',
  },
  generateRunId: vi.fn().mockReturnValue('test-run-id'),
}))

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    installment: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { POST } from '../route'

// Helper para crear request
function createRequest(authHeader?: string): Request {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (authHeader) {
    headers['Authorization'] = authHeader
  }
  return new Request('http://localhost:3000/api/cron/mark-installments-paid', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/mark-installments-paid', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Configurar CRON_SECRET para tests
    process.env = { ...originalEnv, CRON_SECRET: 'test-secret' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('autenticación', () => {
    it('debe rechazar sin header Authorization', async () => {
      const response = await POST(createRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('No autorizado')
    })

    it('debe rechazar con secret incorrecto', async () => {
      const response = await POST(createRequest('Bearer wrong-secret'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('No autorizado')
    })

    it('debe rechazar sin formato Bearer', async () => {
      const response = await POST(createRequest('test-secret'))
      const data = await response.json()

      expect(response.status).toBe(401)
    })

    it('debe aceptar secret correcto', async () => {
      vi.mocked(prisma.installment.findMany).mockResolvedValue([])

      const response = await POST(createRequest('Bearer test-secret'))

      expect(response.status).toBe(200)
    })

    it('debe retornar 500 si CRON_SECRET no está configurado', async () => {
      delete process.env.CRON_SECRET

      const response = await POST(createRequest('Bearer any-secret'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('CRON_SECRET no está configurado')
    })
  })

  describe('marcado de cuotas', () => {
    it('debe retornar mensaje cuando no hay cuotas pendientes', async () => {
      vi.mocked(prisma.installment.findMany).mockResolvedValue([])

      const response = await POST(createRequest('Bearer test-secret'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.installmentsUpdated).toBe(0)
      expect(data.message).toContain('No hay cuotas pendientes')
    })

    it('debe marcar cuotas vencidas como pagadas', async () => {
      const mockInstallments = [
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: new Date('2024-01-01'),
          amount: new Decimal(100000),
          payment: {
            id: 'pay-1',
            customer: { id: 'c1', name: 'Cliente 1' },
          },
        },
        {
          id: 'inst-2',
          installmentNumber: 2,
          dueDate: new Date('2024-01-15'),
          amount: new Decimal(100000),
          payment: {
            id: 'pay-1',
            customer: { id: 'c1', name: 'Cliente 1' },
          },
        },
      ]

      vi.mocked(prisma.installment.findMany).mockResolvedValue(mockInstallments as never)
      vi.mocked(prisma.installment.updateMany).mockResolvedValue({ count: 2 })

      const response = await POST(createRequest('Bearer test-secret'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.installmentsUpdated).toBe(2)
    })

    it('debe filtrar por status pending y dueDate <= now', async () => {
      vi.mocked(prisma.installment.findMany).mockResolvedValue([])

      await POST(createRequest('Bearer test-secret'))

      expect(prisma.installment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'pending',
            dueDate: { lte: expect.any(Date) },
          },
        })
      )
    })

    it('debe actualizar status a paid y establecer paidDate', async () => {
      vi.mocked(prisma.installment.findMany).mockResolvedValue([
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: new Date(),
          amount: new Decimal(100000),
          payment: { id: 'pay-1', customer: { id: 'c1', name: 'Test' } },
        },
      ] as never)
      vi.mocked(prisma.installment.updateMany).mockResolvedValue({ count: 1 })

      await POST(createRequest('Bearer test-secret'))

      expect(prisma.installment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['inst-1'] } },
        data: {
          status: 'paid',
          paidDate: expect.any(Date),
        },
      })
    })

    it('debe incluir lista de cuotas actualizadas en respuesta', async () => {
      vi.mocked(prisma.installment.findMany).mockResolvedValue([
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: new Date('2024-01-15'),
          amount: new Decimal(100000),
          payment: { id: 'pay-1', customer: { id: 'c1', name: 'Cliente Test' } },
        },
      ] as never)
      vi.mocked(prisma.installment.updateMany).mockResolvedValue({ count: 1 })

      const response = await POST(createRequest('Bearer test-secret'))
      const data = await response.json()

      expect(data.installments).toHaveLength(1)
      expect(data.installments[0].id).toBe('inst-1')
      expect(data.installments[0].customer).toBe('Cliente Test')
    })

    it('debe incluir timestamp en respuesta', async () => {
      vi.mocked(prisma.installment.findMany).mockResolvedValue([])

      const response = await POST(createRequest('Bearer test-secret'))
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando Prisma falla', async () => {
      vi.mocked(prisma.installment.findMany).mockRejectedValue(new Error('DB Error'))

      const response = await POST(createRequest('Bearer test-secret'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Error al marcar cuotas')
    })

    it('debe incluir detalles del error', async () => {
      vi.mocked(prisma.installment.findMany).mockRejectedValue(
        new Error('Connection timeout')
      )

      const response = await POST(createRequest('Bearer test-secret'))
      const data = await response.json()

      expect(data.details).toBe('Connection timeout')
    })
  })
})
