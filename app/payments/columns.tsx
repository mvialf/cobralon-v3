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
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { toast } from 'sonner'

export interface Payment {
  id: string
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
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('date'))
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },
  },
  {
    accessorKey: 'customer.name',
    id: 'customerName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => <span className="font-medium">{row.original.customer.name}</span>,
  },
  {
    id: 'projects',
    header: 'Proyectos',
    cell: ({ row }) => {
      const payment = row.original
      return (
        <div className="flex flex-col gap-1">
          {payment.allocations.map((alloc) => (
            <div key={alloc.id} className="text-sm">
              <span className="font-medium">{alloc.project.projectNumber}</span>
              {alloc.project.projectName && (
                <span className="text-muted-foreground"> - {alloc.project.projectName}</span>
              )}
              <span className="ml-2 text-xs text-muted-foreground">
                (
                {new Intl.NumberFormat('es-CL', {
                  style: 'currency',
                  currency: payment.currency,
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(alloc.allocatedAmount)}
                )
              </span>
            </div>
          ))}
        </div>
      )
    },
  },
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
  {
    accessorKey: 'reference',
    header: 'Referencia',
    cell: ({ row }) => {
      const ref = row.getValue('reference') as string | null
      return (
        <span className={ref ? 'max-w-[150px] truncate' : 'text-muted-foreground'}>
          {ref || '-'}
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return status === 'ACTIVE' ? (
        <Badge variant="default" className="bg-green-600">
          Activo
        </Badge>
      ) : (
        <Badge variant="destructive">Anulado</Badge>
      )
    },
    filterFn: (row, _id, filterValue) => {
      const status = row.getValue('status') as string
      return filterValue.includes(status)
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const payment = row.original

      const handleCancel = async () => {
        if (!confirm(`¿Estás seguro de anular este pago de ${payment.customer.name}?`)) {
          return
        }

        try {
          const response = await fetch(`/api/payments/${payment.id}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reason: 'Anulado desde interfaz web',
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Error al anular pago')
          }

          toast.success('Pago anulado exitosamente')
          onPaymentUpdated?.()
        } catch (error) {
          console.error('Error al anular pago:', error)
          toast.error(error instanceof Error ? error.message : 'Error al anular pago')
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
            <DropdownMenuItem onClick={() => onViewDetails?.(payment)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {payment.status === 'ACTIVE' && (
              <DropdownMenuItem className="text-destructive" onClick={handleCancel}>
                <XCircle className="mr-2 h-4 w-4" />
                Anular pago
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
