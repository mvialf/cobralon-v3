export const dynamic = 'force-dynamic'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/format'
import { DashboardActivityList } from '@/components/summarys/dashboard-activity-list'

async function getMonthlySales() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const projects = await prisma.project.findMany({
    where: {
      date: { gte: startOfMonth, lte: endOfMonth },
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

export default async function HomePage() {
  const [sales, installments, recentProjects, recentPayments] = await Promise.all([
    getMonthlySales(),
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
            ". . . . . . d d d"
            ". . . . . . d d d"
            ". . . . . . d d d"
            ". . . . . . d d d"
            ". . . . . . d d d"
            ". . . . . . d d d"
            ". . . . . . d d d"
          `,
        }}
      >
        {/* Ventas mensuales */}
        <Card className="gap-1.5" style={{ gridArea: 'a' }}>
          <CardHeader className="px-3 py-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ventas del Mes
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
