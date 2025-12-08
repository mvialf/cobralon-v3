'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Upload, Download } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { NewCustomerDialog } from '@/components/dialogs/customer/new-customer-dialog'
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
import { useCustomers, type CustomersQueryParams } from '@/hooks/queries/use-customers'
import { useDebounce } from '@/hooks/use-debounce'

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const [isExporting, setIsExporting] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Callback para refrescar la tabla después de operaciones de crédito
  const handleCustomerUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }, [queryClient])

  // Handler para exportar clientes a Excel
  const handleExport = useCallback(async (search?: string) => {
    setIsExporting(true)
    setShowExportDialog(false)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)

      const response = await fetch(`/api/customers/export?${params}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al exportar')
      }

      // Descargar el archivo
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clientes-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exportando clientes:', error)
      // TODO: Mostrar toast de error
    } finally {
      setIsExporting(false)
    }
  }, [])

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

  // Handler para click en botón exportar
  const handleExportClick = useCallback(() => {
    // Si hay filtro activo, mostrar diálogo de confirmación
    if (debouncedSearch) {
      setShowExportDialog(true)
    } else {
      // Sin filtro, exportar todo directamente
      handleExport()
    }
  }, [debouncedSearch, handleExport])

  // Query params para useCustomers (useMemo para evitar recreación en cada render)
  const queryParams: CustomersQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1, // API usa 1-based
      limit: pagination.pageSize,
      search: debouncedSearch || undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, debouncedSearch]
  )

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
          <Button variant="outline" onClick={handleExportClick} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/import?tab=customers">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Link>
          </Button>
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
            searchValue={searchTerm}
            // Server-side pagination
            manualPagination={true}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            onSearchChange={handleSearchChange}
          />
        )}
      </div>

      {/* Diálogo de confirmación de exportación */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Qué deseas exportar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes un filtro activo: &quot;{debouncedSearch}&quot;
              {data?.pagination.total !== undefined && (
                <span className="block mt-1">
                  ({data.pagination.total} cliente{data.pagination.total !== 1 ? 's' : ''}{' '}
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
            <AlertDialogAction onClick={() => handleExport(debouncedSearch)}>
              Exportar filtrados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}
