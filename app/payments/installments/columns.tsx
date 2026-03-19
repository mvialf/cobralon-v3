'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { DataTableDropdown } from '@/components/data-table'
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { formatDate, formatCurrency } from '@/lib/format'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'

export interface Installment {
  id: string
  installmentNumber: number
  amount: number
  dueDate: string
  status: string // Derivado de dueDate por la API
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
  locale = 'es-CL',
}: ColumnsProps = {}): ColumnDef<Installment>[] => [
  {
    id: 'associated',
    accessorFn: (row) => {
      if (row.payment.allocations.length === 1) {
        return (
          row.payment.allocations[0].project.projectName ||
          row.payment.allocations[0].project.projectNumber
        )
      }
      return row.payment.customer.name
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente/Proyecto" />,
    cell: ({ row }) => {
      const payment = row.original.payment

      if (payment.allocations.length === 1) {
        const project = payment.allocations[0].project
        return (
          <ProjectNameSummary
            projectId={project.id}
            projectNumber={project.projectNumber}
            customerName={payment.customer.name}
            projectName={project.projectName}
          />
        )
      }

      return (
        <div className="flex flex-col gap-1">
          <span className="font-medium">{payment.customer.name}</span>
          <div className="text-xs text-muted-foreground">
            {payment.allocations.map((alloc) => alloc.project.projectNumber).join(', ')}
          </div>
        </div>
      )
    },
    enableSorting: true,
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
      return <div className="text-right font-medium">{formatCurrency(amount, currency)}</div>
    },
  },
  {
    accessorKey: 'dueDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vencimiento" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue('dueDate'))
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(date)
      dueDate.setHours(0, 0, 0, 0)
      const isOverdue = dueDate < today

      return (
        <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.getValue('dueDate'), 'short', locale)}
          {isOverdue && row.original.status === 'pending' && (
            <div className="text-xs">Vencido</div>
          )}
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
    accessorKey: 'payment.paymentMethod.name',
    id: 'paymentMethodName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Método de Pago" />,
    cell: ({ row }) => <span className="text-sm">{row.original.payment.paymentMethod.name}</span>,
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const methodA = rowA.original.payment.paymentMethod.name
      const methodB = rowB.original.payment.paymentMethod.name
      return methodA.localeCompare(methodB)
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const installment = row.original

      return (
        <DataTableDropdown>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
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
