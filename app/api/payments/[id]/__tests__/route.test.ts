/**
 * Tests para app/api/payments/[id]/route.ts (PUT/DELETE)
 *
 * ⚠️ CRÍTICO: Edición/eliminación de pagos
 *
 * Valida:
 * - PUT: Bloqueo de edición si tiene cuotas (selectedInstallments > 1)
 * - PUT: Validaciones de amount
 * - PUT: Actualización de balance de proyectos
 * - DELETE: Cascade delete de installments y allocations
 * - DELETE: Actualización de balance de proyectos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Mock de business logic
vi.mock('@/lib/business-logic/update-project-balance', () => ({
  updateMultipleProjectBalances: vi.fn(),
}))

import { prisma } from '@/lib/db'
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'
import { PUT, DELETE } from '../route'

// Helper para crear params
function createParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Helper para crear request
function createRequest(
  method: 'PUT' | 'DELETE',
  body?: Record<string, unknown>
): Request {
  return new Request(`http://localhost:3000/api/payments/test-id`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('PUT /api/payments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock por defecto: pago sin cuotas
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'payment-1',
      selectedInstallments: null,
    } as never)

    vi.mocked(prisma.payment.update).mockResolvedValue({
      id: 'payment-1',
      amount: new Decimal(100000),
      customer: { id: 'c1', name: 'Test', phone: '+56912345678' },
      paymentMethod: { id: 'pm1', name: 'Efectivo', icon: 'cash' },
      allocations: [],
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si pago no existe', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { amount: 100000 })
      const response = await PUT(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pago no encontrado')
    })
  })

  describe('⚠️ bloqueo de pagos con cuotas', () => {
    it('debe rechazar edición si selectedInstallments > 1', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        selectedInstallments: 3, // Tiene cuotas
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      const response = await PUT(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No se puede editar un pago con cuotas')
    })

    it('debe permitir edición si selectedInstallments es null', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        selectedInstallments: null,
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      const response = await PUT(request, createParams('payment-1'))

      expect(response.status).toBe(200)
    })

    it('debe permitir edición si selectedInstallments es 1 (contado)', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        selectedInstallments: 1,
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      const response = await PUT(request, createParams('payment-1'))

      expect(response.status).toBe(200)
    })
  })

  describe('validaciones de campos', () => {
    it('debe rechazar amount <= 0', async () => {
      const request = createRequest('PUT', { amount: 0 })
      const response = await PUT(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('mayor a 0')
    })

    it('debe rechazar amount negativo', async () => {
      const request = createRequest('PUT', { amount: -1000 })
      const response = await PUT(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('mayor a 0')
    })

    it('debe permitir actualizar solo algunos campos', async () => {
      const request = createRequest('PUT', { notes: 'Nueva nota' })
      const response = await PUT(request, createParams('payment-1'))

      expect(response.status).toBe(200)
      expect(prisma.payment.update).toHaveBeenCalled()
    })
  })

  describe('actualización de balance', () => {
    it('debe actualizar balance de proyectos si cambia amount', async () => {
      vi.mocked(prisma.payment.update).mockResolvedValue({
        id: 'payment-1',
        amount: new Decimal(200000),
        customer: { id: 'c1', name: 'Test', phone: '+56912345678' },
        paymentMethod: { id: 'pm1', name: 'Efectivo', icon: 'cash' },
        allocations: [
          { id: 'a1', allocatedAmount: new Decimal(200000), projectId: 'p1', project: {} },
        ],
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      await PUT(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).toHaveBeenCalledWith(['p1'])
    })

    it('no debe actualizar balance si no hay allocations', async () => {
      vi.mocked(prisma.payment.update).mockResolvedValue({
        id: 'payment-1',
        amount: new Decimal(200000),
        customer: {},
        paymentMethod: {},
        allocations: [],
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      await PUT(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).not.toHaveBeenCalled()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      vi.mocked(prisma.payment.update).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('PUT', { amount: 100000 })
      const response = await PUT(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar pago')
    })
  })
})

describe('DELETE /api/payments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'payment-1',
      selectedInstallments: null,
      allocations: [{ projectId: 'p1' }, { projectId: 'p2' }],
    } as never)

    vi.mocked(prisma.payment.delete).mockResolvedValue({
      id: 'payment-1',
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si pago no existe', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pago no encontrado')
    })
  })

  describe('eliminación exitosa', () => {
    it('debe eliminar pago y retornar success', async () => {
      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deletedPaymentId).toBe('payment-1')
    })

    it('debe llamar a prisma.payment.delete', async () => {
      const request = createRequest('DELETE')
      await DELETE(request, createParams('payment-1'))

      expect(prisma.payment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      })
    })
  })

  describe('actualización de balance', () => {
    it('debe actualizar balance de proyectos afectados', async () => {
      const request = createRequest('DELETE')
      await DELETE(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).toHaveBeenCalledWith(['p1', 'p2'])
    })

    it('no debe actualizar balance si no hay allocations', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        selectedInstallments: null,
        allocations: [],
      } as never)

      const request = createRequest('DELETE')
      await DELETE(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).not.toHaveBeenCalled()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.payment.delete).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar pago')
    })
  })
})
