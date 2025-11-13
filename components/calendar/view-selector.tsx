'use client'

import { Calendar, CalendarDays, List } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type CalendarView = 'week' | 'month' | 'agenda'

interface ViewSelectorProps {
  currentView: CalendarView
  onViewChange: (view: CalendarView) => void
}

const VIEW_OPTIONS = [
  { value: 'week' as const, label: 'Semana', icon: Calendar },
  { value: 'month' as const, label: 'Mes', icon: CalendarDays },
  { value: 'agenda' as const, label: 'Agenda', icon: List },
]

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={currentView}
      onValueChange={(value) => {
        if (value) onViewChange(value as CalendarView)
      }}
      className="justify-start"
    >
      {VIEW_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={`Vista ${option.label}`}
          className="gap-2"
        >
          <option.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
