'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SortableDayContainer } from '../dnd/sortable-day-container'
import { SortableEventCard } from '../dnd/sortable-event-card'
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
            <div
              key={day.toISOString()}
              className="text-center cursor-pointer hover:bg-muted/50 rounded-lg p-1 transition-colors"
              onClick={() => onCreateEvent?.(day)}
            >
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

          // Ordenar eventos por campo order para mantener el orden del usuario
          const sortedDayEvents = [...dayEvents].sort(
            (a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)
          )

          return (
            <SortableDayContainer
              key={day.toISOString()}
              date={day}
              events={sortedDayEvents}
              className="border rounded-lg p-2 bg-muted/20 hover:bg-muted/40 transition-colors min-h-[200px] flex flex-col"
            >
              {/* Lista de eventos del día (ordenados) */}
              <div className="space-y-2 flex-1">
                {sortedDayEvents.map((event) => {
                  // Renderizar card dinámicamente según el tipo
                  const EventCard = EVENT_TYPE_REGISTRY[event.type].Card

                  return (
                    <SortableEventCard key={event.data.id} calendarEvent={event}>
                      <EventCard
                        event={event.data as any}
                        onEdit={() => onEditEvent?.(event)}
                        onDelete={() => onDeleteEvent?.(event)}
                      />
                    </SortableEventCard>
                  )
                })}
              </div>
            </SortableDayContainer>
          )
        })}
      </div>
    </div>
  )
}
