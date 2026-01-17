/**
 * DynamicEventCard - Renderiza el card correcto según el tipo de evento
 *
 * Este componente resuelve el problema de TypeScript con discriminated unions
 * y component mapping. En lugar de usar `EVENT_TYPE_REGISTRY[event.type].Card`
 * con `as any`, usamos un switch que TypeScript puede inferir correctamente.
 */

import type { CalendarEvent } from '@/lib/types/calendar'
import { ProjectEventCard } from './project-event-card'
import { AftersaleEventCard } from './cards/aftersale-event-card'
import { VisitEventCard } from './cards/visit-event-card'

interface DynamicEventCardProps {
  event: CalendarEvent
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * Renderiza el EventCard correcto basado en el tipo de evento.
 * Type-safe gracias al discriminated union de CalendarEvent.
 */
export function DynamicEventCard({ event, onEdit, onDelete }: DynamicEventCardProps) {
  switch (event.type) {
    case 'project':
      return <ProjectEventCard event={event.data} onEdit={onEdit} onDelete={onDelete} />
    case 'aftersale':
      return <AftersaleEventCard event={event.data} onEdit={onEdit} onDelete={onDelete} />
    case 'visit':
      return <VisitEventCard event={event.data} onEdit={onEdit} onDelete={onDelete} />
  }
}

/**
 * Versión simplificada para DragOverlay (sin handlers de edit/delete)
 */
export function DynamicEventCardPreview({ event }: { event: CalendarEvent }) {
  switch (event.type) {
    case 'project':
      return <ProjectEventCard event={event.data} />
    case 'aftersale':
      return <AftersaleEventCard event={event.data} />
    case 'visit':
      return <VisitEventCard event={event.data} />
  }
}
