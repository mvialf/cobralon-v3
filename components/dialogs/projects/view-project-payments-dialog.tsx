'use client'

import { useCallback, useEffect, useState } from 'react'
import { DialogDescription } from '@/components/ui/dialog'
import { PaymentSummaryCard } from '@/components/summarys/payment-summary-card'
import { ProjectPaymentsTable } from '@/components/tables/project-payments-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { CaptureDialog } from '@/components/custom/capture-dialog'

interface ViewProjectPaymentsDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProjectPaymentData {
  totalAmount: number | null
  currency: string
  projectNumber: string
  projectName?: string | null
  customerName: string
  totalPaid: number // ← Calculado en backend
  balance: number // ← Calculado en backend
  percentPaid: number // ← Calculado en backend
}

/**
 * Dialog para visualizar pagos de un proyecto
 *
 * Refactorizado para usar <CaptureDialog> component
 */
export function ViewProjectPaymentsDialog({
  projectId,
  open,
  onOpenChange,
}: ViewProjectPaymentsDialogProps) {
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
        projectName: data.projectName,
        customerName: data.customer.name,
        totalPaid: data.totalPaid, // ← Viene del backend
        balance: data.balance, // ← Viene del backend
        percentPaid: data.percentPaid, // ← Viene del backend
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
    <CaptureDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Estado de Cuenta"
      isLoading={isLoading}
      getFallbackText={() => {
        if (!project) return 'No hay datos del proyecto'

        return `
ESTADO DE CUENTA
Proyecto: ${project.projectNumber}
Cliente: ${project.customerName}
${project.projectName ? `Nombre: ${project.projectName}` : ''}
Total Proyecto: ${project.totalAmount?.toLocaleString()} ${project.currency}
Total Pagado: ${project.totalPaid.toLocaleString()} ${project.currency}
Saldo Pendiente: ${project.balance.toLocaleString()} ${project.currency}
Porcentaje Pagado: ${project.percentPaid}%
        `.trim()
      }}
    >
      <div className="text-xl font-semibold text-capture-foreground px-4 py-2 ">
        {/* Header con información del proyecto */}
        <div className="px-4">
          <div className="flex items-center justify-between text-capture-foreground">
            <span className="whitespace-nowrap">ESTADO DE CUENTA</span>
            <span className="text-xs font-normal whitespace-nowrap">
              {formatDate(new Date(), 'short')}
            </span>
          </div>
        </div>
        {isLoading ? (
          <div className="px-4">
            <DialogDescription className="text-capture-foreground">Cargando...</DialogDescription>
          </div>
        ) : project ? (
          <div className="px-4 py-2 border-b border-t border-capture-border">
            <ProjectNameSummary
              projectId={projectId}
              className="text-capture-foreground"
              projectNumber={project.projectNumber}
              customerName={project.customerName}
              projectName={project.projectName}
            />
          </div>
        ) : null}

        {/* Contenido: Summary + Tabla */}
        {isLoading ? (
          <div className="space-y-4 py-6 px-4">
            <Skeleton className="h-32 w-full bg-capture-bg" />
            <Skeleton className="h-64 w-full bg-capture-bg" />
          </div>
        ) : project ? (
          <div className="space-y-4 py-4 px-4">
            {/* Resumen de Pagos */}
            <PaymentSummaryCard
              totalAmount={project.totalAmount}
              currency={project.currency}
              totalPaid={project.totalPaid}
              balance={project.balance}
              percentPaid={project.percentPaid}
            />

            {/* Tabla de Pagos */}
            <div className="px-0">
              <ProjectPaymentsTable projectId={projectId} hidePaymentMethod />
            </div>
          </div>
        ) : null}
      </div>
    </CaptureDialog>
  )
}
