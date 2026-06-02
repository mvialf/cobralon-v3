import { FINANCIAL } from '@/lib/constants/financial-constants'

import {
  addMoney,
  greaterThanMoney,
  greaterThanMoneyWithTolerance,
  maxMoney,
  money,
  moneyToNumber,
  subtractMoney,
} from './money'

export interface ProjectBalanceInput {
  projectId: string
  totalAmount: number
  appliedCashTotal: number
  appliedCreditTotal: number
  adjustmentTotal: number
  overpayment?: number
  balanceTolerance?: number
}

export interface ProjectBalanceSnapshot {
  projectId: string
  totalAmount: number
  appliedCashTotal: number
  appliedCreditTotal: number
  adjustmentTotal: number
  settledTotal: number
  rawBalance: number
  balance: number
  overpayment: number
  totalPaid: number
  percentPaid: number
  hasDebt: boolean
}

export function calculateProjectBalanceSnapshot(
  input: ProjectBalanceInput
): ProjectBalanceSnapshot {
  const totalAmount = money(input.totalAmount)
  const appliedCashTotal = money(input.appliedCashTotal)
  const appliedCreditTotal = money(input.appliedCreditTotal)
  const adjustmentTotal = money(input.adjustmentTotal)
  const settledTotal = addMoney(addMoney(appliedCashTotal, appliedCreditTotal), adjustmentTotal)
  const rawBalance = subtractMoney(totalAmount, settledTotal)
  const balance = maxMoney(0, rawBalance)
  const overpayment = money(
    input.overpayment ?? moneyToNumber(maxMoney(0, subtractMoney(0, rawBalance)))
  )
  const balanceTolerance = input.balanceTolerance ?? FINANCIAL.BALANCE_TOLERANCE

  return {
    projectId: input.projectId,
    totalAmount: moneyToNumber(totalAmount),
    appliedCashTotal: moneyToNumber(appliedCashTotal),
    appliedCreditTotal: moneyToNumber(appliedCreditTotal),
    adjustmentTotal: moneyToNumber(adjustmentTotal),
    settledTotal: moneyToNumber(settledTotal),
    rawBalance: moneyToNumber(rawBalance),
    balance: moneyToNumber(balance),
    overpayment: moneyToNumber(overpayment),
    totalPaid: moneyToNumber(settledTotal),
    percentPaid: greaterThanMoney(totalAmount, 0)
      ? moneyToNumber(settledTotal.dividedBy(totalAmount).times(100))
      : 0,
    hasDebt: greaterThanMoneyWithTolerance(balance, 0, balanceTolerance),
  }
}
