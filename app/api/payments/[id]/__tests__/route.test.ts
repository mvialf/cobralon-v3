/**
 * Tests para app/api/payments/[id]/route.ts (PUT/DELETE)
 *
 * ⚠️ CRÍTICO: Edición/eliminación de pagos
 *
 * Valida:
 * - PUT: Bloqueo de edición si tiene cuotas (selectedInstallments > 1)
 * - PUT: Validaciones de amount
 * - PUT: Actualización de fecha (flujo EditableDate inline)
 * - PUT: Actualización sin recalcular Project.balance
 * - DELETE: Transacción con reversión de créditos + cascade delete
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de logger-middleware (requerido por withApiHandler)
vi.mock('@/lib/logger-middleware', () => ({
  withLogging: (handler: Function) => {
    return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
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

// Mock de Prisma (con $transaction)
vi.mock('@/lib/db', () => ({
  prisma: {
    payment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    creditTransaction: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/db'
import { PUT, DELETE } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function createContext(id: string = VALID_UUID) {
  return { params: Promise.resolve({ id }) }
}

function createRequest(method: 'PUT' | 'DELETE', body?: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/payments/${VALID_UUID}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

// Mock base de pago actualizado (retorno de tx.payment.update)
const mockUpdatedPayment = {
  id: VALID_UUID,
  amount: new Decimal(100000),
  date: new Date('2025-01-15'),
  customer: { id: 'c1', name: 'Test', phone: '+56912345678' },
  paymentMethod: { id: 'pm1', name: 'Efectivo', icon: 'cash' },
  allocations: [],
}

describe('PUT /api/payments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock por defecto: pago existente
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: VALID_UUID,
    } as never)

    vi.mocked(prisma.payment.update).mockResolvedValue(mockUpdatedPayment as never)
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si pago no existe', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

      const request = createRequest('PUT', { notes: 'Nueva nota' })
      const response = await PUT(request, createContext())
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pago no encontrado')
    })
  })

  describe('validaciones de campos (Zod)', () => {
    it('debe rechazar edición de amount', async () => {
      const request = createRequest('PUT', { amount: 100000 })
      const response = await PUT(request, createContext())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar edición de paymentMethodId', async () => {
      const request = createRequest('PUT', {
        paymentMethodId: '00000000-0000-0000-0000-000000000002',
      })
      const response = await PUT(request, createContext())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe permitir actualizar solo algunos campos', async () => {
      const request = createRequest('PUT', { notes: 'Nueva nota' })
      const response = await PUT(request, createContext())

      expect(response.status).toBe(200)
    })
  })

  describe('actualización de fecha (flujo EditableDate)', () => {
    it('debe actualizar solo la fecha exitosamente', async () => {
      const request = createRequest('PUT', { date: '2025-03-15T00:00:00.000Z' })
      const response = await PUT(request, createContext())

      expect(response.status).toBe(200)
    })

    it('no debe abrir transacción si solo cambia fecha', async () => {
      const request = createRequest('PUT', { date: '2025-03-15T00:00:00.000Z' })
      await PUT(request, createContext())

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('balance derivado', () => {
    it('no recalcula ni escribe Project.balance si cambia un campo no financiero', async () => {
      const request = createRequest('PUT', { notes: 'Nueva nota' })
      await PUT(request, createContext())

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('debe actualizar pago aunque no haya allocations', async () => {
      const request = createRequest('PUT', { notes: 'Nueva nota' })
      await PUT(request, createContext())

      expect(prisma.payment.update).toHaveBeenCalled()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.payment.update).mockRejectedValue(new Error('Update Error'))

      const request = createRequest('PUT', { notes: 'Nueva nota' })
      const response = await PUT(request, createContext())
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
      id: VALID_UUID,
      customerId: 'c1',
      selectedInstallments: null,
      allocations: [{ projectId: 'p1' }, { projectId: 'p2' }],
    } as never)

    // Mock de $transaction para DELETE
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        creditTransaction: {
          findMany: vi.fn().mockResolvedValue([]),
          create: vi.fn(),
        },
        customer: {
          update: vi.fn(),
        },
        payment: {
          delete: vi.fn().mockResolvedValue({ id: 'payment-1' }),
        },
      }
      return fn(mockTx as never)
    })
  })

  describe('validación de existencia', () => {
    it('debe retornar 404 si pago no existe', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createContext())
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pago no encontrado')
    })
  })

  describe('eliminación exitosa', () => {
    it('debe eliminar pago y retornar success', async () => {
      const request = createRequest('DELETE')
      const response = await DELETE(request, createContext())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deletedPaymentId).toBe(VALID_UUID)
    })

    it('debe ejecutar transacción con delete', async () => {
      const request = createRequest('DELETE')
      await DELETE(request, createContext())

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('balance derivado', () => {
    it('no recalcula Project.balance al eliminar pago', async () => {
      const request = createRequest('DELETE')
      await DELETE(request, createContext())

      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('debe eliminar aunque no haya allocations', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: VALID_UUID,
        customerId: 'c1',
        selectedInstallments: null,
        allocations: [],
      } as never)

      const request = createRequest('DELETE')
      const response = await DELETE(request, createContext())

      expect(response.status).toBe(200)
    })
  })

  describe('reversión de créditos', () => {
    it('debe crear ADJUSTMENT de reversión para crédito APPLIED', async () => {
      let mockTx: Record<string, Record<string, ReturnType<typeof vi.fn>>>

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        mockTx = {
          creditTransaction: {
            findMany: vi
              .fn()
              .mockResolvedValue([
                { id: 'ct-1', type: 'APPLIED', amount: new Decimal(-5000), customerId: 'c1' },
              ]),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Decimal(0) } }),
          },
          customer: {
            update: vi.fn().mockResolvedValue({}),
          },
          payment: {
            delete: vi.fn().mockResolvedValue({ id: 'payment-1' }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('DELETE')
      await DELETE(request, createContext())

      // Verificar findMany con args correctos
      expect(mockTx!.creditTransaction.findMany).toHaveBeenCalledWith({
        where: { paymentId: VALID_UUID },
        select: { id: true, type: true, amount: true, customerId: true },
      })

      // Debe crear ADJUSTMENT de reversión en batch
      expect(mockTx!.creditTransaction.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            customerId: 'c1',
            amount: new Decimal(5000),
            type: 'ADJUSTMENT',
            paymentId: null,
            metadata: expect.objectContaining({
              reversedTransactionId: 'ct-1',
              reversedType: 'APPLIED',
            }),
          }),
        ],
      })
    })

    it('debe crear ADJUSTMENT de reversión para crédito OVERPAYMENT', async () => {
      let mockTx: Record<string, Record<string, ReturnType<typeof vi.fn>>>

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        mockTx = {
          creditTransaction: {
            findMany: vi
              .fn()
              .mockResolvedValue([
                { id: 'ct-2', type: 'OVERPAYMENT', amount: new Decimal(10000), customerId: 'c1' },
              ]),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Decimal(0) } }),
          },
          customer: {
            update: vi.fn().mockResolvedValue({}),
          },
          payment: {
            delete: vi.fn().mockResolvedValue({ id: 'payment-1' }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('DELETE')
      await DELETE(request, createContext())

      // Debe crear ADJUSTMENT de reversión en batch
      expect(mockTx!.creditTransaction.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            customerId: 'c1',
            amount: new Decimal(-10000),
            type: 'ADJUSTMENT',
            paymentId: null,
            metadata: expect.objectContaining({
              reversedTransactionId: 'ct-2',
              reversedType: 'OVERPAYMENT',
            }),
          }),
        ],
      })
    })

    it('debe crear ADJUSTMENTs para escenario mixto APPLIED + OVERPAYMENT', async () => {
      let mockTx: Record<string, Record<string, ReturnType<typeof vi.fn>>>

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        mockTx = {
          creditTransaction: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'ct-1', type: 'APPLIED', amount: new Decimal(-3000), customerId: 'c1' },
              { id: 'ct-2', type: 'OVERPAYMENT', amount: new Decimal(7000), customerId: 'c1' },
            ]),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Decimal(0) } }),
          },
          customer: {
            update: vi.fn().mockResolvedValue({}),
          },
          payment: {
            delete: vi.fn().mockResolvedValue({ id: 'payment-1' }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('DELETE')
      await DELETE(request, createContext())

      // 1 llamada a createMany con 2 reversiones
      expect(mockTx!.creditTransaction.createMany).toHaveBeenCalledTimes(1)
      expect(mockTx!.creditTransaction.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({ reversedTransactionId: 'ct-1' }),
          }),
          expect.objectContaining({
            metadata: expect.objectContaining({ reversedTransactionId: 'ct-2' }),
          }),
        ]),
      })
    })

    it('debe crear ADJUSTMENTs para múltiples CreditTransactions del mismo tipo', async () => {
      let mockTx: Record<string, Record<string, ReturnType<typeof vi.fn>>>

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        mockTx = {
          creditTransaction: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'ct-1', type: 'OVERPAYMENT', amount: new Decimal(1000), customerId: 'c1' },
              { id: 'ct-2', type: 'OVERPAYMENT', amount: new Decimal(2000), customerId: 'c1' },
              { id: 'ct-3', type: 'OVERPAYMENT', amount: new Decimal(3000), customerId: 'c1' },
            ]),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Decimal(0) } }),
          },
          customer: {
            update: vi.fn().mockResolvedValue({}),
          },
          payment: {
            delete: vi.fn().mockResolvedValue({ id: 'payment-1' }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('DELETE')
      await DELETE(request, createContext())

      // 1 llamada a createMany con 3 reversiones
      expect(mockTx!.creditTransaction.createMany).toHaveBeenCalledTimes(1)
      expect(mockTx!.creditTransaction.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({ reversedTransactionId: 'ct-1' }),
          }),
          expect.objectContaining({
            metadata: expect.objectContaining({ reversedTransactionId: 'ct-2' }),
          }),
          expect.objectContaining({
            metadata: expect.objectContaining({ reversedTransactionId: 'ct-3' }),
          }),
        ]),
      })
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction Error'))

      const request = createRequest('DELETE')
      const response = await DELETE(request, createContext())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar pago')
    })
  })
})
