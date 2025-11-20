'use client'

import { useState, useEffect, useMemo } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { Row } from '@tanstack/react-table'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { NewProjectDialog } from '@/components/dialogs/projects/new-project-dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table/data-table'
import { createColumns, type Project } from './columns'
import {
  useProjects,
  useUpdateProjectStatus,
  type ProjectsQueryParams,
} from '@/hooks/queries/use-projects'
import { useDebounce } from '@/hooks/use-debounce'

export default function ProjectsPage() {
  const queryClient = useQueryClient()

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 20,
  })

  // Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Estado de filtro de proyecto (Activo/Finalizado/all)
  const [projectState, setProjectState] = useState<'Activo' | 'Finalizado' | 'all'>('Activo')

  // Query params para useProjects (useMemo para evitar recreación en cada render)
  const queryParams: ProjectsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
      projectState,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch, projectState]
  )

  // React Query: Fetch projects con cache automático
  const { data, isLoading, isPlaceholderData } = useProjects(queryParams)

  // Cargar statuses para el filtro (metadata)
  const { data: statusesData } = useQuery({
    queryKey: ['project-statuses'],
    queryFn: async () => {
      const response = await fetch('/api/project-status')
      if (!response.ok) throw new Error('Error al cargar estados')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - statuses cambian raramente
  })

  // Mutation hook para actualizar estado de proyecto
  const updateStatusMutation = useUpdateProjectStatus()

  // Extraer data del hook (con fallbacks)
  const projects = data?.projects || []
  const pageCount = data?.pagination.totalPages || 0
  const statuses = statusesData?.projectStatuses || []

  // Prefetch página siguiente para mejor UX
  useEffect(() => {
    if (!isPlaceholderData && data?.pagination) {
      const { page, totalPages } = data.pagination
      const hasNextPage = page < totalPages

      if (hasNextPage) {
        // Prefetch siguiente página en background
        queryClient.prefetchQuery({
          queryKey: ['projects', { ...queryParams, page: page + 1 }],
          queryFn: async () => {
            const params = new URLSearchParams({
              page: String(page + 1),
              limit: String(queryParams.limit),
            })
            if (queryParams.search) params.append('search', queryParams.search)
            if (queryParams.projectState) params.append('projectState', queryParams.projectState)

            const response = await fetch(`/api/projects?${params}`)
            if (!response.ok) throw new Error('Error al precargar')
            return response.json()
          },
        })
      }
    }
  }, [data, isPlaceholderData, queryClient, queryParams])

  // Mutation hook maneja loading state, errores y auto-invalidación
  const handleStatusChange = async (projectId: string, newStatusId: string) => {
    await updateStatusMutation.mutateAsync({ projectId, statusId: newStatusId })
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
      color: { bgClass: s.color.bgClass },
    })),
    updatingProjectId: updateStatusMutation.isPending
      ? updateStatusMutation.variables?.projectId
      : null,
  })

  // Función de filtrado global: busca en projectNumber, customer.name y projectName
  const globalFilterFn = (row: Row<Project>, _columnId: string, filterValue: string) => {
    const project = row.original as Project
    const searchValue = filterValue.toLowerCase()

    // Buscar en número de proyecto
    if (project.projectNumber.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en nombre del cliente
    if (project.customer.name.toLowerCase().includes(searchValue)) {
      return true
    }

    // Buscar en nombre del proyecto (si existe)
    if (project.projectName && project.projectName.toLowerCase().includes(searchValue)) {
      return true
    }

    return false
  }

  // Formatear opciones para el filtro de status
  const statusFilterOptions = [
    // Opción para "Sin estado"
    { label: 'Sin estado', value: 'null' },
    // Opciones de statuses disponibles con colores
    ...(statuses || []).map((status: any) => ({
      label: status.name,
      value: status.id,
      bgClass: status.color.bgClass,
    })),
  ]

  // Opciones para el filtro de Estado del Proyecto (Activo/Finalizado)
  const projectStateFilterOptions = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'Activo' },
    { label: 'Finalizados', value: 'Finalizado' },
  ]

  return (
    <AppLayout
      pageTitle="Proyectos"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Proyectos' }]}
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/import?tab=projects">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Link>
          </Button>
          <NewProjectDialog />
        </div>
      }
    >
      <div className="space-y-4">
        {isLoading && !isPlaceholderData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Cargando proyectos...</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={projects}
            searchKey="search"
            searchPlaceholder="Buscar por número, cliente o nombre..."
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
                id: 'projectStatus',
                title: 'Estado',
                options: statusFilterOptions,
              },
              {
                id: 'projectState',
                title: 'Estado Proyecto',
                options: projectStateFilterOptions,
                onFilterChange: (values) => {
                  const newState = values.length > 0 ? values[0] : 'all'
                  setProjectState(newState as 'Activo' | 'Finalizado' | 'all')
                  // Resetear a página 1 cuando cambia el filtro
                  if (pagination.pageIndex !== 0) {
                    setPagination({ ...pagination, pageIndex: 0 })
                  }
                },
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
