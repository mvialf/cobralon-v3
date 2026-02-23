'use client'

import { useState, useEffect, useMemo } from 'react'
import { type PaginationState, type SortingState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { NewProjectDialog } from '@/components/dialogs/projects/new-project-dialog'
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
import { DataTable, type BulkAction } from '@/components/data-table'
import { createColumns, type Project } from './columns'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  useProjects,
  useUpdateProjectStatus,
  useUpdateProjectDate,
  useBulkDeleteProjects,
  type ProjectsQueryParams,
} from '@/hooks/queries/use-projects'
import { useDebounce } from '@/hooks/use-debounce'
import { useProjectStatuses } from '@/hooks/queries/use-project-statuses'

export function ProjectsPageClient() {
  const queryClient = useQueryClient()

  // Estado para bulk delete
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [projectsToDelete, setProjectsToDelete] = useState<Project[]>([])

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0, // TanStack usa 0-based
    pageSize: 50,
  })

  // Estado de búsqueda con debounce
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Estado de filtro de proyecto (Activo/Finalizado/all)
  const [projectState, setProjectState] = useState<'Activo' | 'Finalizado' | 'all'>('Activo')

  // Estado de filtro de status (IDs seleccionados, incluyendo 'null' para sin estado)
  const [statusIds, setStatusIds] = useState<string[]>([])

  // Estado de sorting server-side
  const [sorting, setSorting] = useState<SortingState>([])

  // Query params para useProjects (useMemo para evitar recreación en cada render)
  const queryParams: ProjectsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
      statusIds: statusIds.length > 0 ? statusIds : undefined,
      projectState,
      sortBy: sorting[0]?.id || undefined,
      sortOrder: sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch, statusIds, projectState, sorting]
  )

  // React Query: Fetch projects con cache automático
  // NOTA: En primera carga, usará datos pre-cargados por HydrationBoundary
  const { data, isLoading, isPlaceholderData } = useProjects(queryParams)

  // Cargar statuses para el filtro (metadata) - usando hook compartido
  // NOTA: También pre-cargado por HydrationBoundary
  const { data: statuses = [] } = useProjectStatuses()

  // Mutation hooks para actualizar datos de proyecto
  const updateStatusMutation = useUpdateProjectStatus()
  const updateDateMutation = useUpdateProjectDate()
  const bulkDeleteMutation = useBulkDeleteProjects()

  // Extraer data del hook (con fallbacks)
  const projects = data?.projects || []
  const pageCount = data?.pagination.totalPages || 0

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
            if (queryParams.sortBy) params.append('sortBy', queryParams.sortBy)
            if (queryParams.sortOrder) params.append('sortOrder', queryParams.sortOrder)

            const response = await fetch(`/api/projects?${params}`)
            if (!response.ok) throw new Error('Error al precargar')
            return response.json()
          },
        })
      }
    }
  }, [data, isPlaceholderData, queryClient, queryParams])

  // Handlers para cambios inline
  const handleStatusChange = async (projectId: string, newStatusId: string) => {
    await updateStatusMutation.mutateAsync({ projectId, statusId: newStatusId })
  }

  const handleDateChange = async (projectId: string, newDate: Date) => {
    await updateDateMutation.mutateAsync({ projectId, date: newDate.toISOString() })
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

  // Handler para bulk delete
  const handleBulkDelete = async (selectedProjects: Project[]) => {
    setProjectsToDelete(selectedProjects)
    setShowBulkDeleteDialog(true)
  }

  const confirmBulkDelete = async () => {
    const ids = projectsToDelete.map((p) => p.id)
    await bulkDeleteMutation.mutateAsync(ids)
    setShowBulkDeleteDialog(false)
    setProjectsToDelete([])
  }

  // Configuración de acciones masivas
  const bulkActions: BulkAction<Project>[] = [
    {
      id: 'delete',
      label: 'Eliminar',
      icon: Trash2,
      variant: 'destructive',
      onClick: handleBulkDelete,
    },
  ]

  const columns = createColumns({
    statuses: statuses.map((s) => ({
      id: s.id,
      label: s.name,
      color: { bgClass: s.color.bgClass },
    })),
    updatingProjectId: updateStatusMutation.isPending
      ? updateStatusMutation.variables?.projectId
      : null,
    updatingDateProjectId: updateDateMutation.isPending
      ? updateDateMutation.variables?.projectId
      : null,
    onDataChanged: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  // Formatear opciones para el filtro de status
  const statusFilterOptions = (statuses || []).map((status) => ({
    label: status.name,
    value: status.id,
    bgClass: status.color.bgClass,
  }))

  const projectStateToggle = (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={projectState}
      onValueChange={(value) => {
        if (!value) return
        setProjectState(value as 'Activo' | 'Finalizado' | 'all')
        if (pagination.pageIndex !== 0) {
          setPagination({ ...pagination, pageIndex: 0 })
        }
      }}
    >
      <ToggleGroupItem value="Activo" className="text-xs">
        Activos
      </ToggleGroupItem>
      <ToggleGroupItem value="Finalizado" className="text-xs">
        Finalizados
      </ToggleGroupItem>
      <ToggleGroupItem value="all" className="text-xs">
        Todos
      </ToggleGroupItem>
    </ToggleGroup>
  )

  return (
    <AppLayout
      pageTitle="Proyectos"
      breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Proyectos' }]}
      action={<NewProjectDialog />}
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
            serverFacets={data?.facets}
            toolbarExtra={projectStateToggle}
            filterableColumns={[
              {
                id: 'projectStatus',
                title: 'Estado',
                options: statusFilterOptions,
                selectedValues: statusIds,
                onFilterChange: (values) => {
                  setStatusIds(values)
                  // Resetear a página 1 cuando cambia el filtro
                  if (pagination.pageIndex !== 0) {
                    setPagination({ ...pagination, pageIndex: 0 })
                  }
                },
              },
            ]}
            // Toolbar: conteo y limpiar filtros server-side
            totalCount={data?.pagination.total}
            totalCountLabel="proyectos"
            activeFilterCount={(statusIds.length > 0 ? 1 : 0) + (projectState !== 'Activo' ? 1 : 0)}
            onClearAllFilters={() => {
              setStatusIds([])
              setProjectState('Activo')
            }}
            meta={{
              handleStatusChange,
              handleDateChange,
            }}
            // Selección múltiple y acciones masivas
            enableRowSelection
            bulkActions={bulkActions}
          />
        )}
      </div>

      {/* Diálogo de confirmación de eliminación masiva */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyectos seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar{' '}
              <span className="font-semibold text-foreground">
                {projectsToDelete.length} proyecto{projectsToDelete.length !== 1 ? 's' : ''}
              </span>
              . Esta acción no se puede deshacer.
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
