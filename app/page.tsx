export const dynamic = 'force-dynamic'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/format'
import { DashboardActivityList } from '@/components/summarys/dashboard-activity-list'
import { MonthlySalesSelector } from '@/components/summarys/monthly-sales-selector'
import { DashboardRevenueChart } from '@/components/summarys/dashboard-revenue-chart'

interface HomePageProps {
  searchParams?: Promise<{
    month?: string | string[]
  }>
}

interface DashboardMonth {
  value: string
  label: string
  start: Date
  end: Date
}

function getMonthValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function createDashboardMonth(value: string): DashboardMonth {
  const [year, month] = value.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)

  return {
    value,
    label: getMonthLabel(start),
    start,
    end,
  }
}

function resolveSelectedMonth(monthParam: string | string[] | undefined) {
  const now = new Date()
  const rawMonth = Array.isArray(monthParam) ? monthParam[0] : monthParam

  if (rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)) {
    const [year, month] = rawMonth.split('-').map(Number)

    if (month >= 1 && month <= 12 && year >= 1900 && year <= 3000) {
      return createDashboardMonth(rawMonth)
    }
  }

  return createDashboardMonth(getMonthValue(now))
}

async function getAvailableMonths(selectedMonth: DashboardMonth) {
  const oldestProject = await prisma.project.findFirst({
    orderBy: { date: 'asc' },
    select: { date: true },
  })

  const now = new Date()
  const start = oldestProject?.date ?? now
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  const months: Array<{ value: string; label: string }> = []

  while (cursor <= end) {
    months.push({
      value: getMonthValue(cursor),
      label: getMonthLabel(cursor),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  if (!months.some((month) => month.value === selectedMonth.value)) {
    months.push({
      value: selectedMonth.value,
      label: selectedMonth.label,
    })
  }

  return months.reverse()
}

async function getMonthlySales(month: DashboardMonth) {
  const projects = await prisma.project.findMany({
    where: {
      date: { gte: month.start, lte: month.end },
    },
    select: {
      subtotal: true,
      totalAmount: true,
    },
  })

  const subtotal = projects.reduce((sum, p) => sum + Number(p.subtotal), 0)
  const total = projects.reduce((sum, p) => sum + Number(p.totalAmount), 0)

  return { subtotal, total, count: projects.length }
}

async function getRevenueChartData() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const monthFormatter = new Intl.DateTimeFormat('es-CL', { month: 'short' })
  const buckets = new Map<
    string,
    { month: string; label: string; sales: number; revenue: number }
  >()
  const cursor = new Date(start)

  while (cursor <= end) {
    const month = getMonthValue(cursor)
    buckets.set(month, {
      month,
      label: monthFormatter.format(cursor).replace('.', ''),
      sales: 0,
      revenue: 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const [projects, payments] = await Promise.all([
    prisma.project.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, totalAmount: true },
    }),
    prisma.payment.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, amount: true },
    }),
  ])

  for (const project of projects) {
    const bucket = buckets.get(getMonthValue(project.date))

    if (bucket) {
      bucket.sales += Number(project.totalAmount)
    }
  }

  for (const payment of payments) {
    const bucket = buckets.get(getMonthValue(payment.date))

    if (bucket) {
      bucket.revenue += Number(payment.amount)
    }
  }

  return Array.from(buckets.values())
}

async function getUpcomingInstallments() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const installments = await prisma.installment.findMany({
    where: {
      dueDate: { gte: today },
    },
    orderBy: { dueDate: 'asc' },
    take: 15,
    include: {
      payment: {
        include: {
          customer: { select: { id: true, name: true } },
          allocations: {
            select: {
              project: {
                select: { id: true, projectNumber: true, projectName: true },
              },
            },
          },
        },
      },
    },
  })

  return installments.map((inst) => ({
    id: inst.id,
    installmentNumber: inst.installmentNumber,
    amount: Number(inst.amount),
    dueDate: inst.dueDate.toISOString(),
    customerName: inst.payment.customer.name,
    project: inst.payment.allocations[0]?.project ?? null,
    currency: inst.payment.currency,
    selectedInstallments: inst.payment.selectedInstallments,
  }))
}

