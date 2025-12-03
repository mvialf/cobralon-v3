'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CustomerForm } from '@/components/forms/customer/customer-form'
import { type CustomerFormData } from '@/lib/validations/customer-validations'
import { useCreateCustomer } from '@/hooks/queries/use-customers'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
}

interface NewCustomerDialogProps {
  /** Control externo del estado open (opcional) */
  open?: boolean
  /** Callback para control externo del estado open (opcional) */
  onOpenChange?: (open: boolean) => void
  /** Callback cuando se crea un cliente exitosamente */
  onCustomerCreated?: (customer: Customer) => void
  /** Trigger custom. Si no se provee y no hay control externo, usa Button por defecto */
  trigger?: React.ReactNode
}

export function NewCustomerDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCustomerCreated,
  trigger,
}: NewCustomerDialogProps = {}) {
  // Estado interno (fallback si no hay control externo)
  const [internalOpen, setInternalOpen] = useState(false)

  // Determinar si está controlado externamente
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen

  const createCustomer = useCreateCustomer()

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      const newCustomer = await createCustomer.mutateAsync(data)
      setOpen(false) // Cerrar dialog solo si fue exitoso
      // Notificar al padre con el cliente creado
      onCustomerCreated?.(newCustomer as Customer)
    } catch (error) {
      // Error ya manejado por el hook (toast automático)
      console.error('Error creating customer:', error)
      // No cerrar el dialog para que el usuario pueda corregir
    }
  }

  // Determinar si mostrar trigger (solo si no está controlado externamente o si hay trigger custom)
  const showTrigger = !isControlled || trigger

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo cliente. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          onSubmit={handleSubmit}
          submitLabel="Crear Cliente"
          isSubmitting={createCustomer.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
