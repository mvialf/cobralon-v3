'use client'

import { type ReactNode, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import useMeasure from 'react-use-measure'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { DashboardAmountStack } from '@/components/summarys/dashboard-amount-stack'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const ITEM_HEIGHT = 52

type ActivityView = 'installments' | 'projects' | 'payments'

interface DashboardProject {
  id: string
  projectNumber: string
  projectName: string | null
}

interface DashboardInstallment {
  id: string
  installmentNumber: number
  amount: number
  dueDate: string
  customerName: string
  project: DashboardProject | null
  currency: string
  selectedInstallments: number | null
}

interface DashboardRecentProject extends DashboardProject {
  customerName: string
  total: number
  totalPaid: number
  currency: string
}

interface DashboardRecentPayment {
  id: string
  amount: number
  currency: string
  date: string
  customerName: string
  project: DashboardProject | null
}

interface DashboardActivityListProps {
  installments: DashboardInstallment[]
  recentProjects: DashboardRecentProject[]
  recentPayments: DashboardRecentPayment[]
  gridArea: string
  className?: string
}

interface ActivityItem {
  id: string
  left: ReactNode
  right: ReactNode
}

interface ActivityConfig {
  headerRight: ReactNode
  linkHref: string
  linkLabel: string
  emptyMessage: string
  items: ActivityItem[]
}

export function DashboardActivityList({
  installments,
  recentProjects,
  recentPayments,
  gridArea,
  className,
}: DashboardActivityListProps) {
  const [activeView, setActiveView] = useState<ActivityView>('installments')
  const [ref, bounds] = useMeasure()

  const configs = useMemo<Record<ActivityView, ActivityConfig>>(() => {
    const now = new Date()
    const installmentTotal = installments
      .filter((inst) => {
        const dueDate = new Date(inst.dueDate)
        return dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear()
      })
      .reduce((sum, inst) => sum + inst.amount, 0)

    return {
      installments: {
        headerRight:
          installmentTotal > 0 ? (
            <span className="text-sm font-medium">{formatCurrency(installmentTotal)}</span>
          ) : null,
        linkHref: '/payments/installments',
        linkLabel: 'Ver todas las cuotas',
        emptyMessage: 'Sin cuotas pendientes',
        items: installments.map((inst, idx) => ({
          id: `${inst.id}-${idx}`,
          left: inst.project ? (
            <ProjectNameSummary
              projectId={inst.project.id}
              projectNumber={inst.project.projectNumber}
              customerName={inst.customerName}
              projectName={inst.project.projectName}
              size="xs"
              variant="dashboard"
            />
          ) : (
            <span>{inst.customerName}</span>
          ),
          right: (
            <div className="flex items-end">
              <div className="flex items-center justify-end px-0 text-lg">
                {inst.installmentNumber}/{inst.selectedInstallments || '?'}
              </div>
              <DashboardAmountStack
                primary={formatCurrency(inst.amount, inst.currency)}
                secondary={formatDate(inst.dueDate, 'short')}
              />
            </div>
          ),
        })),
      },
      projects: {
        headerRight: <span className="text-sm font-medium">{recentProjects.length} recientes</span>,
        linkHref: '/projects',
        linkLabel: 'Ver todos los proyectos',
        emptyMessage: 'Sin proyectos recientes',
        items: recentProjects.map((proj) => ({
          id: proj.id,
          left: (
            <ProjectNameSummary
              projectId={proj.id}
              projectNumber={proj.projectNumber}
              customerName={proj.customerName}
              projectName={proj.projectName}
              size="xs"
              variant="dashboard"
            />
          ),
          right: (
            <DashboardAmountStack
              primary={formatCurrency(proj.total, proj.currency)}
              secondary={formatCurrency(proj.totalPaid, proj.currency)}
            />
          ),
        })),
      },
      payments: {
        headerRight: <span className="text-sm font-medium">{recentPayments.length} recientes</span>,
        linkHref: '/payments',
        linkLabel: 'Ver todos los pagos',
        emptyMessage: 'Sin pagos recientes',
        items: recentPayments.map((pay) => ({
          id: pay.id,
          left: pay.project ? (
            <ProjectNameSummary
              projectId={pay.project.id}
              projectNumber={pay.project.projectNumber}
              customerName={pay.customerName}
              projectName={pay.project.projectName}
              size="xs"
              variant="dashboard"
            />
          ) : (
            <span className="text-xs">{pay.customerName}</span>
          ),
          right: (
            <DashboardAmountStack
              primary={formatCurrency(pay.amount, pay.currency)}
              secondary={formatDate(pay.date, 'short')}
            />
          ),
        })),
      },
    }
  }, [installments, recentProjects, recentPayments])

  const activeConfig = configs[activeView]
  const visibleCount =
    bounds.height > 0
      ? Math.max(1, Math.floor(bounds.height / ITEM_HEIGHT))
      : Math.min(5, activeConfig.items.length)
  const displayItems = activeConfig.items.slice(0, visibleCount)

  return (
    <Card className={cn('gap-1.5 h-full flex flex-col', className)} style={{ gridArea }}>
      <CardHeader className="px-3 py-0 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <Select
            value={activeView}
            onValueChange={(value) => setActiveView(value as ActivityView)}
          >
            <SelectTrigger
              aria-label="Seleccionar actividad del panel"
              className="h-auto w-fit border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none focus-visible:ring-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="installments">Proximas Cuotas</SelectItem>
              <SelectItem value="projects">Nuevos Proyectos</SelectItem>
              <SelectItem value="payments">Ultimos Pagos</SelectItem>
            </SelectContent>
          </Select>
          {activeConfig.headerRight}
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0 flex-1 flex flex-col min-h-0">
        {activeConfig.items.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4">{activeConfig.emptyMessage}</p>
        ) : (
          <div ref={ref} className="flex-1 overflow-hidden">
            <div className="divide-y">
              {displayItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between w-full py-2 px-4">
                  <div className="flex items-center">{item.left}</div>
                  {item.right}
                </div>
              ))}
            </div>
          </div>
        )}
        <Link
          href={activeConfig.linkHref}
          className="flex items-center gap-1 text-sm text-primary hover:underline mt-1 px-4 shrink-0"
        >
          {activeConfig.linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
