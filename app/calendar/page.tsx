import { AppLayout } from '@/components/layout/app-layout'
import { EventCalendar } from '@/components/calendar/event-calendar'

export default function CalendarPage() {
  return (
    <AppLayout
      pageTitle="Calendario"
      pageDescription="Gestión de eventos de proyectos, postventas y visitas"
    >
      <div className="h-[calc(100vh-12rem)]">
        <EventCalendar />
      </div>
    </AppLayout>
  )
}
