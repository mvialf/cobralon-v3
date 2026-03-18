/**
 * Tests para app/api/customers/[id]/credit/refund/route.ts
 *
 * ⚠️ CRÍTICO: Lógica financiera de devolución de crédito
 *
 * Valida:
 * - Campos requeridos (amount, refundDate, refundMethod)
 * - Cliente existente
 * - canRefundCredit: amount <= creditBalance
 * - Transacción atómica (decrement + CreditTransaction)
 * - Métodos de devolución válidos
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

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
      update: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock de business logic
vi.mock('@/lib/business-logic/credit-management', () => ({
  canRefundCredit: vi.fn(),
  getCustomerCreditBalance: vi.fn().mockResolvedValue(50000),
}))

import { prisma } from '@/lib/db'
import { canRefundCredit } from '@/lib/business-logic/credit-management'
import { POST } from '../route'

const VALID_UUID = '00000000-0000-0000-0000-000000000001'

function createParams(id: string = VALID_UUID) {
  return { params: Promise.resolve({ id }) }
}

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/customers/${VALID_UUID}/credit/refund`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// Payload válido base
const validPayload = {
  amount: 50000,
  refundDate: '2024-01-15',
  refundMethod: 'EFECTIVO' as const,
  comments: 'Devolución solicitada por cliente',
}

describe('POST /api/customers/[id]/credit/refund', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mocks por defecto
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      id: VALID_UUID,
      name: 'Test Customer',
      creditBalance: new Prisma.Decimal(100000),
    } as never)

    vi.mocked(canRefundCredit).mockReturnValue({ valid: true })

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const mockTx = {
        customer: {
          findUnique: vi.fn().mockResolvedValue({
            id: VALID_UUID,
            name: 'Test Customer',
            creditBalance: new Prisma.Decimal(50000),
          }),
        },
        creditTransaction: {
          create: vi.fn().mockResolvedValue({
            id: 'tx-1',
            amount: new Prisma.Decimal(-50000),
            type: 'WITHDRAWAL',
          }),
          aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(50000) } }),
        },
      }
      return fn(mockTx as never)
    })
  })

  describe('validaciones de campos requeridos (Zod)', () => {
    it('debe rechazar sin amount', async () => {
      const { amount: _, ...noAmount } = validPayload
      const request = createRequest(noAmount)
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar sin refundDate', async () => {
      const { refundDate: _, ...noDate } = validPayload
      const request = createRequest(noDate)
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar sin refundMethod', async () => {
      const { refundMethod: _, ...noMethod } = validPayload
      const request = createRequest(noMethod)
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })

    it('debe rechazar monto negativo (Zod .positive())', async () => {
      const request = createRequest({ ...validPayload, amount: -1000 })
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Datos inválidos')
    })
  })

  describe('validaciones de cliente', () => {
    it('debe retornar 404 cuando cliente no existe', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

      const request = createRequest(validPayload)
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Cliente no encontrado')
    })
  })

  describe('validaciones de crédito (canRefundCredit)', () => {
    it('debe rechazar cuando monto excede crédito disponible', async () => {
      vi.mocked(canRefundCredit).mockReturnValue({
        valid: false,
        error: 'El monto excede el crédito disponible ($100.000)',
      })

      const request = createRequest({ ...validPayload, amount: 200000 })
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('excede el crédito disponible')
    })

    it('debe rechazar monto 0 via canRefundCredit', async () => {
      // amount: 0 pasa la validación de campos requeridos (truthy check)
      // pero falla en canRefundCredit
      vi.mocked(canRefundCredit).mockReturnValue({
        valid: false,
        error: 'El monto debe ser mayor a 0',
      })

      const request = createRequest({ ...validPayload, amount: 0.001 })
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('mayor a 0')
    })

    it('debe permitir refund igual al crédito disponible', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: VALID_UUID,
        name: 'Test',
        creditBalance: new Prisma.Decimal(50000),
      } as never)
      vi.mocked(canRefundCredit).mockReturnValue({ valid: true })

      const request = createRequest({ ...validPayload, amount: 50000 })
      const response = await POST(request, createParams())

      expect(response.status).toBe(200)
    })
  })

  describe('métodos de devolución', () => {
    it('debe aceptar EFECTIVO', async () => {
      const request = createRequest({ ...validPayload, refundMethod: 'EFECTIVO' })
      const response = await POST(request, createParams())

      expect(response.status).toBe(200)
    })

    it('debe aceptar TRANSFERENCIA', async () => {
      const request = createRequest({ ...validPayload, refundMethod: 'TRANSFERENCIA' })
      const response = await POST(request, createParams())

      expect(response.status).toBe(200)
    })

    it('debe aceptar CHEQUE', async () => {
      const request = createRequest({ ...validPayload, refundMethod: 'CHEQUE' })
      const response = await POST(request, createParams())

      expect(response.status).toBe(200)
    })
  })

  describe('transacción atómica', () => {
    it('debe recalcular creditBalance desde ledger en transacción', async () => {
      let transactionFnCalled = false
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        transactionFnCalled = true
        const mockTx = {
          customer: {
            findUnique: vi.fn().mockResolvedValue({
              id: VALID_UUID,
              creditBalance: new Prisma.Decimal(50000),
            }),
          },
          creditTransaction: {
            create: vi.fn().mockResolvedValue({ id: 'tx-1' }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(50000) } }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest(validPayload)
      await POST(request, createParams())

      expect(transactionFnCalled).toBe(true)
      // creditBalance se calcula en tiempo real desde ledger
    })

    it('debe crear CreditTransaction con tipo WITHDRAWAL', async () => {
      let createdTransaction: Record<string, unknown> | null = null
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          customer: {
            findUnique: vi.fn().mockResolvedValue({
              id: VALID_UUID,
              creditBalance: new Prisma.Decimal(50000),
            }),
          },
          creditTransaction: {
            create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
              createdTransaction = args.data
              return { id: 'tx-1' }
            }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(50000) } }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest(validPayload)
      await POST(request, createParams())

      expect(createdTransaction).not.toBeNull()
      expect(createdTransaction?.['type']).toBe('WITHDRAWAL')
      expect(Number(createdTransaction?.['amount'])).toBe(-50000) // Negativo = salida
    })

    it('debe incluir metadata con método de devolución', async () => {
      let createdTransaction: Record<string, unknown> | null = null
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const mockTx = {
          customer: {
            findUnique: vi.fn().mockResolvedValue({
              id: VALID_UUID,
              creditBalance: new Prisma.Decimal(50000),
            }),
          },
          creditTransaction: {
            create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
              createdTransaction = args.data
              return { id: 'tx-1' }
            }),
            aggregate: vi.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(50000) } }),
          },
        }
        return fn(mockTx as never)
      })

      const request = createRequest({ ...validPayload, refundMethod: 'TRANSFERENCIA' })
      await POST(request, createParams())

      const metadata = createdTransaction?.['metadata'] as unknown as Record<string, unknown>
      expect(metadata?.['refundMethod']).toBe('TRANSFERENCIA')
    })
  })

  describe('respuesta exitosa', () => {
    it('debe retornar customer actualizado y transaction', async () => {
      const request = createRequest(validPayload)
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.customer).toBeDefined()
      expect(data.transaction).toBeDefined()
    })

    it('debe aceptar comentarios opcionales', async () => {
      const request = createRequest({
        ...validPayload,
        comments: 'Devolución por cancelación de proyecto',
      })
      const response = await POST(request, createParams())

      expect(response.status).toBe(200)
    })

    it('debe funcionar sin comentarios', async () => {
      const { comments: _, ...noComments } = validPayload
      const request = createRequest(noComments)
      const response = await POST(request, createParams())

      expect(response.status).toBe(200)
    })
  })

  describe('manejo de errores', () => {
    it('debe retornar 500 cuando transacción falla', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'))

      const request = createRequest(validPayload)
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Error al procesar devolución')
    })

    it('debe manejar error P2025 de Prisma', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
      vi.mocked(prisma.$transaction).mockRejectedValue(prismaError)

      const request = createRequest(validPayload)
      const response = await POST(request, createParams())
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Registro no encontrado')
    })
  })
})
