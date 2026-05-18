import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'

loadLocalEnv()

const prisma = new PrismaClient()
const ROW_LIMIT = parsePositiveInt(process.env.AUDIT_ROW_LIMIT, 100)

type Severity = 'critical' | 'warning' | 'info'

interface CheckConfig {
  id: string
  severity: Severity
  title: string
  countQuery: Prisma.Sql
  rowsQuery: Prisma.Sql
}

interface AuditCheck {
  id: string
  severity: Severity
  title: string
  totalCount: number
  rows: unknown[]
}

interface AuditReport {
  generatedAt: string
  rowLimit: number
  summary: {
    totalChecks: number
    checksWithFindings: number
    findingsBySeverity: Record<Severity, number>
    checksWithFindingsBySeverity: Record<Severity, number>
  }
  checks: AuditCheck[]
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function loadLocalEnv() {
  for (const filename of ['.env', '.env.local', '.env.development', '.env.development.local']) {
    const envPath = join(process.cwd(), filename)
    if (!existsSync(envPath)) continue

    const content = readFileSync(envPath, 'utf8')
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const equalsIndex = line.indexOf('=')
      if (equalsIndex <= 0) continue

      const key = line.slice(0, equalsIndex).trim()
      const rawValue = line.slice(equalsIndex + 1).trim()
      if (process.env[key] !== undefined) continue

      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
    }
  }
}

function toNumber(value: unknown) {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(jsonSafe)
  if (value && typeof value === 'object') {
    if ('toJSON' in value && typeof value.toJSON === 'function') {
      return value.toJSON()
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, jsonSafe(item)])
    )
  }
  return value
}

async function runCheck(config: CheckConfig): Promise<AuditCheck> {
  const countRows = await prisma.$queryRaw<Array<{ count: number | bigint | string }>>(
    config.countQuery
  )
  const rows = await prisma.$queryRaw<unknown[]>(config.rowsQuery)

  return {
    id: config.id,
    severity: config.severity,
    title: config.title,
    totalCount: toNumber(countRows[0]?.count),
    rows: jsonSafe(rows) as unknown[],
  }
}

