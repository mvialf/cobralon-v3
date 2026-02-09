'use client'

import { useState, useEffect, useMemo } from 'react'
import { type PaginationState, type SortingState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { NewVisitDialog } from '@/components/dialogs/visits/new-visit-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns } from './columns'
import { useVisits, useUpdateVisit, type VisitsQueryParams } from '@/hooks/queries/use-visits'
import { useVisitStatuses } from '@/hooks/queries/use-visit-statuses'
import { useDebounce } from '@/hooks/use-debounce'

export function VisitsPageClient() {
  const queryClient = useQueryClient()

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

  // Query params para useVisits (useMemo para evitar recreación en cada render)
  const queryParams: VisitsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
      sortBy: sorting[0]?.id || undefined,
      sortOrder: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch, sorting]
  )

  // React Query: Fetch visits con cache automático
  // NOTA: En primera carga, usará datos pre-cargados por HydrationBoundary
  const { data, isLoading, isPlaceholderData } = useVisits(queryParams)

  // Cargar visit statuses para el filtro
  // NOTA: También pre-cargado por HydrationBoundary
  const { data: visitStatuses } = useVisitStatuses()

  // Mutation hook para actualizar estado de visita
  const updateVisitMutation = useUpdateVisit()

  // Extraer data del hook (con fallbacks)
  const visits = data?.data || []
  const pageCount = data?.pagination.totalPages || 0
  const statuses = visitStatuses || []

  // Prefetch página siguiente para mejor UX
  useEffect(() => {
    if (!isPlaceholderData && data?.pagination) {
      const { page, totalPages } = data.pagination
      const hasNextPage = page < totalPages

      if (hasNextPage) {
        // Prefetch siguiente página en background
        queryClient.prefetchQuery({
          queryKey: ['visits', { ...queryParams, page: page + 1 }],
          queryFn: async () => {
            const params = new URLSearchParams({
              page: String(page + 1),
              limit: String(queryParams.limit),
            })
            if (queryParams.search) params.append('search', queryParams.search)

            const response = await fetch(`/api/visits?${params}`)
            if (!response.ok) throw new Error('Error al precargar')
            return response.json()
          },
        })
      }
    }
  }, [data, isPlaceholderData, queryClient, queryParams])

  // Mutation hook maneja loading state, errores y auto-invalidación
  const handleStatusChange = async (visitId: string, newStatusId: string) => {
    await updateVisitMutation.mutateAsync({
      id: visitId,
      visitStatusId: newStatusId,
    })
  }

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

  const columns = createColumns({
    statuses: statuses.map((s) => ({
      id: s.id,
      label: s.name,
      color: { bgClass: s.color.bgClass, textClass: s.color.textClass },
    })),
    updatingVisitId: updateVisitMutation.isPending ? updateVisitMutation.variables?.id : null,
  })

  // Formatear opciones para el filtro de status
  const statusFilterOptions = (statuses || []).map((status) => ({
    label: status.name,
    value: status.id,
    bgClass: status.color.bgClass,
  }))

  return (
    <AppLayout
      pageTitle="Visitas"
      pageDescription="Gestiona las visitas agendadas a clientes potenciales"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Visitas' }]}
      action={<NewVisitDialog />}
    >
      <div className="space-y-4">
        {isLoading && !isPlaceholderData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando visitas...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={visits}
            searchKey="search"
            searchPlaceholder="Buscar por nombre, teléfono, dirección o comuna..."
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
            filterableColumns={[
              {
                id: 'visitStatus',
                title: 'Estado',
                options: statusFilterOptions,
              },
            ]}
            meta={{
              handleStatusChange,
            }}
          />
        )}
      </div>
    </AppLayout>
  )
}
