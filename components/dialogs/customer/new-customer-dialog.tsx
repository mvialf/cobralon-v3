'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CustomerForm } from '@/components/forms/customer/customer-form'
import { type CustomerFormData } from '@/lib/validations/customer-validations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface NewCustomerDialogProps {
  onCustomerCreated?: (customer: CustomerFormData) => void
}

export function NewCustomerDialog({ onCustomerCreated }: NewCustomerDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSubmit = (data: CustomerFormData) => {
    console.log('Nuevo cliente:', data)

    // Aqui iria la llamada a tu API
    // await fetch('/api/customers', { method: 'POST', body: JSON.stringify(data) })

    onCustomerCreated?.(data)
    setOpen(false)
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
        <CustomerForm onSubmit={handleSubmit} submitLabel="Crear Cliente" />
      </DialogContent>
    </Dialog>
  )
}
