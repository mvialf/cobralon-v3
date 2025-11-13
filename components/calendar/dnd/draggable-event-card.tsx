'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ProjectEventCard } from '../project-event-card'
import type { ProjectEventWithRelations } from '@/lib/types/calendar'

interface DraggableEventCardProps {
  event: ProjectEventWithRelations
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * Wrapper que hace draggable un ProjectEventCard
 */
export function DraggableEventCard({ event, onEdit, onDelete }: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: {
      event,
      type: 'project-event',
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ProjectEventCard event={event} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}
