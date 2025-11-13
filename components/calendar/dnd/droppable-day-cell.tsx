'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DroppableDayCellProps {
  date: Date
  children: React.ReactNode
  className?: string
}

/**
 * Componente que envuelve un día del calendario y permite soltar eventos en él
 */
export function DroppableDayCell({ date, children, className }: DroppableDayCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: date.toISOString(),
    data: {
      date,
      type: 'day-cell',
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-all duration-200',
        isOver && 'ring-2 ring-primary ring-offset-2 bg-primary/10',
        className
      )}
    >
      {children}
    </div>
  )
}
