'use client'

import { format, isSameMonth as dateIsSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SortableDayContainer } from '../dnd/sortable-day-container'
import { SortableEventCard } from '../dnd/sortable-event-card'
import {
  getMonthDays,
  getEventsForDay,
  DAYS_OF_WEEK_SHORT,
  isWeekend,
} from '@/lib/utils/calendar-utils'
import type { CalendarEvent } from '@/lib/types/calendar'
import { DynamicEventCard } from '../dynamic-event-card'

interface MonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onCreateEvent?: (date: Date) => void
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
  showWeekends: boolean
}

export function MonthView({
  currentDate,
  events,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  showWeekends,
}: MonthViewProps) {
  const allMonthDays = getMonthDays(currentDate)
  const monthDays = showWeekends ? allMonthDays : allMonthDays.filter((day) => !isWeekend(day))
  const dayHeaders = showWeekends ? DAYS_OF_WEEK_SHORT : DAYS_OF_WEEK_SHORT.slice(0, 5)

  return (
    <div className="flex flex-col min-h-[14rem]">
      {/* Header con nombres de días */}
      <div className={`grid gap-2 pb-3 border-b ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {dayHeaders.map((dayName) => (
          <div key={dayName} className="text-center text-xs font-medium text-muted-foreground">
            {dayName}
          </div>
        ))}
      </div>

      {/* Grid de días del mes */}
      <div className={`grid gap-2 pt-2 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {monthDays.map((day) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          const isCurrentMonth = dateIsSameMonth(day, currentDate)
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

              {/* Lista de eventos del día (ordenados) */}
              <div className="space-y-1 flex-1 overflow-auto">
                {sortedDayEvents.map((event) => (
                  <SortableEventCard key={event.data.id} calendarEvent={event}>
                    <DynamicEventCard
                      event={event}
                      onEdit={() => onEditEvent?.(event)}
                      onDelete={() => onDeleteEvent?.(event)}
                    />
                  </SortableEventCard>
                ))}
              </div>
            </SortableDayContainer>
          )
        })}
      </div>
    </div>
  )
}
