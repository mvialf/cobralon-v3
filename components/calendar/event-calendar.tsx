'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core'
import { CalendarHeader } from './calendar-header'
import { WeekView } from './views/week-view'
import { MonthView } from './views/month-view'
import { AgendaView } from './views/agenda-view'
import { ViewSelector } from './view-selector'
import { ProjectEventDialog } from '@/components/dialogs/calendar/project-event-dialog'
import { ProjectEventCard } from './project-event-card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCalendarEvents } from '@/hooks/queries/use-calendar-events'
import {
  useDeleteProjectEvent,
  useUpdateProjectEventDate,
} from '@/hooks/queries/use-project-events'
import { getVisibleDateRange, navigateDate } from '@/lib/utils/calendar-utils'
import type { CalendarEvent } from '@/lib/types/calendar'
import { Skeleton } from '@/components/ui/skeleton'

export function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<'week' | 'month' | 'agenda'>('week')

  // Estado para dialog de crear/editar
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Estado para dialog de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)

  // Estado para drag & drop
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)

  // Fetch eventos en el rango visible
  const { start, end } = getVisibleDateRange(currentDate, currentView)
  const { data, isLoading } = useCalendarEvents({ start, end })

  // Mutations
  const deleteEventMutation = useDeleteProjectEvent()
  const updateDateMutation = useUpdateProjectEventDate()

  // Handlers
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date())
    } else {
      setCurrentDate(navigateDate(currentDate, direction, currentView))
    }
  }

  const handleCreateEvent = (date: Date) => {
    setSelectedDate(date)
    setCreateDialogOpen(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEditDialogOpen(true)
  }

  const handleDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (eventToDelete?.type === 'project') {
      deleteEventMutation.mutate(eventToDelete.data.id)
    }
    setDeleteDialogOpen(false)
    setEventToDelete(null)
  }

  // Handlers de drag & drop
  const handleDragStart = (event: any) => {
    const eventData = event.active.data.current?.event
    if (eventData) {
      const calendarEvent: CalendarEvent = {
        type: 'project',
        data: eventData,
      }
      setActiveEvent(calendarEvent)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveEvent(null)
      return
    }

    // Obtener evento y fecha de destino
    const eventData = active.data.current?.event
    const targetDate = over.data.current?.date

    if (!eventData || !targetDate) {
      setActiveEvent(null)
      return
    }

    // Si la fecha es la misma, no hacer nada
    // IMPORTANTE: Comparar usando strings YYYY-MM-DD para evitar problemas de timezone
    // Sin esto, eventos en UTC pueden ser considerados "mismo día" incorrectamente
    const currentDateStr = eventData.scheduledDate.substring(0, 10)
    const targetDateStr = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    )
      .toISOString()
      .substring(0, 10)

    if (currentDateStr === targetDateStr) {
      setActiveEvent(null)
      return
    }

    // Actualizar fecha con optimistic update
    updateDateMutation.mutate({
      id: eventData.id,
      scheduledDate: targetDate,
    })

    setActiveEvent(null)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        {/* Header con navegación y selector de vista */}
        <div className="flex items-center justify-between pb-4">
          <CalendarHeader
            currentDate={currentDate}
            view={currentView}
            onNavigate={handleNavigate}
          />
          <ViewSelector currentView={currentView} onViewChange={setCurrentView} />
        </div>

        {/* Vista actual */}
        {isLoading ? (
          <div className="flex-1 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {currentView === 'week' && (
              <WeekView
                currentDate={currentDate}
                events={data?.events || []}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            )}
            {currentView === 'month' && (
              <MonthView
                currentDate={currentDate}
                events={data?.events || []}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            )}
            {currentView === 'agenda' && (
              <AgendaView
                currentDate={currentDate}
                events={data?.events || []}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
              />
            )}
          </div>
        )}

        {/* DragOverlay para mostrar el evento siendo arrastrado */}
        <DragOverlay>
          {activeEvent?.type === 'project' && (
            <div className="opacity-80">
              <ProjectEventCard event={activeEvent.data} />
            </div>
          )}
        </DragOverlay>
      </div>

      {/* Dialogs */}
      <ProjectEventDialog
        mode="create"
        defaultDate={selectedDate || undefined}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedEvent?.type === 'project' && (
        <ProjectEventDialog
          mode="edit"
          event={selectedEvent.data}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
            <AlertDialogDescription>
              {eventToDelete?.type === 'project'
                ? `¿Estás seguro de eliminar el evento del proyecto ${eventToDelete.data.project.customer.name}? Esta acción no se puede deshacer.`
                : '¿Estás seguro de eliminar este evento? Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  )
}
