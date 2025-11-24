'use client'

import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CalendarSettingsProps {
  showWeekends: boolean
  onToggleWeekends: (value: boolean) => void
}

export function CalendarSettings({ showWeekends, onToggleWeekends }: CalendarSettingsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <Checkbox id="show-weekends" checked={showWeekends} onCheckedChange={onToggleWeekends} />
          <label htmlFor="show-weekends" className="cursor-pointer flex-1">
            Ver fin de semana
          </label>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
