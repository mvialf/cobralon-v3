'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/types/calendar'

interface SortableDayContainerProps {
  date: Date
  events: CalendarEvent[]
  children: React.ReactNode
  className?: string
}

/**
 * Container que combina:
 * - Droppable: Permite soltar eventos de otros días
 * - SortableContext: Permite reordenar eventos dentro del día
 *
 * Los eventos se ordenan verticalmente usando verticalListSortingStrategy
 */
export function SortableDayContainer({
  date,
  events,
  children,
  className,
}: SortableDayContainerProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: date.toISOString(),
    data: {
      date,
      type: 'day-cell',
    },
  })

  // IDs de los eventos para el SortableContext
  const eventIds = events.map((event) => event.data.id)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-200',
        isOver && 'ring-2 ring-primary ring-offset-2 bg-primary/10',
        className
      )}
    >
      <SortableContext items={eventIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  )
}
