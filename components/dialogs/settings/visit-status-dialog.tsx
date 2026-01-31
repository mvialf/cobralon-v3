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
import { useCreateVisitStatus, useUpdateVisitStatus } from '@/hooks/queries/use-visit-statuses'

import {
  VisitStatusForm,
  type VisitStatusFormHandle,
} from '@/components/forms/settings/visit-status-form'
import {
  type VisitStatusFormValues,
  type VisitStatus,
  type BadgeColor,
  formValuesToPayload,
  statusToFormValues,
} from '@/lib/validations/visit-status-validations'

interface VisitStatusDialogProps {
  mode: 'create' | 'edit'
  status?: VisitStatus
  badgeColors: BadgeColor[]
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VisitStatusDialog({
  mode,
  status,
  badgeColors,
  onSuccess,
  open,
  onOpenChange,
}: VisitStatusDialogProps) {
  const formRef = React.useRef<VisitStatusFormHandle>(null)
  const createMutation = useCreateVisitStatus()
  const updateMutation = useUpdateVisitStatus()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (mode === 'edit' && !status) {
    return null
  }

  const handleSubmit = async (data: VisitStatusFormValues) => {
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
              ? 'Agrega un nuevo estado para clasificar tus visitas'
              : 'Modifica el nombre o color del estado'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <VisitStatusForm
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
