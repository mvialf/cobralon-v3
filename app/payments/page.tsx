'use client'

import { useState, useMemo, useEffect } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { Plus, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
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
import {
  usePayments,
  useDeletePayment,
  type PaymentsQueryParams,
} from '@/hooks/queries/use-payments'
import type { Payment as APIPayment } from '@/lib/validations/payment-validations'
import { useDebounce } from '@/hooks/use-debounce'

export default function PaymentsPage() {
  const queryClient = useQueryClient()

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 20,
  })

  // Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Query params para usePayments (useMemo para evitar recreación en cada render)
  const queryParams: PaymentsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      // Nota: La API de payments no tiene search directo, usa client-side filtering
    }),
    [pagination.pageIndex, pagination.pageSize]
  )

  // React Query: Fetch payments con cache automático
  const { data, isLoading, isPlaceholderData } = usePayments(queryParams)
  const deleteMutation = useDeletePayment()

  // Extraer data del hook (con fallbacks) y cast a tipo local
  const allPayments = useMemo(() => (data?.payments || []) as Payment[], [data?.payments])
  const pageCount = data?.pagination.totalPages || 0

  // Filtrar payments client-side por búsqueda (hasta que API soporte search)
  const payments = useMemo(() => {
    if (!debouncedSearch) return allPayments

    const searchLower = debouncedSearch.toLowerCase()
    return allPayments.filter((p) => {
      // Buscar en nombre de cliente
      if (p.customer?.name.toLowerCase().includes(searchLower)) return true
      // Buscar en nombre de proyecto (via allocations)
      if (
        p.allocations.some(
          (allocation) =>
            allocation.project.projectName &&
            allocation.project.projectName.toLowerCase().includes(searchLower)
        )
      )
        return true
      return false
    })
  }, [allPayments, debouncedSearch])

  // Calcular métodos de pago únicos para filtros
  const uniquePaymentMethods = useMemo(() => {
    const methods = new Set(
      allPayments.filter((p) => p.paymentMethod).map((p) => p.paymentMethod!.name)
    )
    return Array.from(methods).map((method) => ({
      label: method,
      value: method,
    }))
  }, [allPayments])

  // Prefetch página siguiente para mejor UX
  useEffect(() => {
    if (!isPlaceholderData && data?.pagination) {
      const { page, totalPages } = data.pagination
      const hasNextPage = page < totalPages

      if (hasNextPage) {
        // Prefetch siguiente página en background
        queryClient.prefetchQuery({
          queryKey: ['payments', { ...queryParams, page: page + 1 }],
          queryFn: async () => {
            const params = new URLSearchParams({
              page: String(page + 1),
              limit: String(queryParams.limit),
            })

            const response = await fetch(`/api/payments?${params}`)
            if (!response.ok) throw new Error('Error al precargar')
            return response.json()
          },
        })
      }
    }
  }, [data, isPlaceholderData, queryClient, queryParams])

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

  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    // Nota: Search es client-side, no resetea paginación
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    // Resetear a página 1 al crear nuevo pago
    setPagination({ ...pagination, pageIndex: 0 })
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
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/import?tab=payments">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Link>
          </Button>
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
        </div>
      }
    >
      <div className="space-y-4">
        {isLoading && !isPlaceholderData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando pagos...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            searchKey="associated"
            searchPlaceholder="Buscar por cliente/proyecto..."
            searchValue={searchTerm}
            // Server-side pagination
            manualPagination={true}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            onSearchChange={handleSearchChange}
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
        onSuccess={handleSuccess}
      />

      {/* Modal de registro de pago a cliente */}
      <PaymentToCustomerDialog
        open={isPaymentToCustomerDialogOpen}
        onOpenChange={setIsPaymentToCustomerDialogOpen}
        onSuccess={handleSuccess}
      />
    </AppLayout>
  )
}
