'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DroppableDayCell } from '../dnd/droppable-day-cell'
import { DraggableEventCard } from '../dnd/draggable-event-card'
import {
  getWeekDays,
  getEventsForDay,
  DAYS_OF_WEEK_SHORT,
  isWeekend,
} from '@/lib/utils/calendar-utils'
import type { CalendarEvent } from '@/lib/types/calendar'
import { EVENT_TYPE_REGISTRY } from '@/lib/config/event-types-config'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onCreateEvent?: (date: Date) => void
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
  showWeekends: boolean
}

export function WeekView({
  currentDate,
  events,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  showWeekends,
}: WeekViewProps) {
  const allWeekDays = getWeekDays(currentDate)
  const weekDays = showWeekends ? allWeekDays : allWeekDays.filter((day) => !isWeekend(day))
  const dayHeaders = showWeekends ? DAYS_OF_WEEK_SHORT : DAYS_OF_WEEK_SHORT.slice(0, 5)

  return (
    <div className="flex flex-col min-h-[14rem]">
      {/* Header con nombres de días */}
      <div className={`grid gap-2 pb-3 border-b ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {weekDays.map((day, index) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

          return (
            <div key={day.toISOString()} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{dayHeaders[index]}</div>
              <div
                className={`text-lg font-semibold ${
                  isToday
                    ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                    : ''
                }`}
              >
                {format(day, 'd', { locale: es })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid de días con eventos */}
      <div className={`grid gap-2 pt-4 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(events, day)

          return (
            <DroppableDayCell
              key={day.toISOString()}
              date={day}
              className="border rounded-lg p-2 bg-muted/20 hover:bg-muted/40 transition-colors min-h-[200px] flex flex-col"
            >
              {/* Botón para crear evento */}
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 h-8 text-xs opacity-0 hover:opacity-100 transition-opacity"
                onClick={() => onCreateEvent?.(day)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Crear evento
              </Button>

              {/* Lista de eventos del día */}
              <div className="space-y-2 flex-1">
                {dayEvents.map((event) => {
                  // Renderizar card dinámicamente según el tipo
                  const EventCard = EVENT_TYPE_REGISTRY[event.type].Card

                  return (
                    <DraggableEventCard
                      key={event.data.id}
                      calendarEvent={event}
                      onEdit={() => onEditEvent?.(event)}
                      onDelete={() => onDeleteEvent?.(event)}
                    >
                      <EventCard event={event.data as any} />
                    </DraggableEventCard>
                  )
                })}
              </div>
            </DroppableDayCell>
          )
        })}
      </div>
    </div>
  )
}
