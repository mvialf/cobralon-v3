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
  useCreateAftersaleStatus,
  useUpdateAftersaleStatus,
} from '@/hooks/queries/use-aftersale-statuses'

import { StatusForm, type StatusFormHandle } from '@/components/forms/settings/status-form'
import {
  type AftersaleStatus,
  type BadgeColor,
} from '@/lib/validations/aftersale-status-validations'
import {
  type BaseStatusFormValues,
  formValuesToPayload,
  statusToFormValues,
} from '@/lib/validations/base-status-validations'

interface AftersaleStatusDialogProps {
  mode: 'create' | 'edit'
  status?: AftersaleStatus
  badgeColors: BadgeColor[]
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AftersaleStatusDialog({
  mode,
  status,
  badgeColors,
  onSuccess,
  open,
  onOpenChange,
}: AftersaleStatusDialogProps) {
  const formRef = React.useRef<StatusFormHandle>(null)
  const createMutation = useCreateAftersaleStatus()
  const updateMutation = useUpdateAftersaleStatus()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (mode === 'edit' && !status) {
    return null
  }

  const handleSubmit = async (data: BaseStatusFormValues) => {
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
              ? 'Agrega un nuevo estado para clasificar casos de postventa'
              : 'Modifica el nombre o color del estado'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <StatusForm
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
