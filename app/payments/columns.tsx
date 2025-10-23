'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Eye, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { toast } from 'sonner'

export interface Payment {
  id: string
  type: 'Project' | 'Customer' // ← NUEVO: Tipo de pago
  amount: number
  currency: string
  date: string
  reference: string | null
  status: string
  customer: {
    id: string
    name: string
  }
  paymentMethod: {
    id: string
    name: string
  }
  allocations: Array<{
    id: string
    allocatedAmount: number
    project: {
      id: string
      projectNumber: string
      projectName: string | null
    }
  }>
}

interface ColumnsProps {
  onPaymentUpdated?: () => void
  onViewDetails?: (payment: Payment) => void
}

export const createColumns = ({
  onPaymentUpdated,
  onViewDetails,
}: ColumnsProps = {}): ColumnDef<Payment>[] => [
  // Cliente/Proyecto (fusionado)
  {
    id: 'associated',
    accessorFn: (row) => {
      // Para sorting: extraer nombre relevante
      if (row.type === 'Customer') {
        return row.customer.name
      }
      if (row.type === 'Project' && row.allocations.length === 1) {
        return row.allocations[0].project.projectName || row.allocations[0].project.projectNumber
      }
      return ''
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente/Proyecto" />,
    cell: ({ row }) => {
      const payment = row.original

      // Customer payment → customer name
      if (payment.type === 'Customer') {
        return <span className="font-medium">{payment.customer.name}</span>
      }

      // Project payment 1:1 → ProjectNameSummary
      if (payment.type === 'Project' && payment.allocations.length === 1) {
        const project = payment.allocations[0].project
        return (
          <ProjectNameSummary
            projectNumber={project.projectNumber}
            customerName={payment.customer.name}
            projectName={project.projectName}
          />
        )
      }

      // Project payment 1:N → vacío
      return <span className="text-muted-foreground">-</span>
    },
  },

  // Tipo (NUEVO)
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('type') as 'Project' | 'Customer'

      return (
        <StatusBadge
          bgClass={type === 'Project' ? 'bg-blue-500' : 'bg-green-500'}
          label={type === 'Project' ? 'Proyecto' : 'Cliente'}
        />
      )
    },
    filterFn: (row, _id, filterValue) => {
      const type = row.getValue('type') as string
      return filterValue.includes(type)
    },
  },

  // Método de Pago
  {
    accessorKey: 'paymentMethod.name',
    id: 'paymentMethodName',
    header: 'Método',
    cell: ({ row }) => row.original.paymentMethod.name,
    filterFn: (row, _id, filterValue) => {
      const methodName = row.original.paymentMethod.name
      return filterValue.includes(methodName)
    },
  },

  // Monto
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monto" className="justify-end" />
    ),
    cell: ({ row }) => {
      const payment = row.original
      const formatted = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: payment.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(payment.amount)
      return <div className="text-right font-semibold">{formatted}</div>
    },
  },

  // Fecha
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('date'))
      return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date)
    },
  },

  // Acciones
  {
    id: 'actions',
    cell: ({ row }) => {
      const payment = row.original
      const isCustomerPayment = payment.type === 'Customer'

      const handleDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar este pago de ${payment.customer.name}?`)) {
          return
        }

        try {
          const response = await fetch(`/api/payments/${payment.id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Error al eliminar pago')
          }

          toast.success('Pago eliminado exitosamente')
          onPaymentUpdated?.()
        } catch (error) {
          console.error('Error al eliminar pago:', error)
          toast.error(error instanceof Error ? error.message : 'Error al eliminar pago')
        }
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>

            {/* Ver detalles: SOLO para pagos 1:N */}
            {isCustomerPayment && (
              <>
                <DropdownMenuItem onClick={() => onViewDetails?.(payment)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Eliminar pago */}
            <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
              <XCircle className="mr-2 h-4 w-4" />
              Eliminar pago
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
