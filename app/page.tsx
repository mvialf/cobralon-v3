import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'
import { formatCurrency, formatDate } from '@/lib/format'
import { getInstallmentStatus } from '@/lib/business-logic/installments'
import { derivePaymentProgress } from '@/lib/business-logic/project-balance'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { DashboardList } from '@/components/summarys/dashboard-list'

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
    dueDate: inst.dueDate,
    status: getInstallmentStatus(inst.dueDate),
    customerName: inst.payment.customer.name,
    project: inst.payment.allocations[0]?.project ?? null,
    currency: inst.payment.currency,
    selectedInstallments: inst.payment.selectedInstallments,
  }))
}

async function getRecentProjects() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      projectNumber: true,
      projectName: true,
      totalAmount: true,
      balance: true,
      currency: true,
      customer: { select: { name: true } },
    },
  })

  return projects.map((p) => {
    const total = Number(p.totalAmount)
    const { totalPaid } = derivePaymentProgress(total, Number(p.balance))
    return {
      id: p.id,
      projectNumber: p.projectNumber,
      projectName: p.projectName,
      customerName: p.customer.name,
      total,
      totalPaid,
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
      paymentMethod: { select: { name: true } },
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
    date: p.date,
    customerName: p.customer.name,
    paymentMethod: p.paymentMethod.name,
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
            "f f f g g g d d d"
            "f f f g g g d d d"
            "f f f g g g d d d"
            "f f f g g g d d d"
            "f f f g g g h h h"
            "f f f g g g h h h"
            "f f f g g g h h h"
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

        {/* Proximas cuotas */}
        <DashboardList
          title="Proximas Cuotas"
          gridArea="d"
          linkHref="/payments/installments"
          linkLabel="Ver todas las cuotas"
          emptyMessage="Sin cuotas pendientes"
          items={installments.map((inst) => ({
            id: inst.id,
            left: inst.project ? (
              <ProjectNameSummary
                projectId={inst.project.id}
                projectNumber={inst.project.projectNumber}
                customerName={inst.customerName}
                projectName={inst.project.projectName}
                size="xs"
              />
            ) : (
              <span>{inst.customerName}</span>
            ),
            right: (
              <div className="flex items-end">
                <div className="flex items-center justify-end px-0 text-lg">
                  {inst.installmentNumber}/{inst.selectedInstallments || '?'}
                </div>
                <div className="flex flex-col items-center justify-end">
                  <div className="px-1 font-bold text-sm">
                    {formatCurrency(inst.amount, inst.currency)}
                  </div>
                  <div className="px-1 text-xs text-muted-foreground">
                    {formatDate(inst.dueDate, 'short')}
                  </div>
                </div>
              </div>
            ),
          }))}
        />

        {/* Nuevos proyectos */}
        <DashboardList
          title="Nuevos Proyectos"
          gridArea="f"
          linkHref="/projects"
          linkLabel="Ver todos los proyectos"
          emptyMessage="Sin proyectos recientes"
          items={recentProjects.map((proj) => ({
            id: proj.id,
            left: (
              <ProjectNameSummary
                projectId={proj.id}
                projectNumber={proj.projectNumber}
                customerName={proj.customerName}
                projectName={proj.projectName}
                size="xs"
              />
            ),
            right: (
              <div className="flex flex-col items-end justify-center">
                <div className="px-1 font-bold text-sm">
                  {formatCurrency(proj.total, proj.currency)}
                </div>
                <div className="px-1 text-xs text-muted-foreground">
                  {formatCurrency(proj.totalPaid, proj.currency)}
                </div>
              </div>
            ),
          }))}
        />

        {/* Ultimos pagos */}
        <DashboardList
          title="Ultimos Pagos"
          gridArea="g"
          linkHref="/payments"
          linkLabel="Ver todos los pagos"
          emptyMessage="Sin pagos recientes"
          items={recentPayments.map((pay) => ({
            id: pay.id,
            left: pay.project ? (
              <ProjectNameSummary
                projectId={pay.project.id}
                projectNumber={pay.project.projectNumber}
                customerName={pay.customerName}
                projectName={pay.project.projectName}
                size="xs"
              />
            ) : (
              <span className="text-xs">{pay.customerName}</span>
            ),
            right: (
              <div className="flex flex-col items-end justify-center">
                <div className="px-1 font-bold text-sm">
                  {formatCurrency(pay.amount, pay.currency)}
                </div>
                <div className="px-1 text-xs text-muted-foreground">
                  {formatDate(pay.date, 'short')}
                </div>
              </div>
            ),
          }))}
        />

        {/* Panel inferior derecho */}
        <Card className="gap-1.5" style={{ gridArea: 'h' }}>
          <CardHeader className="px-3 py-0">
            <CardTitle className="text-sm font-medium">Card H</CardTitle>
          </CardHeader>
          <CardContent className="px-3 py-0">
            <p className="text-sm text-muted-foreground">Panel inferior</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
