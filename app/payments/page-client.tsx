'use client'

import { useState, useMemo, useEffect } from 'react'
import { type PaginationState, type SortingState } from '@tanstack/react-table'
import { Plus, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable, type BulkAction } from '@/components/data-table'
import { createColumns, type Payment } from './columns'
import { PaymentDetailsDialog } from '@/components/dialogs/payments/payment-details-dialog'
import { PaymentToProjectDialog } from '@/components/dialogs/payments/payment-to-project-dialog'
import { PaymentToCustomerDialog } from '@/components/dialogs/payments/payment-to-customer-dialog'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  usePayments,
  useDeletePayment,
  useBulkDeletePayments,
  useUpdatePaymentDate,
  type PaymentsQueryParams,
} from '@/hooks/queries/use-payments'
import type { Payment as APIPayment } from '@/lib/validations/payment-validations'
import { useDebounce } from '@/hooks/use-debounce'

export function PaymentsPageClient() {
  const queryClient = useQueryClient()

  // Estado para bulk delete
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [paymentsToDelete, setPaymentsToDelete] = useState<Payment[]>([])

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 50,
  })

  // Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Estados de filtros server-side
  const [typeFilter, setTypeFilter] = useState<'Project' | 'Customer' | undefined>(undefined)
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | undefined>(undefined)
  const [projectNumberFilter, setProjectNumberFilter] = useState<string | undefined>(undefined)

  // Estado de sorting server-side
  const [sorting, setSorting] = useState<SortingState>([])

  // Query params para usePayments (useMemo para evitar recreación en cada render)
  const queryParams: PaymentsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      // Server-side filtering
      search: debouncedSearch || undefined,
      type: typeFilter,
      paymentMethodId: paymentMethodFilter,
      projectNumber: projectNumberFilter,
      // Facets solo en página 1 (carga inicial + cambio de filtros que resetean a pág 1)
      includeFacets: pagination.pageIndex === 0,
      // Server-side sorting
      sortBy: sorting[0]?.id || undefined,
      sortOrder: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
      typeFilter,
      paymentMethodFilter,
      projectNumberFilter,
      sorting,
    ]
  )

  // React Query: Fetch payments con cache automático
  // NOTA: En primera carga, usará datos pre-cargados por HydrationBoundary
  const { data, isLoading, isPlaceholderData } = usePayments(queryParams)
  const deleteMutation = useDeletePayment()
  const bulkDeleteMutation = useBulkDeletePayments()
  const updateDateMutation = useUpdatePaymentDate()

  // Extraer data del hook (con fallbacks) y cast a tipo local
  const payments = useMemo(() => (data?.payments || []) as Payment[], [data?.payments])
  const pageCount = data?.pagination.totalPages || 0
  const facets = data?.facets

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

  // Handler para cambiar fecha inline (pasa via meta a columns)
  const handleDateChange = async (paymentId: string, newDate: Date) => {
    await updateDateMutation.mutateAsync({ paymentId, date: newDate.toISOString() })
  }

  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    // Resetear a página 1 cuando cambia la búsqueda (server-side)
    if (pagination.pageIndex !== 0) {
      setPagination({ ...pagination, pageIndex: 0 })
    }
  }

  const handleSortingChange = (newSorting: SortingState) => {
    setSorting(newSorting)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
    // Resetear a página 1 al crear nuevo pago
    setPagination({ ...pagination, pageIndex: 0 })
  }

  // Handler para bulk delete
  const handleBulkDelete = async (selectedPayments: Payment[]) => {
    setPaymentsToDelete(selectedPayments)
    setShowBulkDeleteDialog(true)
  }

  const confirmBulkDelete = async () => {
    const ids = paymentsToDelete.map((p) => p.id)
    await bulkDeleteMutation.mutateAsync(ids)
    setShowBulkDeleteDialog(false)
    setPaymentsToDelete([])
  }

  // Configuración de acciones masivas
  const bulkActions: BulkAction<Payment>[] = [
    {
      id: 'delete',
      label: 'Eliminar',
      icon: Trash2,
      variant: 'destructive',
      onClick: handleBulkDelete,
    },
  ]

  const columns = useMemo(
    () =>
      createColumns({
        onViewDetails: handleViewDetails,
        updatingDatePaymentId: updateDateMutation.isPending
          ? updateDateMutation.variables?.paymentId
          : null,
      }),
    [updateDateMutation.isPending, updateDateMutation.variables]
  )

  return (
    <AppLayout
      pageTitle="Pagos"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Pagos' }]}
      action={
        <div className="flex items-center gap-2">
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
            // Server-side sorting
            manualSorting={true}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            // Server-side filtering
            manualFiltering={true}
            serverFacets={facets}
            filterableColumns={[
              {
                id: 'projectNumber',
                title: 'N° Proyecto',
                options:
                  facets?.projectNumber?.map((f) => ({
                    label: f.label,
                    value: f.value,
                  })) || [],
                onFilterChange: (values) => {
                  setProjectNumberFilter(values[0] || undefined)
                  if (pagination.pageIndex !== 0) {
                    setPagination({ ...pagination, pageIndex: 0 })
                  }
                },
              },
              {
                id: 'type',
                title: 'Tipo',
                options: [
                  { label: 'Proyecto', value: 'Project' },
                  { label: 'Cliente', value: 'Customer' },
                ],
                onFilterChange: (values) => {
                  setTypeFilter(values[0] as 'Project' | 'Customer' | undefined)
                  if (pagination.pageIndex !== 0) {
                    setPagination({ ...pagination, pageIndex: 0 })
                  }
                },
              },
              {
                id: 'paymentMethodName',
                title: 'Método de Pago',
                options:
                  facets?.paymentMethod?.map((f) => ({
                    label: f.label,
                    value: f.value,
                  })) || [],
                onFilterChange: (values) => {
                  setPaymentMethodFilter(values[0] || undefined)
                  if (pagination.pageIndex !== 0) {
                    setPagination({ ...pagination, pageIndex: 0 })
                  }
                },
              },
            ]}
            meta={{
              handleDelete,
              deletingPaymentId: deleteMutation.variables || null,
              handleDateChange,
            }}
            // Selección múltiple y acciones masivas
            enableRowSelection
            bulkActions={bulkActions}
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

      {/* Diálogo de confirmación de eliminación masiva */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pagos seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar{' '}
              <span className="font-semibold text-foreground">
                {paymentsToDelete.length} pago{paymentsToDelete.length !== 1 ? 's' : ''}
              </span>
              . Esta acción no se puede deshacer y liberará el balance de los proyectos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
