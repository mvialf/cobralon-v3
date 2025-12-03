'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Upload, Download } from 'lucide-react'
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
import { DataTable } from '@/components/data-table/data-table'
import { createColumns } from './columns'
import {
  useProjects,
  useUpdateProjectStatus,
  type ProjectsQueryParams,
} from '@/hooks/queries/use-projects'
import { useDebounce } from '@/hooks/use-debounce'
import { useProjectStatuses } from '@/hooks/queries/use-project-statuses'

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

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
      projectState,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch, projectState]
  )

  // React Query: Fetch projects con cache automático
  const { data, isLoading, isPlaceholderData } = useProjects(queryParams)

  // Cargar statuses para el filtro (metadata) - usando hook compartido
  const { data: statuses = [] } = useProjectStatuses()

  // Mutation hook para actualizar estado de proyecto
  const updateStatusMutation = useUpdateProjectStatus()

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
    onDataChanged: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

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
    </AppLayout>
  )
}
