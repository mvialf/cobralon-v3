'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/data-table'
import { createColumns, type Payment } from './columns'
import { PaymentDetailsDialog } from '@/components/dialogs/payments/payment-details-dialog'
import { PaymentToProjectDialog } from '@/components/dialogs/payments/payment-to-project-dialog'
import { PaymentToCustomerDialog } from '@/components/dialogs/payments/payment-to-customer-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePayments } from '@/hooks/use-payments'

export default function PaymentsPage() {
  // Estado de pagos (extraído a hook custom)
  const { payments, isLoading, fetchPayments, uniquePaymentMethods } = usePayments()

  // Estado de dialogs
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isPaymentToProjectDialogOpen, setIsPaymentToProjectDialogOpen] = useState(false)
  const [isPaymentToCustomerDialogOpen, setIsPaymentToCustomerDialogOpen] = useState(false)

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsDetailsDialogOpen(true)
  }

  const columns = useMemo(
    () =>
      createColumns({
        onPaymentUpdated: fetchPayments,
        onViewDetails: handleViewDetails,
      }),
    [fetchPayments]
  )

  return (
    <AppLayout
      pageTitle="Pagos"
      pageDescription="Lista completa de todos los pagos registrados"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }]}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Pago
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsPaymentToProjectDialogOpen(true)}>
              Pago a Proyecto (1:1)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsPaymentToCustomerDialogOpen(true)}>
              Pago a Cliente (1:N)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando pagos...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            searchKey="associated"
            searchPlaceholder="Buscar por cliente/proyecto..."
            filterableColumns={[
              {
                id: 'type',
                title: 'Tipo',
                options: [
                  { label: 'Proyecto', value: 'Project' },
                  { label: 'Cliente', value: 'Customer' },
                ],
              },
              {
                id: 'paymentMethodName',
                title: 'Método de Pago',
                options: uniquePaymentMethods,
              },
            ]}
          />
        )}
      </div>

      {/* Modal de detalles */}
      <PaymentDetailsDialog
        payment={selectedPayment}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />

      {/* Modal de registro de pago a proyecto */}
      <PaymentToProjectDialog
        open={isPaymentToProjectDialogOpen}
        onOpenChange={setIsPaymentToProjectDialogOpen}
        onSuccess={fetchPayments}
      />

      {/* Modal de registro de pago a cliente */}
      <PaymentToCustomerDialog
        open={isPaymentToCustomerDialogOpen}
        onOpenChange={setIsPaymentToCustomerDialogOpen}
        onSuccess={fetchPayments}
      />
    </AppLayout>
  )
}
