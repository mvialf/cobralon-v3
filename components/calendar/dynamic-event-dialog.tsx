/**
 * DynamicEventDialog - Renderiza el dialog correcto según el tipo de evento
 *
 * Similar a DynamicEventCard, resuelve el problema de TypeScript con
 * discriminated unions y component mapping para los dialogs de edición.
 */

import type { CalendarEvent } from '@/lib/types/calendar'
import { ProjectEventDialog } from '@/components/dialogs/calendar/project-event-dialog'
import { AftersaleEventDialog } from '@/components/dialogs/calendar/aftersale-event-dialog'
import { VisitEventDialog } from '@/components/dialogs/calendar/visit-event-dialog'

interface DynamicEventDialogProps {
  event: CalendarEvent
  mode: 'create' | 'edit'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultDate?: string // Formato yyyy-MM-dd
}

/**
 * Renderiza el EventDialog correcto basado en el tipo de evento.
 * Type-safe gracias al discriminated union de CalendarEvent.
 */
export function DynamicEventDialog({
  event,
  mode,
  open,
  onOpenChange,
  defaultDate,
}: DynamicEventDialogProps) {
  switch (event.type) {
    case 'project':
      return (
        <ProjectEventDialog
          mode={mode}
          event={event.data}
          open={open}
          onOpenChange={onOpenChange}
          defaultDate={defaultDate}
        />
      )
    case 'aftersale':
      return (
        <AftersaleEventDialog
          mode={mode}
          event={event.data}
          open={open}
          onOpenChange={onOpenChange}
          defaultDate={defaultDate}
        />
      )
    case 'visit':
      return (
        <VisitEventDialog
          mode={mode}
          event={event.data}
          open={open}
          onOpenChange={onOpenChange}
          defaultDate={defaultDate}
        />
      )
  }
}
