'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  FilterFn,
  TableMeta,
  RowData,
} from '@tanstack/react-table'

// Extender ColumnMeta para incluir clases CSS personalizadas
// y registrar funciones de filtrado personalizadas
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string
    cellClassName?: string
  }

  // Registrar 'normalized' como nombre de función de filtrado válido
  interface FilterFns {
    normalized: FilterFn<unknown>
  }
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import { DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'
import { normalizedGlobalFilter, normalizedIncludesString } from './filter-functions'

// Tipo para facets del servidor
export interface ServerFacet {
  value: string
  count: number
}

export interface ServerFacets {
  [columnId: string]: ServerFacet[]
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  searchValue?: string
  enableGlobalFilter?: boolean
  globalFilterFn?: FilterFn<TData>
  filterableColumns?: {
    id: string
    title: string
    options: { label: string; value: string; bgClass?: string }[]
    onFilterChange?: (values: string[]) => void
    // Server-side filtering: valores actualmente seleccionados
    selectedValues?: string[]
  }[]
  onRowSelectionChange?: (selectedRows: TData[]) => void
  enableRowSelection?: boolean
  meta?: TableMeta<TData>
  // Server-side pagination props
  manualPagination?: boolean
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  onSearchChange?: (search: string) => void
  // Server-side filtering props
  manualFiltering?: boolean
  serverFacets?: ServerFacets
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = '',
  searchPlaceholder = 'Buscar...',
  searchValue,
  enableGlobalFilter = false,
  globalFilterFn,
  filterableColumns = [],
  onRowSelectionChange,
  enableRowSelection = false,
  meta,
  // Server-side pagination
  manualPagination = false,
  pageCount: controlledPageCount,
  pagination: controlledPagination,
  onPaginationChange,
  onSearchChange,
  // Server-side filtering
  manualFiltering = false,
  serverFacets,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // Estado interno de paginación (solo para client-side)
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  // Determinar la función de filtrado global a usar
  // Si se pasa una custom, usarla. Si no, usar normalizedGlobalFilter por defecto.
  const effectiveGlobalFilterFn = globalFilterFn ?? normalizedGlobalFilter

  const table = useReactTable({
    data,
    columns,
    // Configuración de paginación server-side
    manualPagination,
    pageCount: manualPagination ? (controlledPageCount ?? -1) : undefined,
    // Configuración de filtrado server-side
    manualFiltering,
    // Funciones de filtrado: siempre registrar (TanStack las ignora si manualFiltering=true)
    filterFns: {
      normalized: normalizedIncludesString,
    },
    // defaultColumn solo aplica cuando filtrado es client-side
    defaultColumn: manualFiltering
      ? undefined
      : {
          filterFn: 'normalized',
        },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      // Usar paginación controlada o interna
      pagination: manualPagination
        ? (controlledPagination ?? internalPagination)
        : internalPagination,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: manualPagination
      ? (updaterOrValue) => {
          // Manejar tanto funciones como valores directos
          if (onPaginationChange) {
            const newPagination =
              typeof updaterOrValue === 'function'
                ? updaterOrValue(controlledPagination ?? internalPagination)
                : updaterOrValue
            onPaginationChange(newPagination)
          }
        }
      : setInternalPagination,
    // Función de filtrado global normalizada (ignora acentos) - solo client-side
    globalFilterFn: manualFiltering ? undefined : effectiveGlobalFilterFn,
    // Row models - siempre incluir todos, TanStack los ignora si es manual
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta,
  })

  // Callback cuando cambia la selección de filas
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
      onRowSelectionChange(selectedRows)
    }
  }, [rowSelection, onRowSelectionChange, table])

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        enableGlobalFilter={enableGlobalFilter}
        filterableColumns={filterableColumns}
        onSearchChange={onSearchChange}
        manualFiltering={manualFiltering}
        serverFacets={serverFacets}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(header.column.columnDef.meta?.headerClassName)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(cell.column.columnDef.meta?.cellClassName)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
