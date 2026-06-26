'use client'

import { ArrowRight, Bookmark } from 'lucide-react'
import Link from 'next/link'
import useMeasure from 'react-use-measure'

import { DashboardAmountStack } from '@/components/summarys/dashboard-amount-stack'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

const ITEM_HEIGHT = 52

export interface DashboardFollowUpProject {
  id: string
  projectNumber: string
  projectName: string | null
  customerName: string
  totalAmount: number
  balance: number
}

interface DashboardFollowUpListProps {
  projects: DashboardFollowUpProject[]
  gridArea: string
  className?: string
}

export function DashboardFollowUpList({
  projects,
  gridArea,
  className,
}: DashboardFollowUpListProps) {
  const [ref, bounds] = useMeasure()
  const visibleCount =
    bounds.height > 0
      ? Math.max(1, Math.floor(bounds.height / ITEM_HEIGHT))
      : Math.min(5, projects.length)
  const displayProjects = projects.slice(0, visibleCount)

  return (
    <Card
      className={cn('gap-1.5 h-full flex flex-col overflow-hidden', className)}
      style={{ gridArea }}
    >
      <CardHeader className="px-3 py-0 shrink-0">
        <CardTitle className="flex items-center justify-between gap-3 text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            Seguimiento
          </span>
          {projects.length > 0 && (
            <span className="text-sm font-medium text-foreground">{projects.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0 flex-1 flex flex-col min-h-0">
        {projects.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-4">
            <Bookmark className="h-4 w-4" />
            Sin proyectos en seguimiento
          </div>
        ) : (
          <div ref={ref} className="flex-1 overflow-hidden">
            <div className="divide-y">
              {displayProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between w-full py-2 px-4"
                >
                  <div className="min-w-0 flex items-center">
                    <ProjectNameSummary
                      projectId={project.id}
                      projectNumber={project.projectNumber}
                      customerName={project.customerName}
                      projectName={project.projectName}
                      size="xs"
                      variant="dashboard"
                    />
                  </div>
                  <DashboardAmountStack
                    primary={formatCurrency(project.balance)}
                    secondary={`Total ${formatCurrency(project.totalAmount)}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-primary hover:underline mt-1 px-4 shrink-0"
        >
          Ver todos los proyectos <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
