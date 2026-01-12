'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { Plus, Upload, Download } from 'lucide-react'
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
  type PaymentsQueryParams,
} from '@/hooks/queries/use-payments'
import type { Payment as APIPayment } from '@/lib/validations/payment-validations'
import { useDebounce } from '@/hooks/use-debounce'

export function PaymentsPageClient() {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

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

  // Handler para exportar pagos a Excel
  const handleExport = useCallback(async (options?: { type?: 'Project' | 'Customer' | 'all' }) => {
    setIsExporting(true)
    setShowExportDialog(false)
    try {
      const params = new URLSearchParams()
      if (options?.type && options.type !== 'all') params.append('type', options.type)

      const response = await fetch(`/api/payments/export?${params}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al exportar')
      }

      // Descargar el archivo
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pagos-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exportando pagos:', error)
      // TODO: Mostrar toast de error
    } finally {
      setIsExporting(false)
    }
  }, [])

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
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
      typeFilter,
      paymentMethodFilter,
      projectNumberFilter,
    ]
  )

  // React Query: Fetch payments con cache automático
  // NOTA: En primera carga, usará datos pre-cargados por HydrationBoundary
  const { data, isLoading, isPlaceholderData } = usePayments(queryParams)
  const deleteMutation = useDeletePayment()

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

  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    // Resetear a página 1 cuando cambia la búsqueda (server-side)
    if (pagination.pageIndex !== 0) {
      setPagination({ ...pagination, pageIndex: 0 })
    }
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
          <Button
            variant="outline"
            onClick={() => setShowExportDialog(true)}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
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

      {/* Diálogo de exportación */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Qué deseas exportar?</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona el tipo de pagos que deseas exportar a Excel.
              {data?.pagination.total !== undefined && (
                <span className="block mt-2 font-medium">
                  ({data.pagination.total} pago{data.pagination.total !== 1 ? 's' : ''} en total)
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleExport({ type: 'Project' })}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Solo Proyectos
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleExport({ type: 'Customer' })}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Solo Clientes
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleExport()}>Exportar todos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
