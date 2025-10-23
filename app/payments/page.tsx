'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import { createColumns, type Payment } from './columns'
import { PaymentDetailsDialog } from '@/components/dialogs/payments/payment-details-dialog'
import { PaymentToProjectDialog } from '@/components/dialogs/payments/payment-to-project-dialog'
import { PaymentToCustomerDialog } from '@/components/dialogs/payments/payment-to-customer-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isPaymentToProjectDialogOpen, setIsPaymentToProjectDialogOpen] = useState(false)
  const [isPaymentToCustomerDialogOpen, setIsPaymentToCustomerDialogOpen] = useState(false)

  const fetchPayments = async () => {
    try {
      setIsLoading(true)

      // Fetch con límite alto para paginación client-side
      const response = await fetch('/api/payments?limit=1000')
      if (!response.ok) throw new Error('Error al cargar pagos')

      const data = await response.json()
      setPayments(data.payments)
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Error al cargar pagos')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

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
    []
  )

  // Obtener métodos de pago únicos para filtro
  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(payments.map((p) => p.paymentMethod.name))
    return Array.from(methods).map((method) => ({
      label: method,
      value: method,
    }))
  }, [payments])

  return (
    <AppLayout
      pageTitle="Pagos"
      pageDescription="Lista completa de todos los pagos registrados"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }]}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Todos los Pagos</CardTitle>
              <CardDescription>
                {payments.length > 0
                  ? `${payments.length} pago${payments.length !== 1 ? 's' : ''} registrado${payments.length !== 1 ? 's' : ''}`
                  : 'No hay pagos registrados'}
              </CardDescription>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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
                  id: 'status',
                  title: 'Estado',
                  options: [
                    { label: 'Activo', value: 'ACTIVE' },
                    { label: 'Anulado', value: 'CANCELLED' },
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
        </CardContent>
      </Card>

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
