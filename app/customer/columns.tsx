'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export interface Customer {
  id: string
  name: string
  phone: string // Obligatorio
  email: string | null // Opcional
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
    cell: ({ row }) => {
      const customer = row.original

      return (
        <DataTableDropdown>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => customer.email && navigator.clipboard.writeText(customer.email)}
            disabled={!customer.email}
          >
            Copiar correo
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
      )
    },
  },
]
