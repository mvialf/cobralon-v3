'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Search, EyeOff } from 'lucide-react'

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

// Tipo para facets del servidor
interface ServerFacet {
  value: string
  count: number
}

interface ServerFacets {
  [columnId: string]: ServerFacet[]
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
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    !!table.getState().globalFilter ||
    table.getState().sorting.length > 0

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

  return (
    <div className="flex py-4 px-4 items-center bg-popover rounded-lg justify-between border-border">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={
                onSearchChange
                  ? (searchValue ?? '') // Use searchValue from parent for server-side
                  : enableGlobalFilter
                    ? ((table.getState().globalFilter as string) ?? '')
                    : ((table.getColumn(searchKey)?.getFilterValue() as string) ?? '')
              }
              onChange={(event) => handleSearchChange(event.target.value)}
              className="pl-8 pr-8 w-[150px] lg:w-[250px]"
            />
            {/* Botón para limpiar búsqueda */}
            {(onSearchChange
              ? searchValue
              : enableGlobalFilter
                ? table.getState().globalFilter
                : table.getColumn(searchKey)?.getFilterValue()) && (
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
              table.resetSorting()
            }}
            className="h-8 px-2 lg:px-3"
          >
            Limpiar
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
              <EyeOff className="mr-2 h-4 w-4" />
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
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
