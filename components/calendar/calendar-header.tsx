'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateDisplay } from '@/lib/utils/calendar-utils'

interface CalendarHeaderProps {
  currentDate: Date
  view: 'week' | 'month' | 'agenda'
  onNavigate: (direction: 'prev' | 'next' | 'today') => void
}

export function CalendarHeader({ currentDate, view, onNavigate }: CalendarHeaderProps) {
  const dateDisplay = formatDateDisplay(currentDate, view)

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Navegación */}
      <div className="flex items-center gap-2">
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

      {/* Display de fecha */}
      <div className="text-xl font-semibold capitalize">{dateDisplay}</div>

      {/* Placeholder para ViewSelector (lo haremos después) */}
      <div className="w-[200px]">{/* ViewSelector aquí */}</div>
    </div>
  )
}
