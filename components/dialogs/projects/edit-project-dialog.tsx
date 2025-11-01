'use client'

import * as React from 'react'
import { ProjectDialog } from '@/components/dialogs/projects/project-dialog'
import { type ProjectFormData } from '@/lib/validations/project-validations'
import { useProject, useUpdateProject } from '@/hooks/queries/use-projects'

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
  // ✅ React Query hooks reemplazan fetch manual
  const { data: project, isLoading } = useProject(open ? projectId : undefined)
  const updateMutation = useUpdateProject()

  // Transformar datos del API al formato del formulario
  const defaultValues = React.useMemo(() => {
    if (!project) return undefined

    return {
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
    }
  }, [project])

  const handleSubmit = async (data: ProjectFormData) => {
    // Calcular total antes de enviar al backend
    const tax = data.subtotal * (data.taxRate / 100)
    const total = data.subtotal + tax

    // ✅ Mutation hook maneja loading, errores, invalidación y toast
    await updateMutation.mutateAsync({
      id: projectId,
      ...data,
      total,
      totalAmount: total,
    })

    onOpenChange(false)
    onProjectUpdated?.()
  }

  // No renderizar dialog hasta que los datos estén cargados
  if (open && isLoading) {
    return null
  }

  return (
    <ProjectDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      defaultValues={defaultValues}
      mode="edit"
    />
  )
}
