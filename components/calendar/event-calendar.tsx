'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core'
import { CalendarHeader } from './calendar-header'
import { WeekView } from './views/week-view'
import { MonthView } from './views/month-view'
import { AgendaView } from './views/agenda-view'
import { ViewSelector } from './view-selector'
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
import { getVisibleDateRange, navigateDate } from '@/lib/utils/calendar-utils'
import type { CalendarEvent } from '@/lib/types/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { EVENT_TYPE_REGISTRY, getEventDialog } from '@/lib/config/event-types-config'

export function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<'week' | 'month' | 'agenda'>('week')

  // Estado para filtro de fin de semana (persistido en localStorage)
  const [showWeekends, setShowWeekends] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('calendar-show-weekends')
    return saved === null ? true : saved === 'true'
  })

  // Persistir preferencia de fin de semana
  useEffect(() => {
    localStorage.setItem('calendar-show-weekends', String(showWeekends))
  }, [showWeekends])

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

  // Mutations - Instanciar TODOS los hooks al inicio (Rules of Hooks)
  // Luego en los handlers seleccionamos cuál usar según el tipo de evento
  const deleteProjectMutation = EVENT_TYPE_REGISTRY.project.useDeleteMutation()
  const deleteAftersaleMutation = EVENT_TYPE_REGISTRY.aftersale.useDeleteMutation()
  const deleteVisitMutation = EVENT_TYPE_REGISTRY.visit.useDeleteMutation()

  const updateProjectDateMutation = EVENT_TYPE_REGISTRY.project.useUpdateDateMutation()
  const updateAftersaleDateMutation = EVENT_TYPE_REGISTRY.aftersale.useUpdateDateMutation()
  const updateVisitDateMutation = EVENT_TYPE_REGISTRY.visit.useUpdateDateMutation()

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
    if (!eventToDelete) return

    // Switch en lugar de condicional hardcodeado
    // TypeScript exhaustiveness checking garantiza que cubrimos todos los tipos
    switch (eventToDelete.type) {
      case 'project':
        deleteProjectMutation.mutate(eventToDelete.data.id)
        break
      case 'aftersale':
        deleteAftersaleMutation.mutate(eventToDelete.data.id)
        break
      case 'visit':
        deleteVisitMutation.mutate(eventToDelete.data.id)
        break
    }

    setDeleteDialogOpen(false)
    setEventToDelete(null)
  }

  // Handlers de drag & drop
  const handleDragStart = (event: any) => {
    const draggedEvent = event.active.data.current?.calendarEvent as CalendarEvent | undefined
    if (draggedEvent) {
      setActiveEvent(draggedEvent)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event

    if (!over || !activeEvent) {
      setActiveEvent(null)
      return
    }

    // Obtener fecha de destino
    const targetDate = over.data.current?.date

    if (!targetDate) {
      setActiveEvent(null)
      return
    }

    // Si la fecha es la misma, no hacer nada
    // IMPORTANTE: Comparar usando strings YYYY-MM-DD para evitar problemas de timezone
    const currentDateStr = activeEvent.data.scheduledDate.toString().substring(0, 10)
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
    // Switch para seleccionar el mutation correcto según el tipo
    const updateParams = {
      id: activeEvent.data.id,
      scheduledDate: targetDate,
    }

    switch (activeEvent.type) {
      case 'project':
        updateProjectDateMutation.mutate(updateParams)
        break
      case 'aftersale':
        updateAftersaleDateMutation.mutate(updateParams)
        break
      case 'visit':
        updateVisitDateMutation.mutate(updateParams)
        break
    }

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
          <ViewSelector
            currentView={currentView}
            onViewChange={setCurrentView}
            showWeekends={showWeekends}
            onToggleWeekends={setShowWeekends}
          />
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
                showWeekends={showWeekends}
              />
            )}
            {currentView === 'month' && (
              <MonthView
                currentDate={currentDate}
                events={data?.events || []}
                onCreateEvent={handleCreateEvent}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                showWeekends={showWeekends}
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
          {activeEvent &&
            (() => {
              // Renderizar card dinámicamente según el tipo
              const EventCard = EVENT_TYPE_REGISTRY[activeEvent.type].Card
              return (
                <div className="opacity-80">
                  <EventCard event={activeEvent.data as any} />
                </div>
              )
            })()}
        </DragOverlay>
      </div>

      {/* Dialogs - Renderizados dinámicamente según el tipo */}
      {/* Dialog de creación - Por ahora solo para project */}
      <ProjectEventDialog
        mode="create"
        defaultDate={selectedDate || undefined}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Dialog de edición - Dinámico según tipo de evento */}
      {selectedEvent &&
        (() => {
          const EventDialog = getEventDialog(selectedEvent.type)
          return (
            <EventDialog
              mode="edit"
              event={selectedEvent.data as any}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
            />
          )
        })()}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
            <AlertDialogDescription>
              {eventToDelete &&
                (() => {
                  // Mensaje dinámico según el tipo de evento
                  switch (eventToDelete.type) {
                    case 'project':
                      return `¿Estás seguro de eliminar el evento del proyecto ${eventToDelete.data.project.customer.name}? Esta acción no se puede deshacer.`
                    case 'aftersale':
                      return `¿Estás seguro de eliminar el evento de postventa? Esta acción no se puede deshacer.`
                    case 'visit':
                      return `¿Estás seguro de eliminar el evento de visita de ${eventToDelete.data.visit.name}? Esta acción no se puede deshacer.`
                  }
                })()}
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
