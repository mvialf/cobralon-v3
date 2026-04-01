'use client'

import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, DollarSign, ArrowLeftRight, FileText, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableDropdown, DataTableColumnHeader } from '@/components/data-table'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PaymentToCustomerDialog } from '@/components/dialogs/payments/payment-to-customer-dialog'
import { RefundCreditDialog } from '@/components/dialogs/customers/refund-credit-dialog'
import { EditCustomerDialog } from '@/components/dialogs/customers/edit-customer-dialog'
import { ConfirmDeleteDialog } from '@/components/dialogs/confirm-delete-dialog'
import { ViewCustomerAccountDialog } from '@/components/dialogs/customers/view-customer-account-dialog'
import { CreditHistoryDialog } from '@/components/dialogs/customers/credit-history-dialog'
import { CustomerCreditBadge } from '@/components/ui/customer-credit-badge'
import { shouldShowRefundOption } from '@/lib/business-logic/credit-eligibility'
import { useDeleteCustomer } from '@/hooks/queries/use-customers'

export interface Customer {
  id: string
  name: string
  phone: string // Obligatorio
  email: string | null // Opcional
  creditBalance: number // Crédito a favor del cliente
  totalProjects: number // Total de proyectos del cliente
  activeProjects: number // Proyectos activos
}

// Componente para las acciones de cada customer
function CustomerActionsCell({
  customer,
  onCustomerUpdated,
}: {
  customer: Customer
  onCustomerUpdated?: () => void
}) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [creditHistoryOpen, setCreditHistoryOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Hook para eliminar cliente
  const deleteCustomer = useDeleteCustomer()

  // Verificar si se debe mostrar opción de devolución de crédito
  const canRefund = shouldShowRefundOption(customer.creditBalance)

  // Handler para confirmar eliminación
  const handleConfirmDelete = async () => {
    try {
      await deleteCustomer.mutateAsync(customer.id)
      setDeleteDialogOpen(false)
      onCustomerUpdated?.()
    } catch (error) {
      // Error ya manejado por el hook (toast automático)
      console.error('Error deleting customer:', error)
    }
  }

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

        {/* Estado de cuenta */}
        <DropdownMenuItem onClick={() => setAccountDialogOpen(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Estado de cuenta
        </DropdownMenuItem>

        {/* Historial de crédito - solo si tiene crédito */}
        {canRefund && (
          <DropdownMenuItem onClick={() => setCreditHistoryOpen(true)}>
            <History className="mr-2 h-4 w-4" />
            Historial de crédito
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Devolver crédito - CONDICIONAL */}
        {canRefund && (
          <>
            <DropdownMenuItem
              onClick={() => setRefundDialogOpen(true)}
              className="text-green-600 dark:text-green-400"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Devolver crédito
              <Badge variant="secondary" className="ml-auto text-xs">
                <CustomerCreditBadge creditBalance={customer.creditBalance} compact />
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">
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

      {/* Dialog para devolver crédito */}
      <RefundCreditDialog
        customerId={customer.id}
        customerName={customer.name}
        availableCredit={customer.creditBalance}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        onSuccess={() => {
          // Refresh tabla cuando se devuelve crédito
          onCustomerUpdated?.()
        }}
      />

      {/* Dialog para editar cliente */}
      <EditCustomerDialog
        customer={customer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onCustomerUpdated={onCustomerUpdated}
      />

      {/* Dialog para confirmar eliminación */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Eliminar cliente"
        description={`¿Estás seguro de eliminar al cliente "${customer.name}"? Esta acción no se puede deshacer.`}
        isDeleting={deleteCustomer.isPending}
      />

      {/* Dialog para estado de cuenta */}
      <ViewCustomerAccountDialog
        customerId={customer.id}
        customerName={customer.name}
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
      />

      {/* Dialog para historial de crédito */}
      <CreditHistoryDialog
        customerId={customer.id}
        customerName={customer.name}
        open={creditHistoryOpen}
        onOpenChange={setCreditHistoryOpen}
      />
    </>
  )
}

interface ColumnsProps {
  onCustomerUpdated?: () => void
}

export const createColumns = ({ onCustomerUpdated }: ColumnsProps = {}): ColumnDef<Customer>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    enableSorting: true,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
    enableSorting: true,
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Correo" />,
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const emailA = rowA.original.email || ''
      const emailB = rowB.original.email || ''
      return emailA.localeCompare(emailB)
    },
    meta: {
      headerClassName: 'text-left',
      cellClassName: 'text-left',
    },
  },
  {
    accessorKey: 'creditBalance',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Crédito" />,
    cell: ({ row }) => {
      const credit = row.original.creditBalance

      if (credit === 0) {
        return <span className="text-muted-foreground">-</span>
      }

      return <CustomerCreditBadge creditBalance={credit} />
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    accessorKey: 'totalProjects',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Proyectos" />,
    cell: ({ row }) => {
      const { activeProjects, totalProjects } = row.original

      if (totalProjects === 0) {
        return <span className="text-muted-foreground">-</span>
      }

      return (
        <span>
          {activeProjects > 0 ? (
            <span className="font-medium">{activeProjects}</span>
          ) : (
            <span className="text-muted-foreground">0</span>
          )}
          <span className="text-muted-foreground">/{totalProjects}</span>
        </span>
      )
    },
    enableSorting: true,
    meta: {
      headerClassName: 'text-right',
      cellClassName: 'text-right',
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <CustomerActionsCell customer={row.original} onCustomerUpdated={onCustomerUpdated} />
    ),
    meta: {
      headerClassName: 'text-center',
      cellClassName: 'text-center',
    },
  },
]
