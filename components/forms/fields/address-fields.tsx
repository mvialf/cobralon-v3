'use client'

import * as React from 'react'
import { Control, useWatch } from 'react-hook-form'
import { Building } from 'lucide-react'

import { getRegiones, getComunasByRegion } from '@/lib/regiones-chile'

import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface AddressFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  defaultRegion?: string
  disabled?: boolean
}

/**
 * Componente reutilizable para campos de dirección
 * Incluye: calle, casa/dpto, comuna, región
 */
export function AddressFields({ control, defaultRegion, disabled }: AddressFieldsProps) {
  const regiones = getRegiones()

  // Watch región del formulario para filtrar comunas
  const regionValue = useWatch({ control, name: 'region', defaultValue: defaultRegion || '' })

  // regionValue contiene directamente el código (ej: '13')
  const regionCodigo = regionValue || ''

  const comunasDisponibles = regionCodigo ? getComunasByRegion(regionCodigo) : []

  return (
    <div className="space-y-4">
      {/* Grid: Calle (5) + Casa/Depto (1) */}
      <div className="grid grid-cols-6 gap-4">
        {/* Calle y numeración */}
        <FormField
          control={control}
          name="street"
          render={({ field }) => (
            <FormItem className="col-span-5 w-full">
              <FormLabel>Calle y numeración *</FormLabel>
              <FormControl>
                <Input {...field} className="w-full" disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Casa/Depto (opcional) */}
        <FormField
          control={control}
          name="apartment"
          render={({ field }) => (
            <FormItem className="col-span-1 w-full">
              <FormLabel>
                <Building className="h-4 w-4" />
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  className="w-full"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Grid: Región + Comuna */}
      <div className="grid grid-cols-2 gap-4">
        {/* Región */}
        <FormField
          control={control}
          name="region"
          render={({ field }) => (
            <FormItem className="flex flex-col w-full">
              <FormLabel>Región *</FormLabel>
              <FormControl>
                <Combobox
                  value={field.value}
                  onValueChange={field.onChange}
                  options={regiones.map((r) => ({
                    codigo: r.codigo,
                    displayText: `${r.nombre_corto} (${r.numero_romano})`,
                  }))}
                  getOptionValue={(r) => r.codigo}
                  getOptionLabel={(r) => r.displayText}
                  placeholder="Selecciona una región..."
                  searchPlaceholder="Buscar región..."
                  emptyMessage="No se encontró la región"
                  contentWidth="300px"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Comuna */}
        <FormField
          control={control}
          name="comuna"
          render={({ field }) => (
            <FormItem className="flex flex-col w-full">
              <FormLabel>Comuna *</FormLabel>
              <FormControl>
                <Combobox
                  value={field.value}
                  onValueChange={field.onChange}
                  options={comunasDisponibles}
                  getOptionValue={(c) => c.nombre}
                  getOptionLabel={(c) => c.nombre}
                  placeholder={
                    regionCodigo ? 'Selecciona una comuna...' : 'Primero selecciona una región'
                  }
                  searchPlaceholder="Buscar comuna..."
                  emptyMessage="No se encontró la comuna"
                  contentWidth="300px"
                  disabled={disabled || !regionCodigo}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
