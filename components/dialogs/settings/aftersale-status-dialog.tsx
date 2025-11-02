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
  AftersaleStatusForm,
  type AftersaleStatusFormHandle,
} from '@/components/forms/settings/aftersale-status-form'
import {
  type AftersaleStatusFormValues,
  type AftersaleStatus,
  type BadgeColor,
  formValuesToPayload,
  statusToFormValues,
} from '@/lib/validations/aftersale-status-validations'

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
  const { toast } = useToast()
  const formRef = React.useRef<AftersaleStatusFormHandle>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Early return si status no está presente en modo edit
  // Esto previene renders con data incompleta durante race conditions
  if (mode === 'edit' && !status) {
    return null
  }

  const handleSubmit = async (data: AftersaleStatusFormValues) => {
    setIsSubmitting(true)

    try {
      // Determinar isInitial/isFinal según el modo:
      // - CREATE: Siempre estado normal (isInitial: false, isFinal: false)
      // - EDIT: Preservar el tipo actual del status
      const isInitial = mode === 'edit' ? status!.isInitial : false
      const isFinal = mode === 'edit' ? status!.isFinal : false

      const payload = formValuesToPayload(data, isInitial, isFinal)

      const url =
        mode === 'create' ? '/api/aftersale-status' : `/api/aftersale-status/${status?.id}`
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
              ? 'Agrega un nuevo estado para clasificar casos de postventa'
              : 'Modifica el nombre o color del estado'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AftersaleStatusForm
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
