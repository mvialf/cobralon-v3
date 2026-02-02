/**
 * Tests para lib/business-logic/update-customer-credit-balance.ts
 *
 * Valida:
 * - updateCustomerCreditBalance()
 * - verifyCustomerCreditBalance()
 *
 * NOTA: Estas funciones interactúan con la DB, por lo que mockeamos Prisma.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

// Mock de Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      aggregate: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import {
  updateCustomerCreditBalance,
  verifyCustomerCreditBalance,
} from '../update-customer-credit-balance'

describe('updateCustomerCreditBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe recalcular creditBalance desde SUM de credit_transactions', async () => {
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(15000) },
      _count: 3,
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    } as never)
    vi.mocked(prisma.customer.update).mockResolvedValue({} as never)

    const result = await updateCustomerCreditBalance('customer-1')

    expect(result).toBe(15000)
    expect(prisma.creditTransaction.aggregate).toHaveBeenCalledWith({
      where: { customerId: 'customer-1' },
      _sum: { amount: true },
    })
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { creditBalance: new Decimal(15000) },
    })
  })

  it('debe retornar 0 cuando no hay credit_transactions', async () => {
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: null },
      _count: 0,
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    } as never)
    vi.mocked(prisma.customer.update).mockResolvedValue({} as never)

    const result = await updateCustomerCreditBalance('customer-1')

    expect(result).toBe(0)
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { creditBalance: new Decimal(0) },
    })
  })

  it('debe usar Math.max(0) cuando SUM es negativo', async () => {
    // Ejemplo: más crédito aplicado que generado
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(-5000) },
      _count: 2,
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    } as never)
    vi.mocked(prisma.customer.update).mockResolvedValue({} as never)

    const result = await updateCustomerCreditBalance('customer-1')

    expect(result).toBe(0)
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { creditBalance: new Decimal(0) },
    })
  })

  it('debe usar transacción de Prisma cuando se proporciona', async () => {
    const mockTx = {
      customer: {
        update: vi.fn().mockResolvedValue({}),
      },
      creditTransaction: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { amount: new Decimal(25000) },
        }),
      },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateCustomerCreditBalance('customer-1', mockTx as any)

    expect(result).toBe(25000)
    expect(mockTx.creditTransaction.aggregate).toHaveBeenCalled()
    expect(mockTx.customer.update).toHaveBeenCalled()
    // Prisma global NO debe haber sido llamado
    expect(prisma.creditTransaction.aggregate).not.toHaveBeenCalled()
    expect(prisma.customer.update).not.toHaveBeenCalled()
  })

  it('debe manejar montos decimales correctamente', async () => {
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(12345.67) },
      _count: 1,
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
    } as never)
    vi.mocked(prisma.customer.update).mockResolvedValue({} as never)

    const result = await updateCustomerCreditBalance('customer-1')

    expect(result).toBeCloseTo(12345.67, 2)
  })
})

describe('verifyCustomerCreditBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe retornar true si creditBalance coincide con SUM', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: new Decimal(15000),
    } as never)
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(15000) },
    } as never)

    const result = await verifyCustomerCreditBalance('customer-1')

    expect(result).toBe(true)
  })

  it('debe retornar false si creditBalance no coincide', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: new Decimal(20000),
    } as never)
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(15000) },
    } as never)

    const result = await verifyCustomerCreditBalance('customer-1')

    expect(result).toBe(false)
  })

  it('debe permitir diferencia dentro de tolerancia (0.01)', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: new Decimal(15000.005),
    } as never)
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(15000) },
    } as never)

    const result = await verifyCustomerCreditBalance('customer-1')

    expect(result).toBe(true)
  })

  it('debe fallar si diferencia excede tolerancia', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: new Decimal(15000.02),
    } as never)
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(15000) },
    } as never)

    const result = await verifyCustomerCreditBalance('customer-1')

    expect(result).toBe(false)
  })

  it('debe lanzar error si cliente no existe', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: null },
    } as never)

    await expect(verifyCustomerCreditBalance('nonexistent')).rejects.toThrow(
      'Customer nonexistent not found'
    )
  })

  it('debe verificar correctamente cliente sin credit_transactions (balance 0)', async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: new Decimal(0),
    } as never)
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: null },
    } as never)

    const result = await verifyCustomerCreditBalance('customer-1')

    expect(result).toBe(true)
  })

  it('debe aplicar Math.max(0) al calcular balance esperado', async () => {
    // DB tiene 0, SUM da negativo → calculado es 0 → match
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({
      creditBalance: new Decimal(0),
    } as never)
    vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({
      _sum: { amount: new Decimal(-3000) },
    } as never)

    const result = await verifyCustomerCreditBalance('customer-1')

    expect(result).toBe(true)
  })
})
