'use client'

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, DollarSign } from 'lucide-react'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PaymentToCustomerDialog } from '@/components/dialogs/payments/payment-to-customer-dialog'

export interface Customer {
  id: string
  name: string
  phone: string // Obligatorio
  email: string | null // Opcional
}

// Componente para las acciones de cada customer
function CustomerActionsCell({ customer }: { customer: Customer }) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  return (
    <>
      <DataTableDropdown>
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => customer.email && navigator.clipboard.writeText(customer.email)}
          disabled={!customer.email}
        >
          Copiar correo
        </DropdownMenuItem>

        {/* Registrar pago */}
        <DropdownMenuItem onClick={() => setPaymentDialogOpen(true)}>
          <DollarSign className="mr-2 h-4 w-4" />
          Registrar pago
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DataTableDropdown>

      {/* Dialog para registrar pago */}
      <PaymentToCustomerDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        preselectedCustomerId={customer.id}
      />
    </>
  )
}

export const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
  },
  {
    accessorKey: 'phone',
    header: 'Telefono',
  },
  {
    accessorKey: 'email',
    header: 'Correo',
  },
  {
    id: 'actions',
    cell: ({ row }) => <CustomerActionsCell customer={row.original} />,
  },
]
