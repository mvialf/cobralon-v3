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
import { toast } from 'sonner'

import {
  AftersaleForm,
  type AftersaleFormHandle,
} from '@/components/forms/aftersales/aftersale-form'
import {
  type AftersaleFormValues,
  type Aftersale,
  formValuesToPayload,
  aftersaleToFormValues,
} from '@/lib/validations/aftersale-validations'

interface AftersaleDialogProps {
  mode: 'create' | 'edit'
  aftersale?: Aftersale
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AftersaleDialog({
  mode,
  aftersale,
  onSuccess,
  open,
  onOpenChange,
}: AftersaleDialogProps) {
  const formRef = React.useRef<AftersaleFormHandle>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Early return si aftersale no está presente en modo edit
  if (mode === 'edit' && !aftersale) {
    return null
  }

  const handleSubmit = async (data: AftersaleFormValues) => {
    setIsSubmitting(true)

    try {
      const payload = formValuesToPayload(data)

      const url = mode === 'create' ? '/api/aftersales' : `/api/aftersales/${aftersale?.id}`
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

      toast.success(
        mode === 'create'
          ? 'El caso de postventa se creó correctamente'
          : 'El caso de postventa se actualizó correctamente'
      )

      onSuccess()
      onOpenChange?.(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar la solicitud')
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nuevo Caso de Postventa' : 'Editar Caso de Postventa'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Registra un nuevo problema o incidencia en un proyecto finalizado'
              : 'Modifica la información del caso de postventa'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AftersaleForm
            ref={formRef}
            onSubmit={handleSubmit}
            defaultValues={
              mode === 'edit' && aftersale ? aftersaleToFormValues(aftersale) : undefined
            }
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
                ? 'Crear Caso'
                : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
