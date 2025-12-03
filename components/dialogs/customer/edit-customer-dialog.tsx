'use client'

import { CustomerForm } from '@/components/forms/customer/customer-form'
import { type CustomerFormData } from '@/lib/validations/customer-validations'
import { useUpdateCustomer } from '@/hooks/queries/use-customers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface CustomerData {
  id: string
  name: string
  phone: string
  email: string | null
}

interface EditCustomerDialogProps {
  /** Cliente a editar */
  customer: CustomerData
  /** Estado de apertura del dialog */
  open: boolean
  /** Callback para cambiar el estado de apertura */
  onOpenChange: (open: boolean) => void
  /** Callback cuando se actualiza el cliente exitosamente */
  onCustomerUpdated?: () => void
}

/**
 * Dialog para editar un cliente existente
 *
 * Reutiliza CustomerForm con valores iniciales del cliente
 *
 * @example
 * ```tsx
 * const [editDialogOpen, setEditDialogOpen] = useState(false)
 *
 * <EditCustomerDialog
 *   customer={selectedCustomer}
 *   open={editDialogOpen}
 *   onOpenChange={setEditDialogOpen}
 *   onCustomerUpdated={() => refetch()}
 * />
 * ```
 */
export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  onCustomerUpdated,
}: EditCustomerDialogProps) {
  const updateCustomer = useUpdateCustomer()

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
      })
      onOpenChange(false) // Cerrar dialog solo si fue exitoso
      onCustomerUpdated?.()
    } catch (error) {
      // Error ya manejado por el hook (toast automático)
      console.error('Error updating customer:', error)
      // No cerrar el dialog para que el usuario pueda corregir
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifica los datos del cliente. Haz clic en guardar cuando termines.
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          onSubmit={handleSubmit}
          defaultValues={{
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
          }}
          submitLabel="Guardar cambios"
          isSubmitting={updateCustomer.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
