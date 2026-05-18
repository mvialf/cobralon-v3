import { Prisma } from '@prisma/client'

import { FINANCIAL } from '@/lib/constants/financial-constants'
import { prisma } from '@/lib/db'
import type { PrismaTransaction } from '@/lib/db/types'
import { addMoney, greaterThanMoneyWithTolerance, moneyToNumber } from './money'

type PrismaDb = typeof prisma | PrismaTransaction

export interface ProjectFinancials {
  projectId: string
  allocatedTotal: number
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

interface ProjectFinancialsRawRow {
  projectId: string
  allocatedTotal: Prisma.Decimal
  appliedCashTotal?: Prisma.Decimal
  appliedCreditTotal?: Prisma.Decimal
  adjustmentTotal: Prisma.Decimal
  settledTotal?: Prisma.Decimal
  rawBalance: Prisma.Decimal
  balance: Prisma.Decimal
  overpayment: Prisma.Decimal
}

export const PROJECT_FINANCIALS_SELECT = Prisma.sql`
  SELECT
    pf."projectId",
    pf."allocatedTotal",
    pf."appliedCashTotal",
    pf."appliedCreditTotal",
    pf."adjustmentTotal",
    pf."settledTotal",
    pf."rawBalance",
    pf.balance,
    pf.overpayment
  FROM "ProjectFinancials" pf
`

export function mapProjectFinancials(row: ProjectFinancialsRawRow): ProjectFinancials {
  const allocatedTotalMoney = row.allocatedTotal
  const appliedCashTotalMoney = row.appliedCashTotal ?? row.allocatedTotal
  const appliedCreditTotalMoney = row.appliedCreditTotal ?? 0
  const adjustmentTotalMoney = row.adjustmentTotal
  const settledTotalMoney = row.settledTotal ?? addMoney(allocatedTotalMoney, adjustmentTotalMoney)
  const rawBalanceMoney = row.rawBalance
  const balanceMoney = row.balance
  const totalAmount = addMoney(settledTotalMoney, rawBalanceMoney)

  return {
    projectId: row.projectId,
    allocatedTotal: moneyToNumber(allocatedTotalMoney),
    appliedCashTotal: moneyToNumber(appliedCashTotalMoney),
    appliedCreditTotal: moneyToNumber(appliedCreditTotalMoney),
    adjustmentTotal: moneyToNumber(adjustmentTotalMoney),
    settledTotal: moneyToNumber(settledTotalMoney),
    rawBalance: moneyToNumber(rawBalanceMoney),
    balance: moneyToNumber(balanceMoney),
    overpayment: moneyToNumber(row.overpayment),
    totalPaid: moneyToNumber(settledTotalMoney),
    percentPaid: greaterThanMoneyWithTolerance(totalAmount, 0, 0)
      ? moneyToNumber(settledTotalMoney.dividedBy(totalAmount).times(100))
      : 0,
    hasDebt: greaterThanMoneyWithTolerance(balanceMoney, 0, FINANCIAL.BALANCE_TOLERANCE),
  }
}

export async function getProjectFinancials(
  projectId: string,
  db: PrismaDb = prisma
): Promise<ProjectFinancials | null> {
  const rows = await db.$queryRaw<ProjectFinancialsRawRow[]>`
    ${PROJECT_FINANCIALS_SELECT}
    WHERE pf."projectId" = ${projectId}
    LIMIT 1
  `

  return rows[0] ? mapProjectFinancials(rows[0]) : null
}

export async function getProjectsFinancials(
  projectIds: string[],
  db: PrismaDb = prisma
): Promise<Map<string, ProjectFinancials>> {
  if (projectIds.length === 0) return new Map()

  const rows = await db.$queryRaw<ProjectFinancialsRawRow[]>`
    ${PROJECT_FINANCIALS_SELECT}
    WHERE pf."projectId"::text = ANY(${projectIds})
  `

  return new Map(rows.map((row) => [row.projectId, mapProjectFinancials(row)]))
}
