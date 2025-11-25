'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'

import { useDebounce } from '@/hooks/use-debounce'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'

/**
 * Tipo para Visit retornado por la API de búsqueda
 */
export interface VisitSearchResult {
  id: string
  name: string
  phone: string | null
  street: string
  apartment: string | null
  comuna: string
  region: string
  date: string
  observations: string | null
  visitStatus: {
    id: string
    name: string
    color: {
      bgClass: string
      textClass: string
    }
  }
}

interface VisitSearchFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  onVisitSelect?: (visit: VisitSearchResult | null) => void
}

/**
 * Componente reutilizable para búsqueda y selección de Visit
 *
 * Features:
 * - Combobox con búsqueda server-side
 * - Muestra nombre, dirección y estado
 * - Solo visitas NO finalizadas (status.isFinal = false)
 * - Debounce de búsqueda (300ms)
 *
 * Uso:
 * ```tsx
 * <VisitSearchField
 *   control={form.control}
 *   onVisitSelect={(visit) => {
 *     if (visit) {
 *       form.setValue('visitId', visit.id)
 *     }
 *   }}
 * />
 * ```
 */
export function VisitSearchField({ control, onVisitSelect }: VisitSearchFieldProps) {
  // State para búsqueda
  const [searchTerm, setSearchTerm] = React.useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Fetch visitas activas (server-side search)
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits-search-active', debouncedSearch],
    queryFn: async () => {
      const res = await fetch(`/api/visits/search-active?q=${debouncedSearch}&limit=20`)
      if (!res.ok) throw new Error('Error al buscar visitas')
      return res.json() as Promise<VisitSearchResult[]>
    },
    enabled: debouncedSearch.length >= 2,
  })

  // Callback cuando se selecciona una visita del Combobox
  const handleVisitChange = (visitId: string) => {
    const visit = visits.find((v) => v.id === visitId) ?? null
    onVisitSelect?.(visit)
  }

  return (
    <FormField
      control={control}
      name="visitId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Visita *</FormLabel>
          <FormControl>
            <Combobox<VisitSearchResult>
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value)
                handleVisitChange(value)
              }}
              options={visits}
              getOptionValue={(v) => v.id}
              getOptionLabel={(v) => `${v.name} - ${v.comuna}`}
              renderOption={(visit) => (
                <div className="space-y-1">
                  {/* Header: Nombre + Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{visit.name}</span>
                    </div>
                    {/* Badge de estado */}
                    <Badge
                      variant="secondary"
                      className={visit.visitStatus.color.bgClass}
                      style={{
                        color: visit.visitStatus.color.textClass || undefined,
                      }}
                    >
                      {visit.visitStatus.name}
                    </Badge>
                  </div>
                  {/* Dirección */}
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {visit.street}, {visit.comuna}
                  </p>
                  {/* Teléfono si existe */}
                  {visit.phone && <p className="text-xs text-muted-foreground">{visit.phone}</p>}
                </div>
              )}
              placeholder="Buscar visita..."
              searchPlaceholder="Escribe nombre, teléfono o dirección..."
              emptyMessage={
                debouncedSearch.length < 2
                  ? 'Escribe al menos 2 caracteres para buscar'
                  : 'No se encontraron visitas activas'
              }
              loading={isLoading}
              loadingText="Buscando visitas..."
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
