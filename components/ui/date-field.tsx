'use client'

import * as React from 'react'
import { type ControllerRenderProps } from 'react-hook-form'
import { I18nProvider } from 'react-aria'
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment as AriaDateSegment,
} from 'react-aria-components'
import { CalendarDate, getLocalTimeZone, type DateValue } from '@internationalized/date'
import { isValid } from 'date-fns'
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

// Convierte Date nativo a CalendarDate de react-aria
function dateToCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

// Convierte CalendarDate de react-aria a Date nativo
function calendarDateToDate(cd: CalendarDate): Date {
  return cd.toDate(getLocalTimeZone())
}

/**
 * Input de fecha segmentado para formularios con schema z.date()
 *
 * Segmentos dd/mm/yyyy editables independientemente con Tab.
 * Incluye popover con calendario al hacer click en el ícono.
 */
export function DateField({ field, className, disabled }: DateFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const currentDate = field.value instanceof Date && isValid(field.value) ? field.value : undefined
  const calendarValue = currentDate ? dateToCalendarDate(currentDate) : null

  // Cuando react-aria emite un cambio de segmentos
  const handleAriaChange = (value: DateValue | null) => {
    if (value) {
      const cd = value as CalendarDate
      field.onChange(calendarDateToDate(cd))
    }
  }

  // Cuando se selecciona desde el calendario
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      field.onChange(date)
      setIsOpen(false)
    }
  }

  // Suprime arrow keys en los segmentos (solo Tab para navegar)
  const handleKeyDownCapture = (e: React.KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
    }
  }

  return (
    <I18nProvider locale="es-CL">
      <div className="relative">
        <AriaDateField
          value={calendarValue}
          onChange={handleAriaChange}
          isDisabled={disabled}
          className="group"
        >
          {/* El div captura keydown antes de que react-aria procese las flechas */}
          <div onKeyDownCapture={handleKeyDownCapture}>
            <AriaDateInput
              className={cn(
                'flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring md:text-sm',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                'pr-9',
                disabled && 'cursor-not-allowed opacity-50',
                className
              )}
            >
              {(segment) => (
                <AriaDateSegment
                  segment={segment}
                  className={cn(
                    'inline rounded-sm px-0.5 tabular-nums caret-transparent outline-none',
                    'data-[placeholder]:text-muted-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    'data-[type=literal]:px-0 data-[type=literal]:text-muted-foreground',
                    'data-[disabled]:opacity-50'
                  )}
                />
              )}
            </AriaDateInput>
          </div>
        </AriaDateField>
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
    </I18nProvider>
  )
}
