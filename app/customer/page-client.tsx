'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { type PaginationState, type SortingState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { NewCustomerDialog } from '@/components/dialogs/customers/new-customer-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns } from './columns'
import { useCustomers, type CustomersQueryParams } from '@/hooks/queries/use-customers'
import { useDebounce } from '@/hooks/use-debounce'

export function CustomersPageClient() {
  const queryClient = useQueryClient()

  // Callback para refrescar la tabla después de operaciones de crédito
  const handleCustomerUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }, [queryClient])

  // Crear columnas con callback de actualización
  const columns = useMemo(
    () => createColumns({ onCustomerUpdated: handleCustomerUpdated }),
    [handleCustomerUpdated]
  )

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 50,
  })

  // Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Estado de sorting server-side
  const [sorting, setSorting] = useState<SortingState>([])

  // Query params para useCustomers (useMemo para evitar recreación en cada render)
  const queryParams: CustomersQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
      sortBy: sorting[0]?.id || undefined,
      sortOrder: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch, sorting]
  )

  // React Query: Fetch customers con cache automático
  // NOTA: En primera carga, usará datos pre-cargados por HydrationBoundary
  const { data, isLoading, isPlaceholderData } = useCustomers(queryParams)

  const customers = data?.customers || []
  const pageCount = data?.pagination.totalPages || 0

  // Prefetch página siguiente para mejor UX
  useEffect(() => {
    if (!isPlaceholderData && data?.pagination) {
      const { page, totalPages } = data.pagination
      const hasNextPage = page < totalPages

      if (hasNextPage) {
        // Prefetch siguiente página en background
        queryClient.prefetchQuery({
          queryKey: ['customers', { ...queryParams, page: page + 1 }],
          queryFn: async () => {
            const params = new URLSearchParams({
              page: String(page + 1),
              limit: String(queryParams.limit),
            })
            if (queryParams.search) params.append('search', queryParams.search)

            const response = await fetch(`/api/customers?${params}`)
            if (!response.ok) throw new Error('Error al precargar')
            return response.json()
          },
        })
      }
    }
  }, [data, isPlaceholderData, queryClient, queryParams])

  // Handlers
  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    // Resetear a página 1 cuando cambia la búsqueda
    if (pagination.pageIndex !== 0) {
      setPagination({ ...pagination, pageIndex: 0 })
    }
  }

  const handleSortingChange = (newSorting: SortingState) => {
    setSorting(newSorting)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  return (
    <AppLayout
      pageTitle="Clientes"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Clientes' }]}
      action={<NewCustomerDialog />}
    >
      <div className="space-y-4">
        {isLoading && !isPlaceholderData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando clientes...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={customers}
            searchKey="name"
            searchPlaceholder="Buscar cliente..."
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
          />
        )}
      </div>
    </AppLayout>
  )
}
