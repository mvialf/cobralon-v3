import { describe, expect, it } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'

import { mapProjectFinancials } from '../project-financials'

describe('mapProjectFinancials', () => {
  it('usa settledTotal para totalPaid y percentPaid cuando hay crédito aplicado', () => {
    const financials = mapProjectFinancials({
      projectId: 'project-1',
      allocatedTotal: new Decimal(80),
      appliedCashTotal: new Decimal(80),
      appliedCreditTotal: new Decimal(20),
      adjustmentTotal: new Decimal(0),
      settledTotal: new Decimal(100),
      rawBalance: new Decimal(0),
      balance: new Decimal(0),
      overpayment: new Decimal(0),
    })

    expect(financials.appliedCashTotal).toBe(80)
    expect(financials.appliedCreditTotal).toBe(20)
    expect(financials.settledTotal).toBe(100)
    expect(financials.totalPaid).toBe(100)
    expect(financials.percentPaid).toBe(100)
    expect(financials.balance).toBe(0)
  })
})
