'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { type ProjectAdjustmentFormValues } from '@/lib/validations/project-adjustment-validations'
import { formatCurrency } from '@/lib/format'

import { ProjectAdjustmentForm } from '@/components/forms/projects/project-adjustment-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface ProjectAdjustmentDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ProjectData {
  projectNumber: string
  projectName: string | null
  customerName: string
  balance: number
  currency: string
}

/**
 * Dialog para aplicar un ajuste a un proyecto
 *
 * Maneja:
 * - Fetch de datos del proyecto (balance actual)
 * - Submit del formulario de ajuste
 * - POST a /api/projects/[id]/adjustments
 * - Toast de success/error
 * - Callback onSuccess (para refetch tabla)
 */
export function ProjectAdjustmentDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: ProjectAdjustmentDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [project, setProject] = useState<ProjectData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch datos del proyecto cuando se abre el dialog
  const fetchProject = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error('Error al cargar datos del proyecto')
      }

      const data = await response.json()
      setProject({
        projectNumber: data.projectNumber,
        projectName: data.projectName,
        customerName: data.customer.name,
        balance: data.balance,
        currency: data.currency,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open && projectId) {
      fetchProject()
    }
  }, [open, projectId, fetchProject])

  const handleSubmit = async (values: ProjectAdjustmentFormValues) => {
    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/projects/${projectId}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al aplicar el ajuste')
      }

      // Success
      toast.success('Ajuste aplicado exitosamente', {
        description: `Se aplicó un ajuste de ${formatCurrency(values.amount, project?.currency || 'CLP')} al proyecto ${project?.projectNumber}`,
      })

      // Cerrar dialog
      onOpenChange(false)

      // Callback para refetch
      onSuccess?.()

      // Refresh para actualizar data
      router.refresh()
    } catch (err) {
      console.error('Error applying adjustment:', err)
      toast.error('Error al aplicar el ajuste', {
        description: err instanceof Error ? err.message : 'Ocurrió un error inesperado',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Si el balance es 0, mostrar mensaje especial
  const hasZeroBalance = project && project.balance <= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar Ajuste</DialogTitle>
          <DialogDescription>
            {project
              ? `${project.projectNumber} - ${project.customerName}`
              : 'Cargando proyecto...'}
          </DialogDescription>
        </DialogHeader>

        {/* Estado de carga */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Balance en cero - No permite ajuste */}
        {hasZeroBalance && !isLoading && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Proyecto sin saldo pendiente</AlertTitle>
            <AlertDescription>
              Este proyecto tiene un balance de {formatCurrency(project.balance, project.currency)}.
              No es posible aplicar ajustes.
            </AlertDescription>
          </Alert>
        )}

        {/* Formulario */}
        {project && !isLoading && !error && !hasZeroBalance && (
          <ProjectAdjustmentForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            currentBalance={project.balance}
            currency={project.currency}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
