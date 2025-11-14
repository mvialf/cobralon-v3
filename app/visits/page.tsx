'use client'

import { useState, useEffect, useMemo } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { Row } from '@tanstack/react-table'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/app-layout'
import { NewVisitDialog } from '@/components/dialogs/visits/new-visit-dialog'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns, type Visit } from './columns'
import { useVisits, useUpdateVisit, type VisitsQueryParams } from '@/hooks/queries/use-visits'
import { useDebounce } from '@/hooks/use-debounce'

export default function VisitsPage() {
  const queryClient = useQueryClient()

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 50,
  })

  // Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Query params para useVisits (useMemo para evitar recreación en cada render)
  const queryParams: VisitsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch]
  )

  // React Query: Fetch visits con cache automático
  const { data, isLoading, isPlaceholderData } = useVisits(queryParams)

  // Cargar visit statuses para el filtro
  const { data: visitStatuses } = useQuery({
    queryKey: ['visit-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/visit-statuses')
      if (!response.ok) throw new Error('Error al cargar estados')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - statuses cambian raramente
  })

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

  const columns = createColumns({
    statuses: statuses.map((s: any) => ({
      id: s.id,
      label: s.name,
      color: { bgClass: s.color.bgClass, textClass: s.color.textClass },
    })),
    updatingVisitId: updateVisitMutation.isPending ? updateVisitMutation.variables?.id : null,
  })

  // Función de filtrado global: busca en nombre, teléfono, dirección y comuna
  const globalFilterFn = (row: Row<Visit>, _columnId: string, filterValue: string) => {
    const visit = row.original
    const searchValue = filterValue.toLowerCase()

    // Buscar en nombre
    if (visit.name.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en teléfono
    if (visit.phone && visit.phone.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en calle
    if (visit.street.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en comuna
    if (visit.comuna.toLowerCase().includes(searchValue)) {
      return true
    }

    return false
  }

  // Formatear opciones para el filtro de status
  const statusFilterOptions = (statuses || []).map((status: any) => ({
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
            enableGlobalFilter={true}
            globalFilterFn={globalFilterFn}
            // Server-side pagination
            manualPagination={true}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            onSearchChange={handleSearchChange}
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