const checks: CheckConfig[] = [
  {
    id: 'payment-allocation-missing-cash-application',
    severity: 'critical',
    title: 'PaymentAllocation sin ProjectApplication CASH',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "PaymentAllocation" pa
      LEFT JOIN "project_applications" app
        ON app."paymentAllocationId" = pa.id
       AND app."sourceType" = 'CASH'::"ProjectApplicationSourceType"
      WHERE app.id IS NULL
    `,
    rowsQuery: Prisma.sql`
      SELECT
        pa.id AS "paymentAllocationId",
        pa."paymentId",
        pa."projectId",
        pa."allocatedAmount"
      FROM "PaymentAllocation" pa
      LEFT JOIN "project_applications" app
        ON app."paymentAllocationId" = pa.id
       AND app."sourceType" = 'CASH'::"ProjectApplicationSourceType"
      WHERE app.id IS NULL
      ORDER BY pa.id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'project-adjustment-missing-application',
    severity: 'critical',
    title: 'ProjectAdjustment sin ProjectApplication ADJUSTMENT',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "project_adjustments" adj
      LEFT JOIN "project_applications" app
        ON app."projectAdjustmentId" = adj.id
       AND app."sourceType" = 'ADJUSTMENT'::"ProjectApplicationSourceType"
      WHERE app.id IS NULL
    `,
    rowsQuery: Prisma.sql`
      SELECT
        adj.id AS "projectAdjustmentId",
        adj."projectId",
        adj.amount,
        adj.reason
      FROM "project_adjustments" adj
      LEFT JOIN "project_applications" app
        ON app."projectAdjustmentId" = adj.id
       AND app."sourceType" = 'ADJUSTMENT'::"ProjectApplicationSourceType"
      WHERE app.id IS NULL
      ORDER BY adj.id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'applied-credit-missing-application',
    severity: 'critical',
    title: 'CreditTransaction APPLIED sin ProjectApplication CUSTOMER_CREDIT',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "credit_transactions" ct
      LEFT JOIN "project_applications" app
        ON app."creditTransactionId" = ct.id
       AND app."sourceType" = 'CUSTOMER_CREDIT'::"ProjectApplicationSourceType"
      WHERE ct.type = 'APPLIED'::"CreditTransactionType"
        AND ct."projectId" IS NOT NULL
        AND ct.amount < 0
        AND app.id IS NULL
    `,
    rowsQuery: Prisma.sql`
      SELECT
        ct.id AS "creditTransactionId",
        ct."customerId",
        ct."projectId",
        ct."paymentId",
        ct.amount
      FROM "credit_transactions" ct
      LEFT JOIN "project_applications" app
        ON app."creditTransactionId" = ct.id
       AND app."sourceType" = 'CUSTOMER_CREDIT'::"ProjectApplicationSourceType"
      WHERE ct.type = 'APPLIED'::"CreditTransactionType"
        AND ct."projectId" IS NOT NULL
        AND ct.amount < 0
        AND app.id IS NULL
      ORDER BY ct.id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'project-application-non-positive-amount',
    severity: 'critical',
    title: 'ProjectApplication con amount <= 0',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "project_applications"
      WHERE amount <= 0
    `,
    rowsQuery: Prisma.sql`
      SELECT
        id AS "projectApplicationId",
        "projectId",
        "customerId",
        amount,
        "sourceType"
      FROM "project_applications"
      WHERE amount <= 0
      ORDER BY id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'project-application-customer-mismatch',
    severity: 'critical',
    title: 'ProjectApplication.customerId distinto al Customer del Project',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "project_applications" app
      JOIN "Project" p ON p.id = app."projectId"
      WHERE app."customerId" <> p."customerId"
    `,
    rowsQuery: Prisma.sql`
      SELECT
        app.id AS "projectApplicationId",
        app."projectId",
        app."customerId" AS "applicationCustomerId",
        p."customerId" AS "projectCustomerId",
        app.amount,
        app."sourceType"
      FROM "project_applications" app
      JOIN "Project" p ON p.id = app."projectId"
      WHERE app."customerId" <> p."customerId"
      ORDER BY app.id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'project-adjustment-non-positive-amount',
    severity: 'critical',
    title: 'ProjectAdjustment con amount <= 0',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "project_adjustments"
      WHERE amount <= 0
    `,
    rowsQuery: Prisma.sql`
      SELECT
        id AS "projectAdjustmentId",
        "projectId",
        amount,
        reason
      FROM "project_adjustments"
      WHERE amount <= 0
      ORDER BY id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'negative-credit-ledger',
    severity: 'critical',
    title: 'Ledger de credito negativo por cliente',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "customerId"
        FROM "credit_transactions"
        GROUP BY "customerId"
        HAVING SUM(amount) < 0
      ) negative_ledgers
    `,
    rowsQuery: Prisma.sql`
      SELECT
        ct."customerId",
        c.name AS "customerName",
        SUM(ct.amount)::numeric(12, 2) AS "rawCreditBalance"
      FROM "credit_transactions" ct
      JOIN "Customer" c ON c.id = ct."customerId"
      GROUP BY ct."customerId", c.name
      HAVING SUM(ct.amount) < 0
      ORDER BY "rawCreditBalance" ASC
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'payment-allocation-non-positive-amount',
    severity: 'critical',
    title: 'PaymentAllocation con allocatedAmount <= 0',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "PaymentAllocation"
      WHERE "allocatedAmount" <= 0
    `,
    rowsQuery: Prisma.sql`
      SELECT
        id AS "paymentAllocationId",
        "paymentId",
        "projectId",
        "allocatedAmount"
      FROM "PaymentAllocation"
      WHERE "allocatedAmount" <= 0
      ORDER BY id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'payment-allocation-sum-exceeds-payment',
    severity: 'warning',
    title: 'Suma de PaymentAllocation supera Payment.amount',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT p.id
        FROM "Payment" p
        JOIN "PaymentAllocation" pa ON pa."paymentId" = p.id
        GROUP BY p.id, p.amount
        HAVING SUM(pa."allocatedAmount") > p.amount + 1
      ) over_allocated_payments
    `,
    rowsQuery: Prisma.sql`
      SELECT
        p.id AS "paymentId",
        p."customerId",
        p.amount AS "paymentAmount",
        SUM(pa."allocatedAmount")::numeric(12, 2) AS "allocatedTotal",
        (SUM(pa."allocatedAmount") - p.amount)::numeric(12, 2) AS "excess"
      FROM "Payment" p
      JOIN "PaymentAllocation" pa ON pa."paymentId" = p.id
      GROUP BY p.id, p."customerId", p.amount
      HAVING SUM(pa."allocatedAmount") > p.amount + 1
      ORDER BY "excess" DESC
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'legacy-project-balance-differs-from-financials',
    severity: 'warning',
    title: 'Project.balance legacy difiere de ProjectFinancials.balance',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      WHERE ABS(p.balance - pf.balance) > 1
    `,
    rowsQuery: Prisma.sql`
      SELECT
        p.id AS "projectId",
        p."projectNumber",
        p.balance AS "legacyBalance",
        pf.balance AS "derivedBalance",
        (p.balance - pf.balance)::numeric(12, 2) AS "difference"
      FROM "Project" p
      JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      WHERE ABS(p.balance - pf.balance) > 1
      ORDER BY ABS(p.balance - pf.balance) DESC
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'project-missing-financials',
    severity: 'critical',
    title: 'Project sin fila en ProjectFinancials',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM "Project" p
      LEFT JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      WHERE pf."projectId" IS NULL
    `,
    rowsQuery: Prisma.sql`
      SELECT
        p.id AS "projectId",
        p."projectNumber",
        p."customerId",
        p."totalAmount"
      FROM "Project" p
      LEFT JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
      WHERE pf."projectId" IS NULL
      ORDER BY p.id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'installment-sum-differs-from-payment',
    severity: 'warning',
    title: 'Suma de Installment no coincide con Payment.amount',
    countQuery: Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT p.id
        FROM "Payment" p
        JOIN "Installment" i ON i."paymentId" = p.id
        GROUP BY p.id, p.amount
        HAVING ABS(SUM(i.amount) - p.amount) > 1
      ) installment_mismatches
    `,
    rowsQuery: Prisma.sql`
      SELECT
        p.id AS "paymentId",
        p.amount AS "paymentAmount",
        SUM(i.amount)::numeric(12, 2) AS "installmentsTotal",
        (SUM(i.amount) - p.amount)::numeric(12, 2) AS "difference"
      FROM "Payment" p
      JOIN "Installment" i ON i."paymentId" = p.id
      GROUP BY p.id, p.amount
      HAVING ABS(SUM(i.amount) - p.amount) > 1
      ORDER BY ABS(SUM(i.amount) - p.amount) DESC
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'project-or-payment-missing-parent',
    severity: 'critical',
    title: 'Project/Payment con referencia padre ausente',
    countQuery: Prisma.sql`
      SELECT (
        SELECT COUNT(*)
        FROM "Project" p
        LEFT JOIN "Customer" c ON c.id = p."customerId"
        WHERE c.id IS NULL
      )::int
      + (
        SELECT COUNT(*)
        FROM "Payment" p
        LEFT JOIN "Customer" c ON c.id = p."customerId"
        LEFT JOIN "PaymentMethod" pm ON pm.id = p."paymentMethodId"
        WHERE c.id IS NULL OR pm.id IS NULL
      )::int AS count
    `,
    rowsQuery: Prisma.sql`
      SELECT *
      FROM (
        SELECT
          'Project' AS "entity",
          p.id,
          p."customerId",
          NULL::text AS "paymentMethodId"
        FROM "Project" p
        LEFT JOIN "Customer" c ON c.id = p."customerId"
        WHERE c.id IS NULL

        UNION ALL

        SELECT
          'Payment' AS "entity",
          p.id,
          p."customerId",
          p."paymentMethodId"
        FROM "Payment" p
        LEFT JOIN "Customer" c ON c.id = p."customerId"
        LEFT JOIN "PaymentMethod" pm ON pm.id = p."paymentMethodId"
        WHERE c.id IS NULL OR pm.id IS NULL
      ) missing_parents
      ORDER BY "entity", id
      LIMIT ${ROW_LIMIT}
    `,
  },
  {
    id: 'important-table-counts',
    severity: 'info',
    title: 'Conteo de tablas importantes',
    countQuery: Prisma.sql`SELECT 1::int AS count`,
    rowsQuery: Prisma.sql`
      SELECT 'Customer' AS "table", COUNT(*)::int AS count FROM "Customer"
      UNION ALL SELECT 'Project', COUNT(*)::int FROM "Project"
      UNION ALL SELECT 'Payment', COUNT(*)::int FROM "Payment"
      UNION ALL SELECT 'PaymentAllocation', COUNT(*)::int FROM "PaymentAllocation"
      UNION ALL SELECT 'ProjectApplication', COUNT(*)::int FROM "project_applications"
      UNION ALL SELECT 'CreditTransaction', COUNT(*)::int FROM "credit_transactions"
      UNION ALL SELECT 'ProjectAdjustment', COUNT(*)::int FROM "project_adjustments"
      UNION ALL SELECT 'Installment', COUNT(*)::int FROM "Installment"
      ORDER BY "table"
    `,
  },
]

