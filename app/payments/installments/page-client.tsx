'use client'

import { useState, useMemo } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/data-table'
import { createColumns } from './columns'
import { useInstallments, type InstallmentsQueryParams } from '@/hooks/queries/use-installments'
import { useConfiguration } from '@/hooks/use-configuration'

export function InstallmentsPageClient() {
  const { configuration } = useConfiguration()

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // Filtro de estado con "pending" por defecto
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending'])

  // Query params derivados
  const queryParams: InstallmentsQueryParams = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
      // Si hay 1 filtro seleccionado, pasarlo al server; si hay 0 o 2, no filtrar
      status:
        statusFilter.length === 1
          ? (statusFilter[0] as 'pending' | 'paid')
          : undefined,
    }),
    [pagination.pageIndex, pagination.pageSize, statusFilter]
  )

  const { data, isLoading, isPlaceholderData } = useInstallments(queryParams)

  const installments = data?.installments || []
  const pageCount = data?.pagination.totalPages || 0

  const columns = useMemo(
    () => createColumns({ locale: configuration.locale }),
    [configuration.locale]
  )

  // Opciones para el filtro de estado
  const statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Pagado', value: 'paid' },
  ]

  return (
    <AppLayout
      pageTitle="Cuotas Comercio"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Pagos', href: '/payments' },
        { label: 'Cuotas Comercio' },
      ]}
    >
      {isLoading && !isPlaceholderData ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando cuotas...</div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={installments}
          searchKey="associated"
          searchPlaceholder="Buscar por cliente..."
          // Server-side pagination
          manualPagination={true}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={setPagination}
          // Filtro de estado
          filterableColumns={[
            {
              id: 'status',
              title: 'Estado',
              options: statusOptions,
              selectedValues: statusFilter,
              onFilterChange: (values) => {
                setStatusFilter(values)
                if (pagination.pageIndex !== 0) {
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                }
              },
            },
          ]}
        />
      )}
    </AppLayout>
  )
}
