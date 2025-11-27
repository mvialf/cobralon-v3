'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarEvent } from '@/lib/types/calendar'

interface SortableEventCardProps {
  calendarEvent: CalendarEvent
  children: React.ReactNode
}

/**
 * Wrapper que hace sortable cualquier Event Card dentro del mismo día
 *
 * Usa useSortable de @dnd-kit/sortable para permitir:
 * - Arrastrar eventos para reordenar dentro del mismo día
 * - Arrastrar eventos a otros días (manejado por DroppableDayCell)
 *
 * NOTA: El conflicto con elementos interactivos (botones, links) se maneja
 * mediante el distance constraint en el PointerSensor (configurado en event-calendar.tsx).
 * El drag solo inicia después de mover 8px, permitiendo clicks normales.
 */
export function SortableEventCard({ calendarEvent, children }: SortableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: calendarEvent.data.id,
    data: {
      calendarEvent, // Pasar el CalendarEvent completo
      type: `${calendarEvent.type}-event`,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    // Evitar que el placeholder ocupe espacio cuando se arrastra fuera
    zIndex: isDragging ? 50 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  )
}
