'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, FileSearch } from 'lucide-react'

import {
  ProjectFinancialAuditTable,
  type ProjectFinancialAuditTableApplication,
} from '@/components/tables/project-financial-audit-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'

type ProjectFinancialAuditResponse = {
  project: {
    id: string
    projectNumber: string
    projectName: string | null
    totalAmount: number
    currency: string
    customer: { id: string; name: string; phone: string }
  }
  financials: {
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
  applications: ProjectFinancialAuditTableApplication[]
}

function SummaryAmount({
  label,
  value,
  currency,
}: {
  label: string
  value: number
  currency: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{formatCurrency(value, currency)}</p>
    </div>
  )
}

function AuditSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function ProjectFinancialAuditDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [audit, setAudit] = useState<ProjectFinancialAuditResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAudit = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/financial-audit`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar auditoria financiera')
      }

      setAudit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar auditoria financiera')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open && projectId) {
      fetchAudit()
    }
  }, [open, projectId, fetchAudit])

  useEffect(() => {
    if (!open) {
      setAudit(null)
      setError(null)
    }
  }, [open])

  const currency = audit?.project.currency ?? 'CLP'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Auditoria financiera
          </DialogTitle>
          <DialogDescription>
            {audit
              ? `P-${audit.project.projectNumber} - ${audit.project.customer.name}`
              : 'Trazabilidad read-only de aplicaciones financieras del proyecto.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <AuditSkeleton />
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se pudo cargar la auditoria</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : audit ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">P-{audit.project.projectNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {audit.project.projectName ?? audit.project.customer.name}
                  </p>
                </div>
                <span className="w-fit rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                  ProjectFinancials
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <SummaryAmount
                  label="Total proyecto"
                  value={audit.project.totalAmount}
                  currency={currency}
                />
                <SummaryAmount
                  label="Efectivo"
                  value={audit.financials.appliedCashTotal}
                  currency={currency}
                />
                <SummaryAmount
                  label="Credito"
                  value={audit.financials.appliedCreditTotal}
                  currency={currency}
                />
                <SummaryAmount
                  label="Ajustes"
                  value={audit.financials.adjustmentTotal}
                  currency={currency}
                />
                <SummaryAmount
                  label="Aplicado"
                  value={audit.financials.settledTotal}
                  currency={currency}
                />
                <SummaryAmount
                  label="Balance"
                  value={audit.financials.balance}
                  currency={currency}
                />
              </div>
            </div>

            <ProjectFinancialAuditTable applications={audit.applications} currency={currency} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
