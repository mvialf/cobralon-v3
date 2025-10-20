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

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  enableGlobalFilter?: boolean
  filterableColumns?: {
    id: string
    title: string
    options: { label: string; value: string }[]
  }[]
}

export function DataTableToolbar<TData>({
  table,
  searchKey = '',
  searchPlaceholder = 'Buscar...',
  enableGlobalFilter = false,
  filterableColumns = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter

  return (
    <div className="flex py-4 px-4 items-center bg-card rounded-lg justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchKey && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={
                enableGlobalFilter
                  ? ((table.getState().globalFilter as string) ?? '')
                  : ((table.getColumn(searchKey)?.getFilterValue() as string) ?? '')
              }
              onChange={(event) =>
                enableGlobalFilter
                  ? table.setGlobalFilter(event.target.value)
                  : table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="pl-8 w-[150px] lg:w-[250px]"
            />
          </div>
        )}
        {filterableColumns.map((column) => {
          const tableColumn = table.getColumn(column.id)
          return (
            tableColumn && (
              <DataTableFacetedFilter
                key={column.id}
                column={tableColumn}
                title={column.title}
                options={column.options}
              />
            )
          )
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
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
