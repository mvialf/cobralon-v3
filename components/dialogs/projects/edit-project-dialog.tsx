'use client'

import * as React from 'react'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { toast } from 'sonner'

interface EditProjectDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectUpdated?: () => void
}

/**
 * Dialog controlado para editar un proyecto existente
 *
 * Carga datos del proyecto desde API, permite edición y actualiza via PUT
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false)
 *
 * <EditProjectDialog
 *   projectId={project.id}
 *   open={open}
 *   onOpenChange={setOpen}
 *   onProjectUpdated={() => refetch()}
 * />
 * ```
 */
export function EditProjectDialog({
  projectId,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const [defaultValues, setDefaultValues] = React.useState<Partial<ProjectFormData>>()

  // Cargar datos del proyecto cuando se abre el dialog
  const loadProjectData = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        throw new Error('Error al cargar proyecto')
      }

      const project = await response.json()

      // Transformar datos del API al formato del formulario
      setDefaultValues({
        customerId: project.customer.id,
        projectNumber: project.projectNumber,
        projectName: project.projectName || '',
        phone: project.phone,
        street: project.street,
        apartment: project.apartment || '',
        comuna: project.comuna,
        region: project.region,
        projectStatusId: project.projectStatus?.id || '',
        date: new Date(project.date),
        subtotal: Number(project.subtotal),
        taxRate: Number(project.taxRate),
        currency: project.currency,
        windowsCount: project.windowsCount,
        squareMeters: Number(project.squareMeters),
        description: project.description || '',
      })
    } catch (error) {
      console.error('Error al cargar proyecto:', error)
      toast.error('Error al cargar los datos del proyecto')
      onOpenChange(false)
    }
  }, [projectId, onOpenChange])

  React.useEffect(() => {
    if (open && !defaultValues) {
      loadProjectData()
    }
  }, [open, defaultValues, loadProjectData])

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      // Calcular total antes de enviar al backend
      const tax = data.subtotal * (data.taxRate / 100)
      const total = data.subtotal + tax

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          total,
          totalAmount: total,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar proyecto')
      }

      toast.success('Proyecto actualizado exitosamente')
      onOpenChange(false)
      setDefaultValues(undefined) // Reset para forzar recarga en próxima apertura
      onProjectUpdated?.()
    } catch (error) {
      console.error('Error al actualizar proyecto:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar proyecto')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Si se cierra, limpiar defaultValues para forzar recarga
    if (!newOpen) {
      setDefaultValues(undefined)
    }
    onOpenChange(newOpen)
  }

  return (
    <ProjectDialog
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      mode="edit"
    />
  )
}
