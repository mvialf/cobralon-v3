/**
 * Tests para app/api/payment-methods/[id]/route.ts (PUT/DELETE)
 *
 * Valida:
 * - UUID validation (withApiHandler)
 * - PUT: Validación Zod
 * - PUT: 404 si no existe
 * - PUT: Nombre duplicado → 409
 * - DELETE: 404 si no existe
 * - DELETE: No eliminar si tiene pagos asociados → 409
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
    paymentMethod: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { PUT, DELETE } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function createRequest(
  method: 'PUT' | 'DELETE',
  body?: Record<string, unknown>
): NextRequest {
  return new NextRequest(`http://localhost:3000/api/payment-methods/${VALID_UUID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

function createContext(id: string = VALID_UUID) {
  return { params: Promise.resolve({ id }) }
}

async function callPUT(body: Record<string, unknown>, id: string = VALID_UUID) {
  return (PUT as any)(createRequest('PUT', body), createContext(id))
}

async function callDELETE(id: string = VALID_UUID) {
  return (DELETE as any)(createRequest('DELETE'), createContext(id))
}

describe('UUID validation', () => {
  it('debe rechazar UUID inválido en PUT', async () => {
    const response = await callPUT({ name: 'Test' }, 'not-a-uuid')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })

  it('debe rechazar UUID inválido en DELETE', async () => {
    const response = await callDELETE('not-a-uuid')
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('UUID inválido')
  })
})

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
      const response = await callPUT({ icon: 'star' })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si método no existe', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue(null)

      const response = await callPUT({ name: 'Test' })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Método de pago no encontrado')
    })
  })

  describe('nombre duplicado', () => {
    it('debe rechazar si otro método tiene el mismo nombre', async () => {
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo' } as never)
        .mockResolvedValueOnce({ id: 'pm-2', name: 'Transferencia' } as never)

      const response = await callPUT({ name: 'Transferencia' })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('ya existe')
    })

    it('debe permitir mantener el mismo nombre', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Efectivo',
      } as never)

      const response = await callPUT({ name: 'Efectivo', icon: 'new-icon' })

      expect(response.status).toBe(200)
      // No debe buscar duplicados si el nombre no cambió
      expect(prisma.paymentMethod.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('actualización exitosa', () => {
    it('debe actualizar método de pago', async () => {
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo', icon: 'cash' } as never)
        .mockResolvedValueOnce(null)

      const response = await callPUT({ name: 'Efectivo Actualizado', icon: 'money' })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.paymentMethod.name).toBe('Efectivo Actualizado')
    })

    it('debe actualizar hasInstallments y maxInstallments', async () => {
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo', icon: 'cash' } as never)
        .mockResolvedValueOnce(null)

      vi.mocked(prisma.paymentMethod.update).mockResolvedValue({
        id: 'pm-1',
        name: 'Crédito',
        hasInstallments: true,
        maxInstallments: 12,
        _count: { payments: 0 },
      } as never)

      await callPUT({
        name: 'Crédito',
        hasInstallments: true,
        maxInstallments: 12,
      })

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
      vi.mocked(prisma.paymentMethod.findUnique)
        .mockResolvedValueOnce({ id: 'pm-1', name: 'Efectivo', icon: 'cash' } as never)
        .mockResolvedValueOnce(null)

      vi.mocked(prisma.paymentMethod.update).mockRejectedValue(new Error('DB Error'))

      const response = await callPUT({ name: 'Test' })
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

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Método de pago no encontrado')
    })
  })

  describe('protección de datos relacionados', () => {
    it('debe rechazar eliminación si tiene pagos asociados', async () => {
      vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
        id: 'pm-1',
        name: 'Efectivo',
        _count: { payments: 5 },
      } as never)

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('No se puede eliminar')
      expect(data.error).toContain('5 pago(s) asociado(s)')
    })
  })

  describe('eliminación exitosa', () => {
    it('debe eliminar método sin pagos asociados', async () => {
      const response = await callDELETE()
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

      const response = await callDELETE()
      const data = await response.json()

      expect(data.message).toContain('Cheque')
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando delete falla', async () => {
      vi.mocked(prisma.paymentMethod.delete).mockRejectedValue(new Error('DB Error'))

      const response = await callDELETE()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar el método de pago')
    })
  })
})
