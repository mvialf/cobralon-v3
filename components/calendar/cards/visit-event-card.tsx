'use client'

import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { VisitEventSummary } from '@/components/summarys/calendar/visit-event-summary'
import type { VisitEventWithRelations } from '@/lib/types/calendar'

interface VisitEventCardProps {
  event: VisitEventWithRelations
  onEdit?: () => void
  onDelete?: () => void
}

export function VisitEventCard({ event, onEdit, onDelete }: VisitEventCardProps) {
  const { visit } = event
  const { visitStatus } = visit

  return (
    <div className="group relative">
      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Content - VisitEventSummary ES la card completa */}
      <VisitEventSummary
        name={visit.name}
        comuna={visit.comuna}
        phone={visit.phone}
        scheduledTime={visit.scheduledTime}
        observations={visit.observations}
        visitStatus={{
          name: visitStatus.name,
          color: {
            bgClass: visitStatus.color.bgClass,
            textClass: visitStatus.color.textClass || undefined,
          },
        }}
        teamTags={event.teamTags?.map((tag) => ({
          id: tag.id,
          name: tag.name,
          abbreviation: tag.abbreviation,
          color: {
            bgClass: tag.color.bgClass,
            textClass: tag.color.textClass || undefined,
          },
        }))}
      />
    </div>
  )
}
