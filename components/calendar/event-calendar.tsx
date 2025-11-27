'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CalendarHeader } from './calendar-header'
import { WeekView } from './views/week-view'
import { MonthView } from './views/month-view'
import { AgendaView } from './views/agenda-view'
import { ViewSelector } from './view-selector'
import { EventTypeSelector } from './event-type-selector'
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
import { useCalendarEvents, useReorderEvents } from '@/hooks/queries/use-calendar-events'
import { getEventsForDay } from '@/lib/utils/calendar-utils'
import { getVisibleDateRange, navigateDate } from '@/lib/utils/calendar-utils'
import type { CalendarEvent, CalendarEventType } from '@/lib/types/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { EVENT_TYPE_REGISTRY, getEventDialog } from '@/lib/config/event-types-config'

// Helper para convertir Date a string yyyy-MM-dd sin problemas de timezone
// Usa métodos locales (getFullYear, getMonth, getDate) que respetan la zona horaria local
function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Tipo para exponer métodos públicos via ref
export interface EventCalendarHandle {
  openNewEvent: (date?: Date | string) => void
}

export const EventCalendar = forwardRef<EventCalendarHandle>(function EventCalendar(_, ref) {
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
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [createEventType, setCreateEventType] = useState<CalendarEventType | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null) // Formato yyyy-MM-dd
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Estado para dialog de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null)

  // Estado para drag & drop
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)

  // Exponer método público para abrir el selector de nuevo evento
  useImperativeHandle(ref, () => ({
    openNewEvent: (date?: Date | string) => {
      // Convertir a string yyyy-MM-dd si es Date, o usar directamente si es string
      const dateStr =
        date instanceof Date ? toLocalDateString(date) : date || toLocalDateString(new Date())
      setSelectedDate(dateStr)
      setTypeSelectorOpen(true)
    },
  }))

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

  // Mutation para reordenar eventos dentro del mismo día
  const reorderMutation = useReorderEvents()

  // Configurar sensors con distance constraint para evitar conflictos con clicks
  // El drag solo inicia después de mover 8px, permitiendo clicks normales en botones
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handlers
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date())
    } else {
      setCurrentDate(navigateDate(currentDate, direction, currentView))
    }
  }

  const handleCreateEvent = (date: Date) => {
    setSelectedDate(toLocalDateString(date))
    setTypeSelectorOpen(true)
  }

  // Handler cuando se selecciona un tipo de evento
  const handleEventTypeSelected = (type: CalendarEventType) => {
    setCreateEventType(type)
    setCreateDialogOpen(true)
  }

  // Handler cuando se cierra el dialog de creación
  const handleCreateDialogClose = (open: boolean) => {
    setCreateDialogOpen(open)
    if (!open) {
      // Limpiar el tipo seleccionado cuando se cierra
      setCreateEventType(null)
    }
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
    const { active, over } = event

    if (!over || !activeEvent) {
      setActiveEvent(null)
      return
    }

    const overId = over.id
    const activeId = active.id

    // CASO 1: Soltado sobre un día (day-cell) - Movimiento de fecha
    if (over.data.current?.type === 'day-cell') {
      const targetDate = over.data.current?.date

      if (!targetDate) {
        setActiveEvent(null)
        return
      }

      // Comparar fechas usando strings YYYY-MM-DD
      const currentDateStr = activeEvent.data.scheduledDate.toString().substring(0, 10)
      const targetDateStr = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      )
        .toISOString()
        .substring(0, 10)

      // Si la fecha es la misma, no hacer nada
      if (currentDateStr === targetDateStr) {
        setActiveEvent(null)
        return
      }

      // Actualizar fecha
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
      return
    }

    // CASO 2: Soltado sobre otro evento - Reordenamiento dentro del mismo día
    if (activeId !== overId && data?.events) {
      // Encontrar la fecha del evento activo
      const eventDateStr = activeEvent.data.scheduledDate.toString().substring(0, 10)
      const eventDate = new Date(eventDateStr + 'T12:00:00') // Usar mediodía para evitar problemas de timezone

      // Obtener todos los eventos del mismo día
      const dayEvents = getEventsForDay(data.events, eventDate)

      // Ordenar por order actual
      const sortedEvents = [...dayEvents].sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))

      // Encontrar índices
      const oldIndex = sortedEvents.findIndex((e) => e.data.id === activeId)
      const newIndex = sortedEvents.findIndex((e) => e.data.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reordenar usando arrayMove
        const reorderedEvents = arrayMove(sortedEvents, oldIndex, newIndex)

        // Crear array de actualizaciones con nuevos órdenes
        const updates = reorderedEvents.map((event, index) => ({
          id: event.data.id,
          type: event.type,
          order: index,
        }))

        // Llamar a la API de reorder
        reorderMutation.mutate({ events: updates })
      }
    }

    setActiveEvent(null)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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

      {/* Selector de tipo de evento */}
      <EventTypeSelector
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        onSelectType={handleEventTypeSelected}
      />

      {/* Dialog de creación - Dinámico según tipo seleccionado */}
      {/* key={selectedDate} fuerza re-mount del form cuando cambia la fecha */}
      {createEventType &&
        (() => {
          const CreateDialog = getEventDialog(createEventType)
          return (
            <CreateDialog
              key={selectedDate || 'no-date'}
              mode="create"
              defaultDate={selectedDate || undefined}
              open={createDialogOpen}
              onOpenChange={handleCreateDialogClose}
            />
          )
        })()}

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
})
