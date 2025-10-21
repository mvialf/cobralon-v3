'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  type PaymentToCustomerFormValues,
  paymentToCustomerToPayload,
} from '@/lib/validations/payment-validations'

import { PaymentToCustomerForm } from '@/components/forms/payments/payment-to-customer-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PaymentToCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Dialog para registro de "Pago a Cliente" (1:N)
 *
 * Maneja:
 * - Apertura/cierre del dialog
 * - Submit del formulario
 * - POST a /api/payments
 * - Toast de success/error
 * - Callback onSuccess (para refetch)
 */
export function PaymentToCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
}: PaymentToCustomerDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (values: PaymentToCustomerFormValues, currency: string) => {
    try {
      setIsSubmitting(true)

      // Convertir form values a payload del API
      const payload = paymentToCustomerToPayload(values, currency)

      // POST /api/payments
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el pago')
      }

      // Success
      toast.success('Pago registrado exitosamente', {
        description: `Pago de ${currency} ${values.amount.toLocaleString()} distribuido entre ${values.allocations.length} proyecto${values.allocations.length !== 1 ? 's' : ''}`,
      })

      // Cerrar dialog
      onOpenChange(false)

      // Callback para refetch (si existe)
      onSuccess?.()

      // Refresh para actualizar data
      router.refresh()
    } catch (error: any) {
      console.error('Error submitting payment:', error)
      toast.error('Error al registrar el pago', {
        description: error.message || 'Ocurrió un error inesperado',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pago a Cliente</DialogTitle>
          <DialogDescription>
            Registre un pago y distribúyalo entre múltiples proyectos del cliente (FIFO o manual).
          </DialogDescription>
        </DialogHeader>

        <PaymentToCustomerForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  )
}
