'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Search, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import type { ServerFacets } from './data-table'

/** Convierte camelCase/PascalCase a label legible: "projectStatus" → "Proyecto status" */
function formatColumnLabel(id: string): string {
  return id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  searchValue?: string
  enableGlobalFilter?: boolean
  filterableColumns?: {
    id: string
    title: string
    options: { label: string; value: string; bgClass?: string }[]
    onFilterChange?: (values: string[]) => void
    // Server-side filtering: valores actualmente seleccionados
    selectedValues?: string[]
  }[]
  onSearchChange?: (search: string) => void
  // Server-side filtering props
  manualFiltering?: boolean
  serverFacets?: ServerFacets
  // Cantidad de filtros server-side activos (para mostrar botón "Limpiar")
  activeFilterCount?: number
  // Callback para limpiar todos los filtros (incluyendo server-side)
  onClearAllFilters?: () => void
  // Conteo total de resultados
  totalCount?: number
  // Label para el conteo (ej: "proyectos", "pagos")
  totalCountLabel?: string
  // Slot para contenido extra entre el search y los filtros facetados
  toolbarExtra?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchKey = '',
  searchPlaceholder = 'Buscar...',
  searchValue,
  enableGlobalFilter = false,
  filterableColumns = [],
  onSearchChange,
  manualFiltering: _manualFiltering = false,
  serverFacets,
  activeFilterCount = 0,
  onClearAllFilters,
  totalCount,
  totalCountLabel,
  toolbarExtra,
}: DataTableToolbarProps<TData>) {
  const hasClientFilters =
    table.getState().columnFilters.length > 0 || !!table.getState().globalFilter
  const hasServerFilters = activeFilterCount > 0 || !!searchValue
  const isFiltered = hasClientFilters || hasServerFilters

  // Manejar cambio de búsqueda
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      // Server-side search
      onSearchChange(value)
    } else {
      // Client-side search
      if (enableGlobalFilter) {
        table.setGlobalFilter(value)
      } else {
        table.getColumn(searchKey)?.setFilterValue(value)
      }
    }
  }

  const currentSearchValue = onSearchChange
    ? (searchValue ?? '')
    : enableGlobalFilter
      ? ((table.getState().globalFilter as string) ?? '')
      : ((table.getColumn(searchKey)?.getFilterValue() as string) ?? '')

  return (
    <div className="flex py-3 px-4 items-center justify-between border-b border-border">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={currentSearchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="pl-8 pr-8 w-full max-w-xs"
            />
            {/* Botón para limpiar búsqueda */}
            {currentSearchValue && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {toolbarExtra}
        {filterableColumns.map((column) => {
          const tableColumn = table.getColumn(column.id)
          // Obtener facets del servidor para esta columna (si existen)
          const columnServerFacets = serverFacets?.[column.id]
          return (
            tableColumn && (
              <DataTableFacetedFilter
                key={column.id}
                column={tableColumn}
                title={column.title}
                options={column.options}
                onFilterChange={column.onFilterChange}
                serverFacets={columnServerFacets}
                controlledSelectedValues={column.selectedValues}
              />
            )
          )
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters()
              if (enableGlobalFilter) table.setGlobalFilter('')
              if (onSearchChange) onSearchChange('')
              onClearAllFilters?.()
            }}
            className="h-8 px-2 lg:px-3"
          >
            Limpiar
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {totalCount !== undefined && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {totalCount} {totalCountLabel || 'resultados'}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Alternar columnas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {formatColumnLabel(column.id)}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
