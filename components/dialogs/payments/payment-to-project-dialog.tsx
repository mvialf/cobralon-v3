'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  type PaymentToProjectFormValues,
  type ProjectWithBalance,
  paymentToProjectToPayload,
} from '@/lib/validations/payment-validations'

import { PaymentToProjectForm } from '@/components/forms/payments/payment-to-project-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PaymentToProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Dialog para registro de "Pago a Proyecto" (1:1)
 *
 * Maneja:
 * - Apertura/cierre del dialog
 * - Submit del formulario
 * - POST a /api/payments
 * - Toast de success/error
 * - Callback onSuccess (para refetch)
 */
export function PaymentToProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: PaymentToProjectDialogProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (values: PaymentToProjectFormValues, project: ProjectWithBalance) => {
    try {
      setIsSubmitting(true)

      // Convertir form values a payload del API
      const payload = paymentToProjectToPayload(values, project)

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
        description: `Pago de ${values.amount} registrado al proyecto ${project.projectNumber}`,
      })

      // Cerrar dialog
      onOpenChange(false)

      // Callback para refetch (si existe)
      onSuccess?.()

      // Refresh para actualizar data
      router.refresh()
    } catch (error: unknown) {
      console.error('Error submitting payment:', error)
      toast.error('Error al registrar el pago', {
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pago a Proyecto</DialogTitle>
          <DialogDescription>
            Registre un pago que se asignará completamente a un proyecto específico.
          </DialogDescription>
        </DialogHeader>

        <PaymentToProjectForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  )
}
