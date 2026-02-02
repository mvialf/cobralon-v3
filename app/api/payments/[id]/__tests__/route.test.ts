/**
 * Tests para app/api/payments/[id]/route.ts (PUT/DELETE)
 *
 * ⚠️ CRÍTICO: Edición/eliminación de pagos
 *
 * Valida:
 * - PUT: Bloqueo de edición si tiene cuotas (selectedInstallments > 1)
 * - PUT: Validaciones de amount
 * - PUT: Actualización de fecha (flujo EditableDate inline)
 * - PUT: Actualización de balance de proyectos via transacción
 * - DELETE: Transacción con reversión de créditos + cascade delete + recálculo balance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de logger (antes de imports del proyecto)
vi.mock('@/lib/logger', () => ({
  logger: {
    child: vi.fn().mockReturnThis(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
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

// Mock de business logic
vi.mock('@/lib/business-logic/update-project-balance', () => ({
  updateMultipleProjectBalances: vi.fn(),
}))

vi.mock('@/lib/business-logic/update-customer-credit-balance', () => ({
  updateCustomerCreditBalance: vi.fn().mockResolvedValue(0),
}))

import { prisma } from '@/lib/db'
import { updateMultipleProjectBalances } from '@/lib/business-logic/update-project-balance'
import { updateCustomerCreditBalance } from '@/lib/business-logic/update-customer-credit-balance'
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

// Mock base de pago actualizado (retorno de tx.payment.update)
const mockUpdatedPayment = {
  id: 'payment-1',
  amount: new Decimal(100000),
  date: new Date('2025-01-15'),
  customer: { id: 'c1', name: 'Test', phone: '+56912345678' },
  paymentMethod: { id: 'pm1', name: 'Efectivo', icon: 'cash' },
  allocations: [],
}

describe('PUT /api/payments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock por defecto: pago sin cuotas y sin crédito
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      id: 'payment-1',
      selectedInstallments: null,
      _count: { creditTransactions: 0 },
    } as never)

    // Mock de $transaction: ejecuta la función con un tx mock
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        payment: {
          update: vi.fn().mockResolvedValue(mockUpdatedPayment),
        },
      }
      return fn(mockTx as never)
    })
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
        selectedInstallments: 3,
        _count: { creditTransactions: 0 },
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
        _count: { creditTransactions: 0 },
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      const response = await PUT(request, createParams('payment-1'))

      expect(response.status).toBe(200)
    })

    it('debe permitir edición si selectedInstallments es 1 (contado)', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        selectedInstallments: 1,
        _count: { creditTransactions: 0 },
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      const response = await PUT(request, createParams('payment-1'))

      expect(response.status).toBe(200)
    })
  })

  describe('bloqueo de pagos con crédito asociado', () => {
    it('debe rechazar edición si tiene credit_transactions', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        selectedInstallments: null,
        _count: { creditTransactions: 2 },
      } as never)

      const request = createRequest('PUT', { amount: 200000 })
      const response = await PUT(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('crédito asociado')
    })

    it('debe permitir edición si no tiene credit_transactions', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        selectedInstallments: null,
        _count: { creditTransactions: 0 },
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
    })
  })

  describe('actualización de fecha (flujo EditableDate)', () => {
    it('debe actualizar solo la fecha exitosamente', async () => {
      const request = createRequest('PUT', { date: '2025-03-15T00:00:00.000Z' })
      const response = await PUT(request, createParams('payment-1'))

      expect(response.status).toBe(200)
    })

    it('no debe actualizar balance de proyectos si solo cambia fecha', async () => {
      const request = createRequest('PUT', { date: '2025-03-15T00:00:00.000Z' })
      await PUT(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).not.toHaveBeenCalled()
    })
  })

  describe('actualización de balance', () => {
    it('debe actualizar balance de proyectos si cambia amount', async () => {
      // Mock con allocations para que se dispare recálculo
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          payment: {
            update: vi.fn().mockResolvedValue({
              ...mockUpdatedPayment,
              amount: new Decimal(200000),
              allocations: [
                {
                  id: 'a1',
                  allocatedAmount: new Decimal(200000),
                  projectId: 'p1',
                  project: { id: 'p1', projectNumber: 'P-001', projectName: null, totalAmount: 500000, currency: 'CLP' },
                },
              ],
            }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest('PUT', { amount: 200000 })
      await PUT(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).toHaveBeenCalledWith(['p1'], expect.anything())
    })

    it('no debe actualizar balance si no hay allocations', async () => {
      const request = createRequest('PUT', { amount: 200000 })
      await PUT(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).not.toHaveBeenCalled()
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction Error'))

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

    it('debe ejecutar transacción con delete', async () => {
      const request = createRequest('DELETE')
      await DELETE(request, createParams('payment-1'))

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe('actualización de balance', () => {
    it('debe actualizar balance de proyectos afectados', async () => {
      const request = createRequest('DELETE')
      await DELETE(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).toHaveBeenCalledWith(['p1', 'p2'], expect.anything())
    })

    it('no debe actualizar balance si no hay allocations', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({
        id: 'payment-1',
        customerId: 'c1',
        selectedInstallments: null,
        allocations: [],
      } as never)

      const request = createRequest('DELETE')
      await DELETE(request, createParams('payment-1'))

      expect(updateMultipleProjectBalances).not.toHaveBeenCalled()
    })
  })

  describe('reversión de créditos', () => {
    it('debe crear ADJUSTMENT de reversión para crédito APPLIED', async () => {
      let mockTx: Record<string, Record<string, ReturnType<typeof vi.fn>>>

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        mockTx = {
          creditTransaction: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'ct-1', type: 'APPLIED', amount: new Decimal(-5000), customerId: 'c1' },
            ]),
            create: vi.fn().mockResolvedValue({}),
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
      await DELETE(request, createParams('payment-1'))

      // Verificar findMany con args correctos
      expect(mockTx!.creditTransaction.findMany).toHaveBeenCalledWith({
        where: { paymentId: 'payment-1' },
        select: { id: true, type: true, amount: true, customerId: true },
      })

      // Debe crear ADJUSTMENT de reversión
      expect(mockTx!.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'c1',
          amount: new Decimal(5000),
          type: 'ADJUSTMENT',
          paymentId: null,
          metadata: expect.objectContaining({
            reversedTransactionId: 'ct-1',
            reversedType: 'APPLIED',
          }),
        }),
      })

      // Debe recalcular creditBalance desde ledger
      expect(updateCustomerCreditBalance).toHaveBeenCalledWith('c1', expect.anything())
    })

    it('debe crear ADJUSTMENT de reversión para crédito OVERPAYMENT', async () => {
      let mockTx: Record<string, Record<string, ReturnType<typeof vi.fn>>>

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        mockTx = {
          creditTransaction: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'ct-2', type: 'OVERPAYMENT', amount: new Decimal(10000), customerId: 'c1' },
            ]),
            create: vi.fn().mockResolvedValue({}),
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
      await DELETE(request, createParams('payment-1'))

      // Debe crear ADJUSTMENT de reversión
      expect(mockTx!.creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'c1',
          amount: new Decimal(-10000),
          type: 'ADJUSTMENT',
          paymentId: null,
          metadata: expect.objectContaining({
            reversedTransactionId: 'ct-2',
            reversedType: 'OVERPAYMENT',
          }),
        }),
      })

      // Debe recalcular creditBalance desde ledger
      expect(updateCustomerCreditBalance).toHaveBeenCalledWith('c1', expect.anything())
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
            create: vi.fn().mockResolvedValue({}),
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
      await DELETE(request, createParams('payment-1'))

      // 2 ADJUSTMENTs creados (uno por cada credit_transaction)
      expect(mockTx!.creditTransaction.create).toHaveBeenCalledTimes(2)

      // Debe recalcular creditBalance una sola vez desde ledger
      expect(updateCustomerCreditBalance).toHaveBeenCalledWith('c1', expect.anything())
      expect(updateCustomerCreditBalance).toHaveBeenCalledTimes(1)
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
            create: vi.fn().mockResolvedValue({}),
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
      await DELETE(request, createParams('payment-1'))

      // 3 ADJUSTMENTs creados
      expect(mockTx!.creditTransaction.create).toHaveBeenCalledTimes(3)

      // Pero solo 1 recálculo de creditBalance
      expect(updateCustomerCreditBalance).toHaveBeenCalledTimes(1)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction Error'))

      const request = createRequest('DELETE')
      const response = await DELETE(request, createParams('payment-1'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error al eliminar pago')
    })
  })
})
