'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getRegiones, getComunasByRegion } from '@/lib/regiones-chile'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface AddressFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  defaultRegion?: string
}

/**
 * Componente reutilizable para campos de dirección
 * Incluye: calle, casa/dpto, comuna, región
 */
export function AddressFields({ control, defaultRegion }: AddressFieldsProps) {
  const [openRegion, setOpenRegion] = React.useState(false)
  const [openComuna, setOpenComuna] = React.useState(false)

  const regiones = getRegiones()

  // Watch región para filtrar comunas
  const [selectedRegion, setSelectedRegion] = React.useState(defaultRegion || '')

  // Extraer código de región del texto seleccionado
  const regionCodigo =
    regiones.find((r) => `${r.nombre_corto} (${r.numero_romano})` === selectedRegion)?.codigo || ''

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
                <Input
                  {...field}
                  placeholder="Av. Libertador Bernardo O'Higgins 123"
                  className="w-full"
                />
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
              <FormLabel>Casa/Depto</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Depto 405" className="w-full" />
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
              <Popover open={openRegion} onOpenChange={setOpenRegion}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="input-like"
                      size="input"
                      role="combobox"
                      className={cn('w-full', !field.value && 'text-muted-foreground')}
                    >
                      {field.value || 'Selecciona una región...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar región..." />
                    <CommandList>
                      <CommandEmpty>No se encontró la región</CommandEmpty>
                      <CommandGroup>
                        {regiones.map((r) => {
                          const displayText = `${r.nombre_corto} (${r.numero_romano})`
                          return (
                            <CommandItem
                              key={r.codigo}
                              value={displayText}
                              onSelect={(value) => {
                                field.onChange(value)
                                setSelectedRegion(value)
                                setOpenRegion(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  field.value === displayText ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {displayText}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              <Popover open={openComuna} onOpenChange={setOpenComuna}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="input-like"
                      size="input"
                      role="combobox"
                      className={cn('w-full', !field.value && 'text-muted-foreground')}
                      disabled={!regionCodigo}
                    >
                      {field.value ||
                        (regionCodigo
                          ? 'Selecciona una comuna...'
                          : 'Primero selecciona una región')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar comuna..." />
                    <CommandList>
                      <CommandEmpty>No se encontró la comuna</CommandEmpty>
                      <CommandGroup>
                        {comunasDisponibles.map((c) => (
                          <CommandItem
                            key={c.codigo}
                            value={c.nombre}
                            onSelect={(value) => {
                              field.onChange(value)
                              setOpenComuna(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === c.nombre ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {c.nombre}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
