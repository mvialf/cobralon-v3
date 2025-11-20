'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { Eye, XCircle, Loader2 } from 'lucide-react'
import { DataTableDropdown } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { formatDate } from '@/lib/format'

export interface Payment {
  id: string
  type: 'Project' | 'Customer' // ← Tipo de pago
  amount: number
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
}

/**
 * Helper type-safe para extraer meta del table sin usar `as any`
 */
function getPaymentsTableMeta(table: any): PaymentsTableMeta {
  return (table.options.meta || {}) as PaymentsTableMeta
}

interface ColumnsProps {
  onViewDetails?: (payment: Payment) => void
}

export const createColumns = ({ onViewDetails }: ColumnsProps = {}): ColumnDef<Payment>[] => [
  // Cliente/Proyecto (fusionado)
  {
    id: 'associated',
    accessorFn: (row) => {
      // Para sorting: extraer nombre relevante
      if (row.type === 'Customer') {
        return row.customer?.name || ''
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
        return <span className="font-medium">{payment.customer?.name || '-'}</span>
      }

      // Project payment 1:1 → ProjectNameSummary
      if (payment.type === 'Project' && payment.allocations.length === 1) {
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

      // Project payment 1:N → vacío
      return <span className="text-muted-foreground">-</span>
    },
    enableSorting: true,
  },

  // Número de Proyecto
  {
    id: 'projectNumber',
    accessorFn: (row) => {
      // Extraer todos los números de proyecto de allocations
      return row.allocations.map((a) => a.project.projectNumber).join(', ')
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="N° Proyecto" />,
    cell: ({ row }) => {
      const payment = row.original

      // Si no tiene allocations, mostrar guión
      if (payment.allocations.length === 0) {
        return <span className="text-muted-foreground">-</span>
      }

      // Si tiene 1 allocation, mostrar el número
      if (payment.allocations.length === 1) {
        return (
          <span className="font-mono text-sm">{payment.allocations[0].project.projectNumber}</span>
        )
      }

      // Si tiene múltiples allocations, mostrar cantidad
      return (
        <span className="text-sm text-muted-foreground">
          {payment.allocations.length} proyectos
        </span>
      )
    },
    enableSorting: true,
    filterFn: (row, _id, filterValue) => {
      const payment = row.original
      // Verificar si algún allocation tiene un projectNumber en el filterValue
      return payment.allocations.some((allocation) =>
        filterValue.includes(allocation.project.projectNumber)
      )
    },
  },

  // Tipo
  {
    accessorKey: 'type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
    cell: ({ row }) => {
      const type = row.getValue('type') as 'Project' | 'Customer'

      return (
        <StatusBadge
          bgClass={type === 'Project' ? 'bg-blue-500' : 'bg-green-500'}
          label={type === 'Project' ? 'Proyecto' : 'Cliente'}
        />
      )
    },
    enableSorting: true,
    filterFn: (row, _id, filterValue) => {
      const type = row.getValue('type') as string
      return filterValue.includes(type)
    },
  },

  // Método de Pago
  {
    accessorKey: 'paymentMethod.name',
    id: 'paymentMethodName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Método" />,
    cell: ({ row }) => row.original.paymentMethod?.name || '-',
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const methodA = rowA.original.paymentMethod?.name || ''
      const methodB = rowB.original.paymentMethod?.name || ''
      return methodA.localeCompare(methodB)
    },
    filterFn: (row, _id, filterValue) => {
      const methodName = row.original.paymentMethod?.name
      return methodName ? filterValue.includes(methodName) : false
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
    enableSorting: true,
  },

  // Fecha
  {
    accessorKey: 'date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      return formatDate(row.getValue('date'), 'short', 'es-CL')
    },
    enableSorting: true,
  },

  // Acciones
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const payment = row.original
      const isCustomerPayment = payment.type === 'Customer'

      // ✅ Extraer callbacks del table meta (type-safe)
      const { handleDelete, deletingPaymentId } = getPaymentsTableMeta(table)

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
