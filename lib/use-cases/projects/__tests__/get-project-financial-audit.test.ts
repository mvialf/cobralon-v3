import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

import { getProjectFinancials } from '@/lib/business-logic/project-financials'
import { prisma } from '@/lib/db'

import { getProjectFinancialAudit } from '../get-project-financial-audit'

vi.mock('@/lib/db', () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    projectApplication: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/business-logic/project-financials', () => ({
  getProjectFinancials: vi.fn(),
}))

const projectId = '00000000-0000-0000-0000-000000000001'

const financials = {
  projectId,
  allocatedTotal: 80000,
  appliedCashTotal: 80000,
  appliedCreditTotal: 10000,
  adjustmentTotal: 5000,
  settledTotal: 95000,
  rawBalance: 5000,
  balance: 5000,
  overpayment: 0,
  totalPaid: 95000,
  percentPaid: 95,
  hasDebt: true,
}

describe('getProjectFinancialAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as never) as never)
  })

  it('rechaza proyecto inexistente antes de consultar financials', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    await expect(getProjectFinancialAudit(projectId)).rejects.toMatchObject({
      message: 'Proyecto no encontrado',
      statusCode: 404,
    })

    expect(getProjectFinancials).not.toHaveBeenCalled()
    expect(prisma.projectApplication.findMany).not.toHaveBeenCalled()
  })

  it('rechaza proyecto sin fila en ProjectFinancials', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      projectNumber: '1001',
      projectName: 'Proyecto auditado',
      totalAmount: new Decimal(100000),
      currency: 'CLP',
      customer: { id: 'customer-1', name: 'Cliente Uno', phone: '+56911111111' },
    } as never)
    vi.mocked(getProjectFinancials).mockResolvedValue(null)

    await expect(getProjectFinancialAudit(projectId)).rejects.toMatchObject({
      message: 'Datos financieros del proyecto no encontrados',
      statusCode: 404,
    })

    expect(prisma.projectApplication.findMany).not.toHaveBeenCalled()
  })

  it('mapea resumen financiero y aplicaciones con relaciones auditables', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: projectId,
      projectNumber: '1001',
      projectName: 'Proyecto auditado',
      totalAmount: new Decimal(100000),
      currency: 'CLP',
      customer: { id: 'customer-1', name: 'Cliente Uno', phone: '+56911111111' },
    } as never)
    vi.mocked(getProjectFinancials).mockResolvedValue(financials)
    vi.mocked(prisma.projectApplication.findMany).mockResolvedValue([
      {
        id: 'app-cash',
        sourceType: 'CASH',
        amount: new Decimal(80000),
        createdAt: new Date('2026-06-02T00:00:00.000Z'),
        paymentId: 'payment-1',
        paymentAllocationId: 'allocation-1',
        creditTransactionId: null,
        projectAdjustmentId: null,
        payment: {
          id: 'payment-1',
          date: new Date('2026-06-02T00:00:00.000Z'),
          amount: new Decimal(80000),
          type: 'Project',
          reference: 'REF-1',
          paymentMethod: { id: 'method-1', name: 'Efectivo', icon: null },
        },
        paymentAllocation: { id: 'allocation-1', allocatedAmount: new Decimal(80000) },
        creditTransaction: null,
        projectAdjustment: null,
      },
      {
        id: 'app-credit',
        sourceType: 'CUSTOMER_CREDIT',
        amount: new Decimal(10000),
        createdAt: new Date('2026-06-03T00:00:00.000Z'),
        paymentId: 'payment-1',
        paymentAllocationId: null,
        creditTransactionId: 'credit-1',
        projectAdjustmentId: null,
        payment: {
          id: 'payment-1',
          date: new Date('2026-06-03T00:00:00.000Z'),
          amount: new Decimal(90000),
          type: 'Project',
          reference: 'REF-1',
          paymentMethod: { id: 'method-1', name: 'Transferencia', icon: null },
        },
        paymentAllocation: null,
        creditTransaction: {
          id: 'credit-1',
          amount: new Decimal(-10000),
          type: 'APPLIED',
          description: 'Credito aplicado',
          metadata: { paymentId: 'payment-1' },
        },
        projectAdjustment: null,
      },
    ] as never)

    const audit = await getProjectFinancialAudit(projectId)

    expect(audit.project.totalAmount).toBe(100000)
    expect(audit.financials).toEqual(financials)
    expect(audit.applications).toEqual([
      expect.objectContaining({
        id: 'app-cash',
        sourceType: 'CASH',
        amount: 80000,
        payment: expect.objectContaining({ amount: 80000 }),
        paymentAllocation: { id: 'allocation-1', allocatedAmount: 80000 },
      }),
      expect.objectContaining({
        id: 'app-credit',
        sourceType: 'CUSTOMER_CREDIT',
        amount: 10000,
        creditTransaction: expect.objectContaining({
          id: 'credit-1',
          amount: -10000,
          type: 'APPLIED',
        }),
      }),
    ])
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.projectApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
    )
  })
})