async function getRecentProjects() {
  const projects = await prisma.$queryRaw<
    Array<{
      id: string
      projectNumber: string
      projectName: string | null
      totalAmount: unknown
      settledTotal: unknown
      currency: string
      customerName: string
    }>
  >`
    SELECT
      p.id,
      p."projectNumber",
      p."projectName",
      p."totalAmount",
      pf."settledTotal",
      p.currency,
      c.name AS "customerName"
    FROM "Project" p
    JOIN "ProjectFinancials" pf ON pf."projectId" = p.id
    JOIN "Customer" c ON c.id = p."customerId"
    ORDER BY p.date DESC
    LIMIT 15
  `

  return projects.map((p) => {
    const total = Number(p.totalAmount)
    return {
      id: p.id,
      projectNumber: p.projectNumber,
      projectName: p.projectName,
      customerName: p.customerName,
      total,
      totalPaid: Number(p.settledTotal),
      currency: p.currency,
    }
  })
}

async function getRecentPayments() {
  const payments = await prisma.payment.findMany({
    orderBy: { date: 'desc' },
    take: 15,
    select: {
      id: true,
      amount: true,
      currency: true,
      date: true,
      customer: { select: { name: true } },
      allocations: {
        take: 1,
        select: {
          project: {
            select: { id: true, projectNumber: true, projectName: true },
          },
        },
      },
    },
  })

  return payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    currency: p.currency,
    date: p.date.toISOString(),
    customerName: p.customer.name,
    project: p.allocations[0]?.project ?? null,
  }))
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams
  const selectedMonth = resolveSelectedMonth(resolvedSearchParams?.month)

  const [sales, availableMonths, revenueChartData, installments, recentProjects, recentPayments] =
    await Promise.all([
      getMonthlySales(selectedMonth),
      getAvailableMonths(selectedMonth),
      getRevenueChartData(),
      getUpcomingInstallments(),
      getRecentProjects(),
      getRecentPayments(),
    ])

  return (
    <AppLayout pageTitle="Panel Principal" breadcrumbs={[{ label: 'Panel Principal', href: '/' }]}>
      <div
        className="grid gap-4 h-[calc(100vh-10rem)]"
        style={{
          gridTemplateColumns: 'repeat(9, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          gridTemplateAreas: `
            "a a a a c c d d d"
            "b b b b b b d d d"
            "b b b b b b d d d"
            "b b b b b b d d d"
            "b b b b b b d d d"
            ". . . . . . d d d"
            ". . . . . . d d d"
            ". . . . . . d d d"
          `,
        }}
      >
        {/* Ventas mensuales */}
        <Card className="gap-1.5" style={{ gridArea: 'a' }}>
          <CardHeader className="px-3 py-0">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <span>Ventas</span>
              <MonthlySalesSelector selectedMonth={selectedMonth.value} months={availableMonths} />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-0">
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-bold">{formatCurrency(sales.total)}</p>
              <span className="text-xs text-muted-foreground">
                Neto: {formatCurrency(sales.subtotal)}
              </span>
              <Badge variant="secondary" className="text-xs">
                {sales.count} {sales.count === 1 ? 'proyecto' : 'proyectos'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-1.5" style={{ gridArea: 'c' }}>
          <CardHeader className="px-3 py-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Card C</CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-0">
            <p className="text-2xl font-bold">--</p>
          </CardContent>
        </Card>

        <DashboardRevenueChart gridArea="b" data={revenueChartData} />

        <DashboardActivityList
          gridArea="d"
          installments={installments}
          recentProjects={recentProjects}
          recentPayments={recentPayments}
        />
      </div>
    </AppLayout>
  )
}
