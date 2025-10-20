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
  PaymentMethodForm,
  type PaymentMethodFormHandle,
} from '@/components/forms/settings/payment-method-form'
import {
  type PaymentMethodFormValues,
  type PaymentMethod,
  formValuesToPayload,
  methodToFormValues,
} from '@/lib/validations/payment-method-validations'

interface PaymentMethodDialogProps {
  mode: 'create' | 'edit'
  method?: PaymentMethod
  onSuccess: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PaymentMethodDialog({
  mode,
  method,
  onSuccess,
  open,
  onOpenChange,
}: PaymentMethodDialogProps) {
  const { toast } = useToast()
  const formRef = React.useRef<PaymentMethodFormHandle>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Early return si method no está presente en modo edit
  if (mode === 'edit' && !method) {
    return null
  }

  const handleSubmit = async (data: PaymentMethodFormValues) => {
    setIsSubmitting(true)

    try {
      const payload = formValuesToPayload(data)

      const url = mode === 'create' ? '/api/payment-methods' : `/api/payment-methods/${method?.id}`
      const httpMethod = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al procesar la solicitud')
      }

      toast({
        title: mode === 'create' ? 'Método creado' : 'Método actualizado',
        description:
          mode === 'create'
            ? `El método de pago "${data.name}" se creó correctamente`
            : `El método de pago "${data.name}" se actualizó correctamente`,
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
          <DialogTitle>
            {mode === 'create' ? 'Crear Nuevo Método de Pago' : 'Editar Método de Pago'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Agrega un nuevo método de pago para registrar tus transacciones'
              : 'Modifica la configuración del método de pago'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PaymentMethodForm
            ref={formRef}
            onSubmit={handleSubmit}
            defaultValues={mode === 'edit' && method ? methodToFormValues(method) : undefined}
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
                ? 'Crear Método'
                : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
