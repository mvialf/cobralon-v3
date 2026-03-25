'use client'

import * as React from 'react'
import { type ControllerRenderProps } from 'react-hook-form'
import { PatternFormat } from 'react-number-format'
import { format, parse, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: ControllerRenderProps<any, any>
  className?: string
  disabled?: boolean
}

/**
 * Input de fecha para formularios con schema z.date()
 *
 * Combina input con máscara dd/MM/yyyy (editable con teclado)
 * + popover con calendario al hacer click en el ícono.
 * Para schemas con z.string(), usar <Input type="date"> directamente.
 */
export function DateField({ field, className, disabled }: DateFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const currentDate = field.value instanceof Date && isValid(field.value) ? field.value : undefined

  // Valor formateado para el input con máscara
  const inputValue = currentDate ? format(currentDate, 'ddMMyyyy') : ''

  // Parsear el string dd/MM/yyyy a Date cuando el usuario termina de escribir
  const handleValueChange = (values: { value: string }) => {
    const raw = values.value // sin formato, ej: "25032026"
    if (raw.length === 8) {
      const parsed = parse(raw, 'ddMMyyyy', new Date())
      if (isValid(parsed)) {
        field.onChange(parsed)
      }
    }
  }

  // Cuando se selecciona desde el calendario
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      field.onChange(date)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <PatternFormat
        format="##/##/####"
        mask="_"
        value={inputValue}
        onValueChange={handleValueChange}
        placeholder="dd/mm/aaaa"
        disabled={disabled}
        name={field.name}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          'pr-9 tabular-nums text-right',
          className
        )}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Abrir calendario"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={handleCalendarSelect}
            autoFocus
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
