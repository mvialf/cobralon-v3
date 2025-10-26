'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { CheckCircle } from 'lucide-react'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'

export interface Installment {
  id: string
  installmentNumber: number
  amount: number
  dueDate: string
  paidDate: string | null
  status: string
  payment: {
    id: string
    amount: number
    currency: string
    date: string
    reference: string | null
    status: string
    selectedInstallments: number | null
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
}

interface ColumnsProps {
  onInstallmentUpdated?: () => void
  locale?: string
}

export const createColumns = ({
  onInstallmentUpdated,
  locale = 'es-CL',
}: ColumnsProps = {}): ColumnDef<Installment>[] => [
  {
    accessorKey: 'dueDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('dueDate'))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(date)
      dueDate.setHours(0, 0, 0, 0)
      const isOverdue = dueDate < today && row.original.status === 'pending'

      return (
        <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.getValue('dueDate'), 'short', locale)}
          {isOverdue && <div className="text-xs">Vencido</div>}
        </div>
      )
    },
  },
  {
    accessorKey: 'payment.customer.name',
    id: 'customerName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => <span className="font-medium">{row.original.payment.customer.name}</span>,
  },
  {
    id: 'projects',
    header: 'Proyectos',
    cell: ({ row }) => {
      const payment = row.original.payment
      return (
        <div className="flex flex-col gap-1">
          {payment.allocations.map((alloc) => (
            <div key={alloc.id} className="text-sm">
              <span className="font-medium">{alloc.project.projectNumber}</span>
              {alloc.project.projectName && (
                <span className="text-muted-foreground"> - {alloc.project.projectName}</span>
              )}
            </div>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'installmentNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cuota" />,
    cell: ({ row }) => {
      const total = row.original.payment.selectedInstallments || 1
      return (
        <div className="text-center">
          <div className="font-medium">
            {row.getValue('installmentNumber')} / {total}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Monto" />,
    cell: ({ row }) => {
      const amount = row.getValue('amount') as number
      const currency = row.original.payment.currency
      return (
        <div className="text-right font-medium">
          {new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount)}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge variant={status === 'paid' ? 'success' : 'secondary'}>
          {status === 'paid' ? 'Pagado' : 'Pendiente'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'paidDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha Pago" />,
    cell: ({ row }) => {
      const paidDate = row.getValue('paidDate') as string | null
      if (!paidDate) return <span className="text-muted-foreground text-sm">-</span>

      return <div className="text-sm">{formatDate(paidDate, 'short', locale)}</div>
    },
  },
  {
    accessorKey: 'payment.paymentMethod.name',
    id: 'paymentMethodName',
    header: 'Método de Pago',
    cell: ({ row }) => <span className="text-sm">{row.original.payment.paymentMethod.name}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const installment = row.original
      const isPending = installment.status === 'pending'

      const handleMarkAsPaid = async () => {
        try {
          // TODO: Implement mark as paid endpoint
          toast.success('Cuota marcada como pagada')
          onInstallmentUpdated?.()
        } catch {
          toast.error('Error al marcar cuota como pagada')
        }
      }

      return (
        <DataTableDropdown>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isPending && (
            <DropdownMenuItem onClick={handleMarkAsPaid}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Marcar como pagado
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(installment.id)}>
            Copiar ID de cuota
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(installment.payment.id)}>
            Copiar ID de pago
          </DropdownMenuItem>
        </DataTableDropdown>
      )
    },
  },
]
