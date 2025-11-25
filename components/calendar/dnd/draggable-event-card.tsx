'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarEvent } from '@/lib/types/calendar'

interface DraggableEventCardProps {
  calendarEvent: CalendarEvent
  onEdit?: () => void
  onDelete?: () => void
  children: React.ReactNode
}

/**
 * Wrapper genérico que hace draggable cualquier tipo de Event Card
 *
 * Refactorizado para soportar múltiples tipos de eventos (project, aftersale, visit)
 * usando el pattern de children composition.
 */
export function DraggableEventCard({ calendarEvent, children }: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: calendarEvent.data.id,
    data: {
      calendarEvent, // Pasar el CalendarEvent completo para que EventCalendar pueda determinar el tipo
      type: `${calendarEvent.type}-event`,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  )
}
