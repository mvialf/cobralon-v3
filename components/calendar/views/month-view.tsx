'use client'

import { format, isSameMonth as dateIsSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DroppableDayCell } from '../dnd/droppable-day-cell'
import { DraggableEventCard } from '../dnd/draggable-event-card'
import { getMonthDays, getEventsForDay, DAYS_OF_WEEK_SHORT } from '@/lib/utils/calendar-utils'
import type { CalendarEvent } from '@/lib/types/calendar'

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onCreateEvent?: (date: Date) => void
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
}

export function MonthView({
  currentDate,
  events,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
}: MonthViewProps) {
  const monthDays = getMonthDays(currentDate)

  return (
    <div className="flex flex-col h-full">
      {/* Header con nombres de días */}
      <div className="grid grid-cols-7 gap-2 pb-3 border-b">
        {DAYS_OF_WEEK_SHORT.map((dayName) => (
          <div key={dayName} className="text-center text-xs font-medium text-muted-foreground">
            {dayName}
          </div>
        ))}
      </div>

      {/* Grid de 6 semanas x 7 días */}
      <div className="grid grid-cols-7 gap-2 flex-1 pt-2 overflow-auto">
        {monthDays.map((day) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          const isCurrentMonth = dateIsSameMonth(day, currentDate)
          const dayEvents = getEventsForDay(events, day)

          return (
            <DroppableDayCell
              key={day.toISOString()}
              date={day}
              className={`border rounded-lg p-2 transition-colors min-h-[120px] flex flex-col ${
                isCurrentMonth
                  ? 'bg-background hover:bg-muted/40'
                  : 'bg-muted/20 hover:bg-muted/30 opacity-50'
              }`}
            >
              {/* Número del día */}
              <div className="flex items-center justify-between mb-1">
                <div
                  className={`text-sm font-medium ${
                    isToday
                      ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                      : isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }`}
                >
                  {format(day, 'd', { locale: es })}
                </div>

                {/* Botón crear evento (solo en días del mes actual) */}
                {isCurrentMonth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => onCreateEvent?.(day)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Lista de eventos del día */}
              <div className="space-y-1 flex-1 overflow-auto">
                {dayEvents.map((event) => {
                  if (event.type === 'project') {
                    return (
                      <DraggableEventCard
                        key={event.data.id}
                        event={event.data}
                        onEdit={() => onEditEvent?.(event)}
                        onDelete={() => onDeleteEvent?.(event)}
                      />
                    )
                  }
                  return null
                })}
              </div>
            </DroppableDayCell>
          )
        })}
      </div>
    </div>
  )
}
