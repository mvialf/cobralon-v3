import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '@/lib/db'
import { getCustomerCreditBalance, lockCustomerCreditBalance } from '@/lib/business-logic/credit-management'
import { getProjectsFinancials } from '@/lib/business-logic/project-financials'
import { createPayment } from '../create-payment'
import type { LoggerLike } from '../create-payment'

vi.mock('@/lib/db', () => ({
  prisma: {
    customer: { findUnique: vi.fn() },
    paymentMethod: { findUnique: vi.fn() },
    project: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/business-logic/project-financials', () => ({
  getProjectsFinancials: vi.fn(),
}))

vi.mock('@/lib/business-logic/credit-management', () => ({
  getCustomerCreditBalance: vi.fn(),
  lockCustomerCreditBalance: vi.fn(),
}))

const logger: LoggerLike = {
  child: vi.fn((): LoggerLike => logger),
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
}

function financials(balance: number, rawBalance = balance) {
  return {
    projectId: 'project-1',
    allocatedTotal: 0,
    appliedCashTotal: 0,
    appliedCreditTotal: 0,
    adjustmentTotal: 0,
    settledTotal: 0,
    rawBalance,
    balance,
    overpayment: Math.max(0, -rawBalance),
    totalPaid: 0,
    percentPaid: 0,
    hasDebt: balance > 0,
  }
}

function mockPaymentDependencies() {
  vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'customer-1' } as never)
  vi.mocked(prisma.paymentMethod.findUnique).mockResolvedValue({
    id: 'method-1',
    commissionTiers: [],
  } as never)
  vi.mocked(prisma.project.findMany).mockResolvedValue([
    { id: 'project-1', customerId: 'customer-1', currency: 'CLP', projectNumber: '1001' },
  ] as never)
}

function mockTransaction(paymentAmount = 50000) {
  const txProjectApplication = { createMany: vi.fn() }
  const txCreditTransaction = { createMany: vi.fn() }
  const tx = {
    payment: {
      create: vi.fn().mockResolvedValue({
        id: 'payment-1',
        allocations: [
          {
            id: 'allocation-1',
            project: { id: 'project-1' },
            allocatedAmount: paymentAmount,
          },
        ],
        installments: [],
      }),
    },
    installment: { update: vi.fn() },
    creditTransaction: txCreditTransaction,
    projectApplication: txProjectApplication,
  }

  vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never) as never)

  return { tx, txProjectApplication, txCreditTransaction }
}

describe('createPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza pago Project con multiples allocations antes de abrir transaccion', async () => {
    await expect(
      createPayment(
        {
          type: 'Project',
          customerId: 'customer-1',
          amount: 100000,
          currency: 'CLP',
          date: new Date('2026-06-02T00:00:00.000Z'),
          paymentMethodId: 'method-1',
          reference: null,
          notes: null,
          selectedInstallments: null,
          allocations: [
            { projectId: 'project-1', allocatedAmount: 50000, creditApplied: 0 },
            { projectId: 'project-2', allocatedAmount: 50000, creditApplied: 0 },
          ],
        },
        logger
      )
    ).rejects.toMatchObject({
      message: 'Pago tipo "Project" debe tener exactamente 1 asignación',
      statusCode: 400,
    })

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('crea un pago y registra aplicación CASH', async () => {
    mockPaymentDependencies()
    const { txProjectApplication } = mockTransaction(50000)
    vi.mocked(getProjectsFinancials).mockResolvedValue(new Map([['project-1', financials(100000)]]))

    const payment = await createPayment(
      {
        type: 'Project',
        customerId: 'customer-1',
        amount: 50000,
        currency: 'CLP',
        date: new Date('2026-06-02T00:00:00.000Z'),
        paymentMethodId: 'method-1',
        reference: null,
        notes: null,
        selectedInstallments: null,
        allocations: [{ projectId: 'project-1', allocatedAmount: 50000, creditApplied: 0 }],
      },
      logger
    )

    expect(payment.id).toBe('payment-1')
    expect(txProjectApplication.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          projectId: 'project-1',
          paymentId: 'payment-1',
          paymentAllocationId: 'allocation-1',
          sourceType: 'CASH',
        }),
      ],
    })
  })

  it('rechaza crédito insuficiente dentro de la transacción', async () => {
    mockPaymentDependencies()
    mockTransaction(100000)
    vi.mocked(getProjectsFinancials).mockResolvedValue(new Map([['project-1', financials(100000)]]))
    vi.mocked(lockCustomerCreditBalance).mockResolvedValue(true)
    vi.mocked(getCustomerCreditBalance).mockResolvedValue(0)

    await expect(
      createPayment(
        {
          type: 'Project',
          customerId: 'customer-1',
          amount: 100000,
          currency: 'CLP',
          date: new Date('2026-06-02T00:00:00.000Z'),
          paymentMethodId: 'method-1',
          reference: null,
          notes: null,
          selectedInstallments: null,
          allocations: [{ projectId: 'project-1', allocatedAmount: 100000, creditApplied: 5000 }],
        },
        logger
      )
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('genera CreditTransaction OVERPAYMENT cuando el pago supera el balance', async () => {
    mockPaymentDependencies()
    const { txCreditTransaction } = mockTransaction(120000)
    vi.mocked(getProjectsFinancials).mockResolvedValue(new Map([['project-1', financials(100000)]]))

    await createPayment(
      {
        type: 'Project',
        customerId: 'customer-1',
        amount: 120000,
        currency: 'CLP',
        date: new Date('2026-06-02T00:00:00.000Z'),
        paymentMethodId: 'method-1',
        reference: null,
        notes: null,
        selectedInstallments: null,
        allocations: [{ projectId: 'project-1', allocatedAmount: 120000, creditApplied: 0 }],
      },
      logger
    )

    expect(txCreditTransaction.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          customerId: 'customer-1',
          paymentId: 'payment-1',
          projectId: 'project-1',
          type: 'OVERPAYMENT',
        }),
      ],
    })
    expect(Number(txCreditTransaction.createMany.mock.calls[0][0].data[0].amount)).toBe(20000)
  })
})
