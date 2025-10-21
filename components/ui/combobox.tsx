'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

interface ComboboxProps<T> {
  /** Valor actual seleccionado (debe coincidir con getOptionValue) */
  value: string
  /** Callback cuando el valor cambia */
  onValueChange: (value: string) => void
  /** Array de opciones disponibles */
  options: T[]
  /** Función para extraer el value de cada opción (usado para comparación) */
  getOptionValue: (option: T) => string
  /** Función para extraer el label visible de cada opción */
  getOptionLabel: (option: T) => string

  // Customization
  /** Función custom para renderizar cada opción. Si no se provee, usa getOptionLabel. */
  renderOption?: (option: T, isSelected: boolean) => React.ReactNode

  // Text
  /** Placeholder del trigger cuando no hay valor seleccionado */
  placeholder?: string
  /** Placeholder del campo de búsqueda */
  searchPlaceholder?: string
  /** Mensaje cuando no hay resultados */
  emptyMessage?: string

  // State
  /** Si el combobox está deshabilitado */
  disabled?: boolean
  /** Si está cargando las opciones */
  loading?: boolean
  /** Texto a mostrar durante el loading */
  loadingText?: string

  // Style
  /** Clase CSS custom para el trigger button */
  className?: string
  /** Ancho del popover content (ej: "300px", "w-[400px]") */
  contentWidth?: string

  // Advanced
  /** Si el popover debe ser modal (bloquea interacción fuera) */
  modal?: boolean
  /** Callback cuando el estado open/close cambia */
  onOpenChange?: (open: boolean) => void
  /** Callback cuando el término de búsqueda cambia (para búsqueda server-side) */
  onSearchChange?: (search: string) => void
  /** Si se debe deshabilitar el filtrado automático (útil para búsqueda server-side) */
  disableFiltering?: boolean

  // Accessibility
  /** ID del combobox */
  id?: string
  /** Nombre del campo (para formularios) */
  name?: string
  /** ARIA label */
  'aria-label'?: string
  /** ARIA describedby */
  'aria-describedby'?: string
}

/**
 * Combobox genérico con búsqueda y selección
 *
 * Componente reutilizable construido sobre Command + Popover de shadcn/ui.
 * Soporta TypeScript generics para type-safety completo.
 *
 * Features:
 * - Búsqueda en tiempo real (filtrado automático)
 * - Type-safe con generics <T>
 * - Loading state integrado
 * - Custom rendering de opciones
 * - ARIA compliant
 * - Compatible con React Hook Form
 *
 * @example Uso básico
 * ```tsx
 * <Combobox
 *   value={country}
 *   onValueChange={setCountry}
 *   options={countries}
 *   getOptionValue={(c) => c.code}
 *   getOptionLabel={(c) => c.name}
 * />
 * ```
 *
 * @example Con React Hook Form
 * ```tsx
 * <FormField
 *   control={form.control}
 *   name="customerId"
 *   render={({ field }) => (
 *     <Combobox
 *       value={field.value}
 *       onValueChange={field.onChange}
 *       options={customers}
 *       getOptionValue={(c) => c.id}
 *       getOptionLabel={(c) => c.name}
 *       loading={loadingCustomers}
 *     />
 *   )}
 * />
 * ```
 *
 * @example Con rendering custom
 * ```tsx
 * <Combobox
 *   value={customerId}
 *   onValueChange={setCustomerId}
 *   options={customers}
 *   getOptionValue={(c) => c.id}
 *   getOptionLabel={(c) => c.name}
 *   renderOption={(c, selected) => (
 *     <div className="flex flex-col">
 *       <span>{c.name}</span>
 *       <span className="text-xs text-muted-foreground">{c.phone}</span>
 *     </div>
 *   )}
 * />
 * ```
 */
export function Combobox<T>({
  value,
  onValueChange,
  options,
  getOptionValue,
  getOptionLabel,
  renderOption,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No se encontraron resultados',
  disabled = false,
  loading = false,
  loadingText = 'Cargando...',
  className,
  contentWidth = '300px',
  modal = true,
  onOpenChange,
  onSearchChange,
  disableFiltering = false,
  id,
  name,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false)

  // Encontrar opción seleccionada
  const selectedOption = React.useMemo(
    () => options.find((option) => getOptionValue(option) === value),
    [options, value, getOptionValue]
  )

  // Handler para cambio de open state
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  // Handler para selección de opción
  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue === value ? '' : optionValue)
    setOpen(false)
  }

  // Label a mostrar en el trigger
  const triggerLabel = React.useMemo(() => {
    if (loading) return loadingText
    if (selectedOption) return getOptionLabel(selectedOption)
    return placeholder
  }, [loading, loadingText, selectedOption, getOptionLabel, placeholder])

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="input-like"
          size="input"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className={cn('w-full justify-between', !value && 'text-muted-foreground', className)}
          disabled={disabled || loading}
        >
          {triggerLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: contentWidth }}>
        <Command shouldFilter={!disableFiltering}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const optionValue = getOptionValue(option)
                const isSelected = optionValue === value

                return (
                  <CommandItem
                    key={optionValue}
                    value={optionValue}
                    onSelect={handleSelect}
                    data-name={name} // Para debugging
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                    />
                    {renderOption ? renderOption(option, isSelected) : getOptionLabel(option)}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
