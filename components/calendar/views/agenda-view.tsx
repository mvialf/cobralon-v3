'use client'

import { format, isSameDay, compareAsc } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { CalendarEvent } from '@/lib/types/calendar'
import { DynamicEventCard } from '../dynamic-event-card'

interface AgendaViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
}

/**
 * Agrupa eventos por fecha
 */
function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()

  // Ordenar eventos por fecha
  const sortedEvents = [...events].sort((a, b) =>
    compareAsc(new Date(a.data.scheduledDate), new Date(b.data.scheduledDate))
  )

  sortedEvents.forEach((event) => {
    const dateKey = format(new Date(event.data.scheduledDate), 'yyyy-MM-dd')
    const existing = grouped.get(dateKey) || []
    grouped.set(dateKey, [...existing, event])
  })

  return grouped
}

export function AgendaView({ events, onEditEvent, onDeleteEvent }: AgendaViewProps) {
  const groupedEvents = groupEventsByDate(events)
  const today = new Date()

  // Si no hay eventos
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay eventos programados</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Los eventos que crees aparecerán aquí en orden cronológico
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="space-y-6 p-4">
        {Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => {
          const date = new Date(dateKey)
          const isToday = isSameDay(date, today)

          return (
            <div key={dateKey} className="space-y-3">
              {/* Header de fecha */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 ${
                    isToday ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <div>
                    <div className="text-sm capitalize">
                      {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                    </div>
                    {isToday && <div className="text-xs">Hoy</div>}
                  </div>
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className="text-xs text-muted-foreground">{dayEvents.length} eventos</div>
              </div>

              {/* Lista de eventos del día */}
              <div className="space-y-2 pl-6">
                {dayEvents.map((event) => (
                  <Card key={event.data.id} className="p-3">
                    <DynamicEventCard
                      event={event}
                      onEdit={() => onEditEvent?.(event)}
                      onDelete={() => onDeleteEvent?.(event)}
                    />
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
