'use client'

import { useState } from 'react'
import { CalendarHeader } from './calendar-header'
import { WeekView } from './views/week-view'
import { ProjectEventDialog } from '@/components/dialogs/calendar/project-event-dialog'
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
import { useDeleteProjectEvent } from '@/hooks/queries/use-project-events'
import { getVisibleDateRange, navigateDate } from '@/lib/utils/calendar-utils'
import type { CalendarEvent } from '@/lib/types/calendar'
import { Skeleton } from '@/components/ui/skeleton'

export function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView] = useState<'week' | 'month' | 'agenda'>('week') // Por ahora solo week

  // Estado para dialog de crear/editar
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Estado para dialog de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)

  // Fetch eventos en el rango visible
  const { start, end } = getVisibleDateRange(currentDate, currentView)
  const { data, isLoading } = useCalendarEvents({ start, end })

  // Mutations
  const deleteEventMutation = useDeleteProjectEvent()

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <CalendarHeader currentDate={currentDate} view={currentView} onNavigate={handleNavigate} />

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
        </div>
      )}

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
    </div>
  )
}
