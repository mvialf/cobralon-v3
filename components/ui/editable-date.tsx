'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { StatusBadge } from '@/components/ui/status-badge'

/**
 * Props para el componente EditableDate
 */
export interface EditableDateProps {
  /** Fecha actual */
  date: Date | string
  /** Callback cuando cambia la fecha */
  onChange?: (date: Date) => void
  /** Indica si hay una operación pendiente */
  isPending?: boolean
  /** Modo solo lectura */
  readOnly?: boolean
  /** Texto a mostrar durante operaciones pendientes */
  loadingText?: string
  /** Clase CSS adicional */
  className?: string
}

/**
 * EditableDate - Componente para editar fechas inline mediante un calendario popover
 */
export function EditableDate({
  date,
  onChange,
  isPending = false,
  readOnly = false,
  loadingText = 'Actualizando...',
  className,
}: EditableDateProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Normalizar fecha
  const currentDate = React.useMemo(() => {
    if (!date) return new Date()
    return typeof date === 'string' ? new Date(date) : date
  }, [date])

  // Formatear fecha para mostrar
  const formattedDate = React.useMemo(() => {
    try {
      return format(currentDate, 'dd-MM-yyyy')
    } catch (_e) {
      return 'Fecha inválida'
    }
  }, [currentDate])

  if (readOnly || !onChange) {
    return <span className={cn('text-sm', className)}>{formattedDate}</span>
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-auto p-1 font-normal hover:bg-muted/50 transition-colors rounded-md',
            isPending && 'cursor-wait opacity-70',
            className
          )}
          disabled={isPending}
          aria-label={`Cambiar fecha: ${formattedDate}. Click para abrir calendario.`}
        >
          {isPending ? (
            <StatusBadge bgClass="bg-gray-500" label={loadingText} className="cursor-wait" />
          ) : (
            <div className="flex items-center gap-2 px-2">
              <span className="text-sm">{formattedDate}</span>
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(newDate) => {
            if (newDate && onChange) {
              onChange(newDate)
              setIsOpen(false)
            }
          }}
          initialFocus
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}
