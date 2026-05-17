import { Prisma } from '@prisma/client'

import { FINANCIAL } from '@/lib/constants/financial-constants'
import { prisma } from '@/lib/db'
import type { PrismaTransaction } from '@/lib/db/types'

type PrismaDb = typeof prisma | PrismaTransaction

export interface ProjectFinancials {
  projectId: string
  allocatedTotal: number
  adjustmentTotal: number
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
  adjustmentTotal: Prisma.Decimal
  rawBalance: Prisma.Decimal
  balance: Prisma.Decimal
  overpayment: Prisma.Decimal
}

export const PROJECT_FINANCIALS_SELECT = Prisma.sql`
  SELECT
    pf."projectId",
    pf."allocatedTotal",
    pf."adjustmentTotal",
    pf."rawBalance",
    pf.balance,
    pf.overpayment
  FROM "ProjectFinancials" pf
`

export function mapProjectFinancials(row: ProjectFinancialsRawRow): ProjectFinancials {
  const allocatedTotal = Number(row.allocatedTotal)
  const balance = Number(row.balance)
  const totalAmount = allocatedTotal + Number(row.adjustmentTotal) + Number(row.rawBalance)

  return {
    projectId: row.projectId,
    allocatedTotal,
    adjustmentTotal: Number(row.adjustmentTotal),
    rawBalance: Number(row.rawBalance),
    balance,
    overpayment: Number(row.overpayment),
    totalPaid: allocatedTotal,
    percentPaid: totalAmount > 0 ? (allocatedTotal / totalAmount) * 100 : 0,
    hasDebt: balance > FINANCIAL.BALANCE_TOLERANCE,
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
