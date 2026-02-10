'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViewSelector } from './view-selector'
import { formatDateDisplay } from '@/lib/utils/calendar-utils'

interface CalendarToolbarProps {
  currentDate: Date
  view: 'week' | 'month' | 'agenda'
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
  onViewChange: (view: 'week' | 'month' | 'agenda') => void
  showWeekends: boolean
  onToggleWeekends: (value: boolean) => void
  onNewEvent: () => void
}

export function CalendarToolbar({
  currentDate,
  view,
  onNavigate,
  onViewChange,
  showWeekends,
  onToggleWeekends,
  onNewEvent,
}: CalendarToolbarProps) {
  const dateDisplay = formatDateDisplay(currentDate, view)

  return (
    <div className="flex flex-wrap items-center gap-4 pb-4">
      {/* Navegacion */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => onNavigate('today')}>
          Hoy
        </Button>
        <Button variant="outline" size="icon" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Fecha - elemento hero */}
      <h2 className="text-xl font-semibold capitalize text-foreground">{dateDisplay}</h2>

      {/* Controles - empujados a la derecha */}
      <div className="ml-auto flex items-center gap-2">
        <ViewSelector
          currentView={view}
          onViewChange={onViewChange}
          showWeekends={showWeekends}
          onToggleWeekends={onToggleWeekends}
        />
        <Button onClick={onNewEvent}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo</span>
        </Button>
      </div>
    </div>
  )
}
