'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Upload, Download, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { NewProjectDialog } from '@/components/dialogs/projects/new-project-dialog'
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
import { DataTable, type BulkAction } from '@/components/data-table'
import { createColumns, type Project } from './columns'
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
  const [isExporting, setIsExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

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

  // Handler para exportar proyectos a Excel
  const handleExport = useCallback(
    async (options?: { search?: string; projectState?: 'Activo' | 'Finalizado' | 'all' }) => {
      setIsExporting(true)
      setShowExportDialog(false)
      try {
        const params = new URLSearchParams()
        if (options?.search) params.append('search', options.search)
        if (options?.projectState) params.append('projectState', options.projectState)

        const response = await fetch(`/api/projects/export?${params}`)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error al exportar')
        }

        // Descargar el archivo
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `proyectos-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error exportando proyectos:', error)
        // TODO: Mostrar toast de error
      } finally {
        setIsExporting(false)
      }
    },
    []
  )

  // Verificar si hay filtros activos
  const hasActiveFilters = debouncedSearch || projectState !== 'all'

  // Handler para click en botón exportar
  const handleExportClick = useCallback(() => {
    // Si hay filtros activos, mostrar diálogo de confirmación
    if (hasActiveFilters) {
      setShowExportDialog(true)
    } else {
      // Sin filtros, exportar todo directamente
      handleExport()
    }
  }, [hasActiveFilters, handleExport])

  // Query params para useProjects (useMemo para evitar recreación en cada render)
  const queryParams: ProjectsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
      statusIds: statusIds.length > 0 ? statusIds : undefined,
      projectState,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch, statusIds, projectState]
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
    statuses: statuses.map((s: any) => ({
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
  const statusFilterOptions = (statuses || []).map((status: any) => ({
    label: status.name,
    value: status.id,
    bgClass: status.color.bgClass,
  }))

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
          <Button variant="outline" onClick={handleExportClick} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
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
            searchValue={searchTerm}
            // Server-side pagination
            manualPagination={true}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            onSearchChange={handleSearchChange}
            // Server-side filtering
            manualFiltering={true}
            serverFacets={data?.facets}
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
              {
                id: 'projectState',
                title: 'Estado Proyecto',
                options: projectStateFilterOptions,
                // Sincronizar estado visual con estado React
                selectedValues: projectState === 'all' ? [] : [projectState],
                onFilterChange: (values) => {
                  // Si no hay valores o están ambos seleccionados, mostrar todos
                  const newState =
                    values.length === 0 || values.length >= 2
                      ? 'all'
                      : (values[0] as 'Activo' | 'Finalizado' | 'all')
                  setProjectState(newState)
                  // Resetear a página 1 cuando cambia el filtro
                  if (pagination.pageIndex !== 0) {
                    setPagination({ ...pagination, pageIndex: 0 })
                  }
                },
              },
            ]}
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

      {/* Diálogo de confirmación de exportación */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Qué deseas exportar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes filtros activos:
              {debouncedSearch && (
                <span className="block mt-1">• Búsqueda: &quot;{debouncedSearch}&quot;</span>
              )}
              {projectState !== 'all' && (
                <span className="block mt-1">
                  • Estado: {projectState === 'Activo' ? 'Activos' : 'Finalizados'}
                </span>
              )}
              {data?.pagination.total !== undefined && (
                <span className="block mt-2 font-medium">
                  ({data.pagination.total} proyecto{data.pagination.total !== 1 ? 's' : ''}{' '}
                  encontrado{data.pagination.total !== 1 ? 's' : ''})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleExport()}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Exportar todos
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() =>
                handleExport({
                  search: debouncedSearch || undefined,
                  projectState: projectState,
                })
              }
            >
              Exportar filtrados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
