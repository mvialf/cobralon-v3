'use client'

import { useState, useMemo } from 'react'
import { type PaginationState } from '@tanstack/react-table'
import { AppLayout } from '@/components/layout/app-layout'
import { DataTable } from '@/components/data-table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createColumns } from './columns'
import { useInstallments, type InstallmentsQueryParams } from '@/hooks/queries/use-installments'
import { useConfiguration } from '@/hooks/use-configuration'

/** Genera label del mes capitalizado, ej: "Abril 2026" */
function getMonthLabel(offset: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

/** Retorna startDate y endDate ISO para un mes dado por offset */
function getMonthRange(offset: number): { startDate: string; endDate: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  return { startDate: start.toISOString(), endDate: end.toISOString() }
}

const MONTH_TABS = [0, 1, 2] as const

export function InstallmentsPageClient() {
  const { configuration } = useConfiguration()

  // Tab de mes seleccionado (0 = actual, 1 = siguiente, 2 = +2)
  const [monthOffset, setMonthOffset] = useState(0)

  // Estado de paginación server-side
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // Filtro de estado con "pending" por defecto
  const [statusFilter, setStatusFilter] = useState<string[]>(['pending'])

  // Rango de fechas derivado del mes seleccionado
  const monthRange = useMemo(() => getMonthRange(monthOffset), [monthOffset])

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
      startDate: monthRange.startDate,
      endDate: monthRange.endDate,
    }),
    [pagination.pageIndex, pagination.pageSize, statusFilter, monthRange]
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
      <Tabs
        value={String(monthOffset)}
        onValueChange={(v) => {
          setMonthOffset(Number(v))
          setPagination((prev) => ({ ...prev, pageIndex: 0 }))
        }}
      >
        <TabsList>
          {MONTH_TABS.map((offset) => (
            <TabsTrigger key={offset} value={String(offset)}>
              {getMonthLabel(offset)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
