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
import { usePayments, useDeletePayment } from '@/hooks/queries/use-payments'
import type { Payment as APIPayment } from '@/lib/validations/payment-validations'

export default function PaymentsPage() {
  // ✅ React Query hooks reemplazan state management manual
  const { data, isLoading, refetch } = usePayments({ limit: 1000 })
  const deleteMutation = useDeletePayment()

  // Extraer data del hook (con fallbacks) y cast a tipo local
  const payments = useMemo(() => (data?.payments || []) as Payment[], [data?.payments])

  // Calcular métodos de pago únicos para filtros (movido del hook viejo)
  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(
      payments.filter((p) => p.paymentMethod).map((p) => p.paymentMethod!.name)
    )
    return Array.from(methods).map((method) => ({
      label: method,
      value: method,
    }))
  }, [payments])

  // Estado de dialogs
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isPaymentToProjectDialogOpen, setIsPaymentToProjectDialogOpen] = useState(false)
  const [isPaymentToCustomerDialogOpen, setIsPaymentToCustomerDialogOpen] = useState(false)

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsDetailsDialogOpen(true)
  }

  // Handler para eliminar pagos (pasa via meta a columns)
  const handleDelete = async (paymentId: string) => {
    await deleteMutation.mutateAsync(paymentId)
  }

  const columns = useMemo(
    () =>
      createColumns({
        onViewDetails: handleViewDetails,
      }),
    []
  )

  return (
    <AppLayout
      pageTitle="Pagos"
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
              Pago a Proyecto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsPaymentToCustomerDialogOpen(true)}>
              Pago a Cliente
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
            meta={{
              handleDelete,
              deletingPaymentId: deleteMutation.variables || null,
            }}
          />
        )}
      </div>

      {/* Modal de detalles */}
      <PaymentDetailsDialog
        payment={selectedPayment as APIPayment | null}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />

      {/* Modal de registro de pago a proyecto */}
      <PaymentToProjectDialog
        open={isPaymentToProjectDialogOpen}
        onOpenChange={setIsPaymentToProjectDialogOpen}
        onSuccess={refetch}
      />

      {/* Modal de registro de pago a cliente */}
      <PaymentToCustomerDialog
        open={isPaymentToCustomerDialogOpen}
        onOpenChange={setIsPaymentToCustomerDialogOpen}
        onSuccess={refetch}
      />
    </AppLayout>
  )
}
