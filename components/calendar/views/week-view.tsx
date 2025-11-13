'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectEventCard } from '../project-event-card'
import { getWeekDays, getEventsForDay, DAYS_OF_WEEK_SHORT } from '@/lib/utils/calendar-utils'
import type { CalendarEvent } from '@/lib/types/calendar'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onCreateEvent?: (date: Date) => void
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
}

export function WeekView({
  currentDate,
  events,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
}: WeekViewProps) {
  const weekDays = getWeekDays(currentDate)

  return (
    <div className="flex flex-col h-full">
      {/* Header con nombres de días */}
      <div className="grid grid-cols-7 gap-2 pb-3 border-b">
        {weekDays.map((day, index) => {
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

          return (
            <div key={day.toISOString()} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">{DAYS_OF_WEEK_SHORT[index]}</div>
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
      <div className="grid grid-cols-7 gap-2 flex-1 pt-4 overflow-auto">
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(events, day)

          return (
            <div
              key={day.toISOString()}
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
                  if (event.type === 'project') {
                    return (
                      <ProjectEventCard
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
