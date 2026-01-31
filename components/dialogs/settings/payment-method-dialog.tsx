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
import { useCreatePaymentMethod, useUpdatePaymentMethod } from '@/hooks/queries/use-payment-methods'

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
  const formRef = React.useRef<PaymentMethodFormHandle>(null)
  const createMutation = useCreatePaymentMethod()
  const updateMutation = useUpdatePaymentMethod()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  if (mode === 'edit' && !method) {
    return null
  }

  const handleSubmit = async (data: PaymentMethodFormValues) => {
    const payload = formValuesToPayload(data)

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
      } else {
        await updateMutation.mutateAsync({ id: method!.id, ...payload })
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
