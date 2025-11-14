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

export function NewCustomerDialog() {
  const [open, setOpen] = useState(false)
  const createCustomer = useCreateCustomer()

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      await createCustomer.mutateAsync(data)
      setOpen(false) // Cerrar dialog solo si fue exitoso
    } catch (error) {
      // Error ya manejado por el hook (toast automático)
      console.error('Error creating customer:', error)
      // No cerrar el dialog para que el usuario pueda corregir
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </DialogTrigger>
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
