'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'

import { useDebounce } from '@/hooks/use-debounce'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'

/**
 * Tipo para Aftersale retornado por la API de búsqueda
 */
export interface AftersaleSearchResult {
  id: string
  description: string
  contactPhone: string
  reportedAt: string
  tasks: unknown[]
  project: {
    id: string
    projectNumber: string
    projectName: string | null
    street: string
    apartment: string | null
    comuna: string
    region: string
    customer: {
      id: string
      name: string
    }
  }
  aftersaleStatus: {
    id: string
    name: string
    color: {
      bgClass: string
      textClass: string
    }
  }
}

interface AftersaleSearchFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  onAftersaleSelect?: (aftersale: AftersaleSearchResult | null) => void
}

/**
 * Componente reutilizable para búsqueda y selección de Aftersale
 *
 * Features:
 * - Combobox con búsqueda server-side
 * - Muestra número de proyecto, cliente y estado
 * - Solo aftersales NO finalizados (status.isFinal = false)
 * - Debounce de búsqueda (300ms)
 *
 * Uso:
 * ```tsx
 * <AftersaleSearchField
 *   control={form.control}
 *   onAftersaleSelect={(aftersale) => {
 *     if (aftersale) {
 *       form.setValue('aftersaleId', aftersale.id)
 *     }
 *   }}
 * />
 * ```
 */
export function AftersaleSearchField({ control, onAftersaleSelect }: AftersaleSearchFieldProps) {
  // State para búsqueda
  const [searchTerm, setSearchTerm] = React.useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Fetch aftersales activos (server-side search)
  const { data: aftersales = [], isLoading } = useQuery({
    queryKey: ['aftersales-search-active', debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/aftersales/search-active?q=${debouncedSearch}&limit=20`)
      if (!res.ok) throw new Error('Error al buscar postventas')
      return res.json() as Promise<AftersaleSearchResult[]>
    },
    enabled: debouncedSearch.length >= 2,
  })

  // Callback cuando se selecciona un aftersale del Combobox
  const handleAftersaleChange = (aftersaleId: string) => {
    const aftersale = aftersales.find((a) => a.id === aftersaleId) ?? null
    onAftersaleSelect?.(aftersale)
  }

  return (
    <FormField
      control={control}
      name="aftersaleId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Postventa *</FormLabel>
          <FormControl>
            <Combobox<AftersaleSearchResult>
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value)
                handleAftersaleChange(value)
              }}
              options={aftersales}
              getOptionValue={(a) => a.id}
              getOptionLabel={(a) => `${a.project.projectNumber} - ${a.project.customer.name}`}
              renderOption={(aftersale) => (
                <div className="space-y-1">
                  {/* Header: Proyecto + Cliente */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm text-muted-foreground">
                        #{aftersale.project.projectNumber}
                      </span>
                      <span className="ml-2 font-medium">{aftersale.project.customer.name}</span>
                    </div>
                    {/* Badge de estado */}
                    <Badge
                      variant="secondary"
                      className={aftersale.aftersaleStatus.color.bgClass}
                      style={{
                        color: aftersale.aftersaleStatus.color.textClass || undefined,
                      }}
                    >
                      {aftersale.aftersaleStatus.name}
                    </Badge>
                  </div>
                  {/* Descripción truncada */}
                  {aftersale.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {aftersale.description}
                    </p>
                  )}
                </div>
              )}
              placeholder="Buscar postventa..."
              searchPlaceholder="Escribe número, cliente o descripción..."
              emptyMessage={
                debouncedSearch.length < 2
                  ? 'Escribe al menos 2 caracteres para buscar'
                  : 'No se encontraron postventas activas'
              }
              loading={isLoading}
              loadingText="Buscando postventas..."
              contentWidth="450px"
              onSearchChange={setSearchTerm}
              disableFiltering={true}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
