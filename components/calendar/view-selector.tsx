'use client'

import { Calendar, CalendarDays, List } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CalendarSettings } from './calendar-settings'

type CalendarView = 'week' | 'month' | 'agenda'

interface ViewSelectorProps {
  currentView: CalendarView
  onViewChange: (view: CalendarView) => void
  showWeekends: boolean
  onToggleWeekends: (value: boolean) => void
}

const VIEW_OPTIONS = [
  { value: 'week' as const, label: 'Semana', icon: Calendar },
  { value: 'month' as const, label: 'Mes', icon: CalendarDays },
  { value: 'agenda' as const, label: 'Agenda', icon: List },
]

export function ViewSelector({
  currentView,
  onViewChange,
  showWeekends,
  onToggleWeekends,
}: ViewSelectorProps) {
  const currentOption = VIEW_OPTIONS.find((opt) => opt.value === currentView)
  const IconComponent = currentOption?.icon

  return (
    <div className="flex items-center gap-2">
      <CalendarSettings showWeekends={showWeekends} onToggleWeekends={onToggleWeekends} />
      <Select value={currentView} onValueChange={onViewChange}>
        <SelectTrigger className="w-[110px] sm:w-[140px]">
          <div className="flex items-center gap-2">
            {IconComponent && <IconComponent className="h-4 w-4" />}
            <span className="hidden sm:inline">{currentOption?.label}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {VIEW_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <option.icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
