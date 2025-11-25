'use client'

import { useRef } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { EventCalendar, EventCalendarHandle } from '@/components/calendar/event-calendar'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function CalendarPage() {
  const calendarRef = useRef<EventCalendarHandle>(null)

  return (
    <AppLayout
      pageTitle="Calendario"
      pageDescription="Gestión de eventos de proyectos, postventas y visitas"
      action={
        <Button onClick={() => calendarRef.current?.openNewEvent()}>
          <Plus className="h-4 w-4" />
          Nuevo Evento
        </Button>
      }
    >
      <div className="min-h-[14rem]">
        <EventCalendar ref={calendarRef} />
      </div>
    </AppLayout>
  )
}
