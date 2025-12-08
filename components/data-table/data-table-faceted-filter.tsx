'use client'

import * as React from 'react'
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons'
import { Column } from '@tanstack/react-table'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusOptionDisplay } from '@/components/ui/status-option-display'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

// Tipo para facets del servidor
interface ServerFacet {
  value: string
  count: number
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
    bgClass?: string // Para status badges
  }[]
  onFilterChange?: (values: string[]) => void
  // Server-side facets: cuando manualFiltering=true, usar estos en lugar de calcular
  serverFacets?: ServerFacet[]
  // Server-side filtering: valores seleccionados controlados externamente
  controlledSelectedValues?: string[]
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  onFilterChange,
  serverFacets,
  controlledSelectedValues,
}: DataTableFacetedFilterProps<TData, TValue>) {
  // Usar serverFacets si están disponibles (server-side), sino calcular client-side
  const clientFacets = column?.getFacetedUniqueValues()
  const facets = React.useMemo(() => {
    if (serverFacets) {
      // Convertir serverFacets array a Map para compatibilidad
      return new Map(serverFacets.map((f) => [f.value, f.count]))
    }
    return clientFacets
  }, [serverFacets, clientFacets])

  // Para server-side filtering: usar valores controlados externamente
  // Para client-side: usar el estado interno de TanStack Table
  const selectedValues = new Set(
    controlledSelectedValues ?? (column?.getFilterValue() as string[])
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <PlusCircledIcon className="mr-2 h-4 w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} seleccionados
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                const facetCount = facets?.get(option.value)

                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value)
                      } else {
                        selectedValues.add(option.value)
                      }
                      const filterValues = Array.from(selectedValues)
                      column?.setFilterValue(filterValues.length ? filterValues : undefined)
                      onFilterChange?.(filterValues)
                    }}
                  >
                    {/* Usar StatusOptionDisplay si la opción tiene bgClass (es un status) */}
                    {option.bgClass ? (
                      <StatusOptionDisplay
                        option={{
                          id: option.value,
                          label: option.label,
                          color: { bgClass: option.bgClass },
                        }}
                        isSelected={isSelected}
                        showCheckbox
                        showCounter
                        count={facetCount}
                      />
                    ) : (
                      /* Fallback para opciones sin bgClass (filtros simples) */
                      <>
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible'
                          )}
                        >
                          <CheckIcon className={cn('h-4 w-4')} />
                        </div>
                        {option.icon && (
                          <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{option.label}</span>
                        {facetCount && (
                          <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                            {facetCount}
                          </span>
                        )}
                      </>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      column?.setFilterValue(undefined)
                      onFilterChange?.([])
                    }}
                    className="justify-center text-center"
                  >
                    Limpiar filtros
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
