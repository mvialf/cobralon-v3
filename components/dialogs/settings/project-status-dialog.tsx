'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  useCreateProjectStatus,
  useUpdateProjectStatus,
} from '@/hooks/queries/use-project-statuses'

import {
  ProjectStatusForm,
  type ProjectStatusFormHandle,
} from '@/components/forms/settings/project-status-form'
import {
  type ProjectStatusFormValues,
  type ProjectStatus,
  type BadgeColor,
  formValuesToPayload,
  statusToFormValues,
} from '@/lib/validations/project-status-validations'

interface ProjectStatusDialogProps {
  mode: 'create' | 'edit'
  status?: ProjectStatus
  badgeColors: BadgeColor[]
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ProjectStatusDialog({
  mode,
  status,
  badgeColors,
  onSuccess,
  open,
  onOpenChange,
}: ProjectStatusDialogProps) {
  const formRef = React.useRef<ProjectStatusFormHandle>(null)
  const createMutation = useCreateProjectStatus()
  const updateMutation = useUpdateProjectStatus()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (mode === 'edit' && !status) {
    return null
  }

  const handleSubmit = async (data: ProjectStatusFormValues) => {
    const isInitial = mode === 'edit' ? status!.isInitial : false
    const isFinal = mode === 'edit' ? status!.isFinal : false
    const payload = formValuesToPayload(data, isInitial, isFinal)

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
      } else {
        await updateMutation.mutateAsync({ id: status!.id, ...payload })
      }
      onSuccess()
      onOpenChange?.(false)
    } catch {
      // Error ya manejado por el hook (toast automático)
    }
  }

  const handleSave = () => {
    formRef.current?.submit()
  }

  const handleCancel = () => {
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Crear Nuevo Estado' : 'Editar Estado'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Agrega un nuevo estado para clasificar tus proyectos'
              : 'Modifica el nombre o color del estado'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <ProjectStatusForm
            ref={formRef}
            onSubmit={handleSubmit}
            defaultValues={mode === 'edit' && status ? statusToFormValues(status) : undefined}
            badgeColors={badgeColors}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creando...'
                : 'Guardando...'
              : mode === 'create'
                ? 'Crear Estado'
                : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
