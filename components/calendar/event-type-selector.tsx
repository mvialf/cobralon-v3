'use client'

import { ClipboardList, Wrench, MapPin } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { CalendarEventType } from '@/lib/types/calendar'

/**
 * Configuración de tipos de eventos para el selector
 */
const EVENT_TYPE_OPTIONS: Array<{
  type: CalendarEventType
  label: string
  description: string
  icon: typeof ClipboardList
}> = [
  {
    type: 'project',
    label: 'Proyecto',
    description: 'Evento de instalación o seguimiento de proyecto',
    icon: ClipboardList,
  },
  {
    type: 'aftersale',
    label: 'Postventa',
    description: 'Evento de servicio postventa o reparación',
    icon: Wrench,
  },
  {
    type: 'visit',
    label: 'Visita',
    description: 'Visita comercial o técnica',
    icon: MapPin,
  },
]

interface EventTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectType: (type: CalendarEventType) => void
}

/**
 * Dialog para seleccionar el tipo de evento a crear
 *
 * Se muestra cuando el usuario hace click en "+" del calendario.
 * Una vez seleccionado el tipo, se abre el dialog correspondiente.
 */
export function EventTypeSelector({ open, onOpenChange, onSelectType }: EventTypeSelectorProps) {
  const handleSelect = (type: CalendarEventType) => {
    onOpenChange(false)
    // Pequeño delay para que el dialog se cierre antes de abrir el siguiente
    setTimeout(() => {
      onSelectType(type)
    }, 150)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear evento</DialogTitle>
          <DialogDescription>Selecciona el tipo de evento que deseas crear</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {EVENT_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <Button
                key={option.type}
                variant="outline"
                className="h-auto flex items-start gap-4 p-4 justify-start"
                onClick={() => handleSelect(option.type)}
              >
                <div className="rounded-lg bg-muted p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
