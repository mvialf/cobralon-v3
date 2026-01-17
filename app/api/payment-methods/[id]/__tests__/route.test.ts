/**
 * Tests para app/api/payment-methods/[id]/route.ts (PUT/DELETE)
 *
 * Valida:
 * - PUT: Validación Zod
 * - PUT: 404 si no existe
 * - PUT: Nombre duplicado → 409
 * - DELETE: 404 si no existe
 * - DELETE: No eliminar si tiene pagos asociados → 409
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    paymentMethod: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
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
  return new Request(`http://localhost:3000/api/payment-methods/test-id`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

describe('PUT /api/payment-methods/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
      id: 'pm-1',
      name: 'Efectivo',
      icon: 'cash',
    } as never)

    vi.mocked(prisma.paymentMethod.update).mockResolvedValue({
      id: 'pm-1',
      name: 'Efectivo Actualizado',
      icon: 'money',
      _count: { payments: 0 },
    } as never)
  })

  describe('validaciones Zod', () => {
    it('debe rechazar sin nombre', async () => {
      const request = createRequest('PUT', { icon: 'star' })
      const response = await PUT(request, createParams('pm-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si método no existe', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { name: 'Test' })
      const response = await PUT(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Método de pago no encontrado')
    })
  })

  describe('nombre duplicado', () => {
    it('debe rechazar si otro método tiene el mismo nombre', async () => {
      // Primero encuentra el método actual
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo' } as never)
        // Luego encuentra duplicado con el nuevo nombre
        .mockResolvedValueOnce({ id: 'pm-2', name: 'Transferencia' } as never)

      const request = createRequest('PUT', { name: 'Transferencia' })
      const response = await PUT(request, createParams('pm-1'))
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('ya existe')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Efectivo',
      } as never)

      const request = createRequest('PUT', { name: 'Efectivo', icon: 'new-icon' })
      const response = await PUT(request, createParams('pm-1'))

      expect(response.status).toBe(200)
      // No debe buscar duplicados si el nombre no cambió
      expect(prisma.paymentMethod.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar método de pago', async () => {
      // Primera llamada: existencia, segunda: verificar duplicado (null = no hay)
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo', icon: 'cash' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      const request = createRequest('PUT', {
        name: 'Efectivo Actualizado',
        icon: 'money',
      })
      const response = await PUT(request, createParams('pm-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paymentMethod.name).toBe('Efectivo Actualizado')
    })

    it('debe actualizar hasInstallments y maxInstallments', async () => {
      // Mock para existencia y verificar duplicado
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo', icon: 'cash' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      vi.mocked(prisma.paymentMethod.update).mockResolvedValue({
        id: 'pm-1',
        name: 'Crédito',
        hasInstallments: true,
        maxInstallments: 12,
        _count: { payments: 0 },
      } as never)

      const request = createRequest('PUT', {
        name: 'Crédito',
        hasInstallments: true,
        maxInstallments: 12,
      })
      await PUT(request, createParams('pm-1'))

      expect(prisma.paymentMethod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hasInstallments: true,
            maxInstallments: 12,
          }),
        })
      )
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando update falla', async () => {
      // Mock para existencia y verificar duplicado
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo', icon: 'cash' } as never)
        .mockResolvedValueOnce(null) // No hay duplicado

      vi.mocked(prisma.paymentMethod.update).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('PUT', { name: 'Test' })
      const response = await PUT(request, createParams('pm-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al actualizar el método de pago')
    })
  })
})

describe('DELETE /api/payment-methods/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
      id: 'pm-1',
      name: 'Test Method',
      _count: { payments: 0 },
    } as never)

    vi.mocked(prisma.paymentMethod.delete).mockResolvedValue({
      id: 'pm-1',
    } as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si método no existe', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue(null)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('nonexistent'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Método de pago no encontrado')
    })
  })

  describe('⚠️ protección de datos relacionados', () => {
    it('debe rechazar eliminación si tiene pagos asociados', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Efectivo',
        _count: { payments: 5 },
      } as never)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('pm-1'))
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('No se puede eliminar')
      expect(data.error).toContain('5 pago(s) asociado(s)')
    })
  })

  describe('eliminación exitosa', () => {
    it('debe eliminar método sin pagos asociados', async () => {
      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('pm-1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('se eliminó correctamente')
    })

    it('debe incluir nombre del método en mensaje', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Cheque',
        _count: { payments: 0 },
      } as never)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('pm-1'))
      const data = await response.json()

      expect(data.message).toContain('Cheque')
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.paymentMethod.delete).mockRejectedValue(new Error('DB Error'))

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('pm-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar el método de pago')
    })
  })
})
