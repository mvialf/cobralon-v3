'use client'

import type { PointerEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarEvent } from '@/lib/types/calendar'

interface SortableEventCardProps {
  calendarEvent: CalendarEvent
  children: React.ReactNode
}

/**
 * Verifica si el elemento clickeado es interactivo (botón, link, input, etc.)
 * o está dentro de un elemento interactivo
 */
function isInteractiveElement(element: HTMLElement | null): boolean {
  if (!element) return false

  const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']
  const interactiveRoles = ['button', 'link', 'menuitem', 'option']

  let current: HTMLElement | null = element

  while (current) {
    // Verificar tag
    if (interactiveTags.includes(current.tagName)) {
      return true
    }
    // Verificar role ARIA
    const role = current.getAttribute('role')
    if (role && interactiveRoles.includes(role)) {
      return true
    }
    // Verificar data attribute para excluir del drag
    if (current.dataset.noDnd === 'true') {
      return true
    }
    current = current.parentElement
  }

  return false
}

/**
 * Wrapper que hace sortable cualquier Event Card dentro del mismo día
 *
 * Usa useSortable de @dnd-kit/sortable para permitir:
 * - Arrastrar eventos para reordenar dentro del mismo día
 * - Arrastrar eventos a otros días (manejado por DroppableDayCell)
 *
 * NOTA: No inicia el drag si se hace clic en elementos interactivos (botones, links, etc.)
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

  // Filtrar los listeners para no iniciar drag en elementos interactivos
  const filteredListeners = listeners
    ? {
        ...listeners,
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          // No iniciar drag si el click es en un elemento interactivo
          if (isInteractiveElement(e.target as HTMLElement)) {
            return
          }
          listeners.onPointerDown?.(e)
        },
      }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...filteredListeners} {...attributes}>
      {children}
    </div>
  )
}
