'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'
import { Skeleton } from '@/components/ui/skeleton'

interface ViewProjectPaymentsSheetProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProjectPaymentData {
  totalAmount: number | null
  currency: string
  projectNumber: string
}

/**
 * Sheet lateral para visualizar pagos de un proyecto
 */
export function ViewProjectPaymentsSheet({
  projectId,
  open,
  onOpenChange,
}: ViewProjectPaymentsSheetProps) {
  const [project, setProject] = useState<ProjectPaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchProjectPaymentData = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)

      if (!response.ok) {
        throw new Error('Error al cargar proyecto')
      }

      const data = await response.json()
      setProject({
        totalAmount: data.totalAmount,
        currency: data.currency,
        projectNumber: data.projectNumber,
      })
    } catch (error) {
      console.error('Error fetching project payment data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open && projectId) {
      fetchProjectPaymentData()
    }
  }, [open, projectId, fetchProjectPaymentData])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isLoading ? 'Cargando...' : `Pagos - Proyecto ${project?.projectNumber || ''}`}
          </SheetTitle>
          <SheetDescription>Historial y estado de pagos del proyecto</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-6 py-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : project ? (
          <div className="space-y-6 py-6">
            {/* Resumen de Pagos */}
            <PaymentSummaryCard
              projectId={projectId}
              totalAmount={project.totalAmount}
              currency={project.currency}
            />

            {/* Tabla de Pagos */}
            <div className="overflow-x-auto">
              <ProjectPaymentsTable projectId={projectId} />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
