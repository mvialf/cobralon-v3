'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Eye, XCircle, Loader2 } from 'lucide-react'
import { DataTableDropdown, createSelectColumn, getTableMeta } from '@/components/data-table'
import { EditableDate } from '@/components/ui/editable-date'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '@/components/data-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { formatDate, formatCurrency } from '@/lib/format'

export interface Payment {
  id: string
  type: 'Project' | 'Customer' // ← Tipo de pago
  amount: number
  commissionAmount: number | null
  netAmount: number | null
  currency: string
  date: Date | string // Compatible con API response
  reference: string | null
  customer?: {
    id: string
    name: string
  }
  paymentMethod?: {
    id: string
    name: string
  }
  selectedInstallments: number | null
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

// ============================================================================
// TABLE META TYPE (Type-safe access)
// ============================================================================

/**
 * Type-safe interface para table.options.meta
 * Permite pasar callbacks y estado desde la página a las columnas
 */
interface PaymentsTableMeta {
  handleDelete?: (paymentId: string) => void
  deletingPaymentId?: string | null
  handleDateChange?: (paymentId: string, newDate: Date) => Promise<void>
}

interface ColumnsProps {
  onViewDetails?: (payment: Payment) => void
  updatingDatePaymentId?: string | null
}

export const createColumns = ({
  onViewDetails,
  updatingDatePaymentId = null,
}: ColumnsProps = {}): ColumnDef<Payment>[] => [
  // Columna de selección (checkbox)
  createSelectColumn<Payment>(),
  // Cliente
  {
    id: 'associated',
    accessorFn: (row) => {
      return [
        row.customer?.name || '',
        ...row.allocations.map(
          (allocation) => allocation.project.projectName || allocation.project.projectNumber
        ),
      ].join(' ')
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ row }) => {
      const payment = row.original
      return <span className="font-medium">{payment.customer?.name || '-'}</span>
    },
    enableSorting: false,
  },

  // Aplicación a proyectos
  {
    id: 'projectNumber',
    accessorFn: (row) => {
      // Extraer todos los números de proyecto de allocations
      return row.allocations.map((a) => a.project.projectNumber).join(', ')
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Aplicado a" />,
    cell: ({ row }) => {
      const payment = row.original

      // Si no tiene allocations, mostrar guión
      if (payment.allocations.length === 0) {
        return <span className="text-muted-foreground">-</span>
      }

      // Si tiene 1 allocation, mostrar el número
      if (payment.allocations.length === 1) {
        const project = payment.allocations[0].project
        return (
          <ProjectNameSummary
            projectId={project.id}
            projectNumber={project.projectNumber}
            customerName={payment.customer?.name || '-'}
            projectName={project.projectName}
          />
        )
      }

      // Si tiene múltiples allocations, mostrar cantidad
      return (
        <span className="text-sm text-muted-foreground">
          {payment.allocations.length} proyectos
        </span>
      )
    },
    enableSorting: false,
    // filterFn removido - ahora usa server-side filtering
  },

  // Método de Pago
  {
    accessorKey: 'paymentMethod.name',
    id: 'paymentMethodName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Método" />,
    cell: ({ row }) => row.original.paymentMethod?.name || '-',
    enableSorting: true,
    // filterFn removido - ahora usa server-side filtering
  },

  // Monto
  {
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Monto" className="justify-end" />
    ),
    cell: ({ row }) => {
      const payment = row.original
      return (
        <div className="text-right font-semibold">
          {formatCurrency(payment.amount, payment.currency)}
        </div>
      )
    },
    enableSorting: true,
  },

  // Neto (solo si tiene comisión)
  {
    accessorKey: 'netAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Neto" className="justify-end" />
    ),
    cell: ({ row }) => {
      const payment = row.original
      if (payment.netAmount == null || payment.commissionAmount == null) return null
      if (payment.commissionAmount === 0) return null
      return (
        <div className="text-right text-sm text-muted-foreground">
          {formatCurrency(payment.netAmount, payment.currency)}
        </div>
      )
    },
    enableSorting: false,
  },

  // Fecha
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row, table }) => {
      const payment = row.original
      const hasInstallments =
        payment.selectedInstallments !== null && payment.selectedInstallments > 1
      const { handleDateChange } = getTableMeta<PaymentsTableMeta>(table)
      const isPending = updatingDatePaymentId === payment.id

      if (hasInstallments) {
        return formatDate(payment.date, 'short', 'es-CL')
      }

      return (
        <EditableDate
          date={payment.date}
          onChange={
            handleDateChange ? (newDate: Date) => handleDateChange(payment.id, newDate) : undefined
          }
          isPending={isPending}
        />
      )
    },
    enableSorting: true,
  },

  // Acciones
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const payment = row.original

      // ✅ Extraer callbacks del table meta (type-safe)
      const { handleDelete, deletingPaymentId } = getTableMeta<PaymentsTableMeta>(table)

      const onDelete = async () => {
        if (
          !confirm(
            `¿Estás seguro de eliminar este pago de ${payment.customer?.name || 'este cliente'}?`
          )
        ) {
          return
        }
        handleDelete?.(payment.id)
      }

      const isDeleting = deletingPaymentId === payment.id

      return (
        <DataTableDropdown>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => onViewDetails?.(payment)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver detalles
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Eliminar pago */}
          <DropdownMenuItem className="text-destructive" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Eliminar pago
              </>
            )}
          </DropdownMenuItem>
        </DataTableDropdown>
      )
    },
  },
]
