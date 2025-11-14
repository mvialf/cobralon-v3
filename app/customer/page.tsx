'use client'

import { useState, useEffect } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { NewCustomerDialog } from '@/components/dialogs/customer/new-customer-dialog'
import { ImportCustomerDialog } from '@/components/dialogs/customer/import-customer-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { columns } from './columns'
import { useCustomers, type CustomersQueryParams } from '@/hooks/queries/use-customers'
import { useDebounce } from '@/hooks/use-debounce'

export default function CustomersPage() {
  const queryClient = useQueryClient()

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 20,
  })

  // Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Query params para useCustomers
  const queryParams: CustomersQueryParams = {
    page: pagination.pageIndex + 1, // API usa 1-based
    limit: pagination.pageSize,
    search: debouncedSearch || undefined,
  }

  // React Query: Fetch customers con cache automático
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
  const handleImportComplete = () => {
    // Invalidar todas las queries de customers (fuerza refetch)
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    // Resetear a página 1
    setPagination({ ...pagination, pageIndex: 0 })
  }

  const handleSearchChange = (search: string) => {
    setSearchTerm(search)
    // Resetear a página 1 cuando cambia la búsqueda
    if (pagination.pageIndex !== 0) {
      setPagination({ ...pagination, pageIndex: 0 })
    }
  }

  return (
    <AppLayout
      pageTitle="Clientes"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Clientes' }]}
      action={
        <div className="flex items-center gap-2">
          <ImportCustomerDialog onImportComplete={handleImportComplete} />
          <NewCustomerDialog />
        </div>
      }
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
            // Server-side pagination
            manualPagination={true}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            onSearchChange={handleSearchChange}
          />
        )}
      </div>
    </AppLayout>
  )
}