function buildSummary(checksResult: AuditCheck[]): AuditReport['summary'] {
  const findingsBySeverity: Record<Severity, number> = { critical: 0, warning: 0, info: 0 }
  const checksWithFindingsBySeverity: Record<Severity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  }

  for (const check of checksResult) {
    findingsBySeverity[check.severity] += check.totalCount
    if (check.totalCount > 0) {
      checksWithFindingsBySeverity[check.severity] += 1
    }
  }

  return {
    totalChecks: checksResult.length,
    checksWithFindings: checksResult.filter((check) => check.totalCount > 0).length,
    findingsBySeverity,
    checksWithFindingsBySeverity,
  }
}

async function main() {
  console.log('Auditing important data...')
  console.log(`Row limit per check: ${ROW_LIMIT}`)

  const checksResult: AuditCheck[] = []
  for (const check of checks) {
    const result = await runCheck(check)
    checksResult.push(result)
    console.log(`[${result.severity}] ${result.id}: ${result.totalCount}`)
  }

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    rowLimit: ROW_LIMIT,
    summary: buildSummary(checksResult),
    checks: checksResult,
  }

  const outputDir = join(process.cwd(), 'backups')
  const outputPath = join(outputDir, `audit-important-data-${new Date().toISOString()}.json`)

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)

  console.log('\nSummary:')
  console.log(JSON.stringify(report.summary, null, 2))
  console.log(`\nReport: ${outputPath}`)

  if (report.summary.findingsBySeverity.critical > 0) {
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
