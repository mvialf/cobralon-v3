'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PaymentForm } from '@/components/forms/payments/payment-form'
import { formValuesToPayload, type PaymentFormData } from '@/lib/validations/payment-validations'
import { toast } from 'sonner'

interface PaymentDialogProps {
  /**
   * Customer ID para asociar el pago
   */
  customerId: string

  /**
   * Nombre del cliente (para mostrar en el form)
   */
  customerName: string

  /**
   * Trigger element (ej: Button)
   */
  children: React.ReactNode

  /**
   * Callback cuando el pago se crea exitosamente
   */
  onSuccess?: () => void
}

/**
 * Dialog para registrar un nuevo pago
 *
 * Envuelve el PaymentForm y maneja:
 * - Submit del formulario
 * - Llamada a API POST /api/payments
 * - Toast de success/error
 * - Cierre del dialog al éxito
 * - Callback onSuccess para refetch de datos
 *
 * @example
 * <PaymentDialog customerId={customer.id} customerName={customer.name} onSuccess={refetch}>
 *   <Button>Registrar Pago</Button>
 * </PaymentDialog>
 */
export function PaymentDialog({
  customerId,
  customerName,
  children,
  onSuccess,
}: PaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true)

    try {
      const payload = formValuesToPayload(data)

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al registrar el pago')
      }

      // Success
      toast.success('Pago registrado exitosamente', {
        description: `Monto: ${data.currency} ${data.amount.toLocaleString()}`,
      })

      setIsOpen(false) // Cerrar dialog

      // Callback para refetch de datos en el componente padre
      onSuccess?.()
    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error('Error al registrar el pago', {
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Pago</DialogTitle>
          <DialogDescription>
            Registra un pago confirmado para <strong>{customerName}</strong>. Puedes asignarlo a un
            proyecto (1:1) o distribuirlo entre varios (1:N).
          </DialogDescription>
        </DialogHeader>

        <PaymentForm
          customerId={customerId}
          customerName={customerName}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
