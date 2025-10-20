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
import { useToast } from '@/hooks/use-toast'

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
  const { toast } = useToast()
  const formRef = React.useRef<ProjectStatusFormHandle>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Validar que status esté presente en modo edit
  if (mode === 'edit' && !status) {
    throw new Error('ProjectStatusDialog: status es requerido en modo edit')
  }

  const handleSubmit = async (data: ProjectStatusFormValues) => {
    setIsSubmitting(true)

    try {
      const payload = formValuesToPayload(data)

      const url = mode === 'create' ? '/api/project-status' : `/api/project-status/${status?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al procesar la solicitud')
      }

      toast({
        title: mode === 'create' ? 'Estado creado' : 'Estado actualizado',
        description:
          mode === 'create'
            ? `El estado "${data.name}" se creó correctamente`
            : `El estado "${data.name}" se actualizó correctamente`,
      })

      onSuccess()
      onOpenChange?.(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar la solicitud',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
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
              : 'Modifica el nombre, color o tipo del estado'}
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
