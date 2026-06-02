import { describe, expect, it } from 'vitest'

import { calculateProjectBalanceSnapshot } from '../project-balance'

describe('calculateProjectBalanceSnapshot', () => {
  it('calcula deuda pendiente con efectivo, credito y ajustes', () => {
    const result = calculateProjectBalanceSnapshot({
      projectId: 'project-1',
      totalAmount: 100000,
      appliedCashTotal: 60000,
      appliedCreditTotal: 10000,
      adjustmentTotal: 5000,
      overpayment: 0,
    })

    expect(result).toEqual({
      projectId: 'project-1',
      totalAmount: 100000,
      appliedCashTotal: 60000,
      appliedCreditTotal: 10000,
      adjustmentTotal: 5000,
      settledTotal: 75000,
      rawBalance: 25000,
      balance: 25000,
      overpayment: 0,
      totalPaid: 75000,
      percentPaid: 75,
      hasDebt: true,
    })
  })

  it('normaliza sobrepago dejando balance visible en cero', () => {
    const result = calculateProjectBalanceSnapshot({
      projectId: 'project-2',
      totalAmount: 100000,
      appliedCashTotal: 120000,
      appliedCreditTotal: 0,
      adjustmentTotal: 0,
      overpayment: 20000,
    })

    expect(result.rawBalance).toBe(-20000)
    expect(result.balance).toBe(0)
    expect(result.overpayment).toBe(20000)
    expect(result.percentPaid).toBe(120)
    expect(result.hasDebt).toBe(false)
  })

  it('usa tolerancia para deudas menores o iguales a balanceTolerance', () => {
    const result = calculateProjectBalanceSnapshot({
      projectId: 'project-3',
      totalAmount: 100000,
      appliedCashTotal: 99999.5,
      appliedCreditTotal: 0,
      adjustmentTotal: 0,
      overpayment: 0,
      balanceTolerance: 1,
    })

    expect(result.balance).toBe(0.5)
    expect(result.hasDebt).toBe(false)
  })
})
