'use client'

import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AftersaleEventSummary } from '@/components/summarys/calendar/aftersale-event-summary'
import type { AftersaleEventWithRelations } from '@/lib/types/calendar'

interface AftersaleEventCardProps {
  event: AftersaleEventWithRelations
  onEdit?: () => void
  onDelete?: () => void
}

export function AftersaleEventCard({ event, onEdit, onDelete }: AftersaleEventCardProps) {
  const { aftersale } = event
  const { project, aftersaleStatus } = aftersale

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

      {/* Content - AftersaleEventSummary ES la card completa */}
      <AftersaleEventSummary
        projectId={project.id}
        projectNumber={project.projectNumber}
        projectName={project.projectName}
        customerName={project.customer.name}
        description={aftersale.description}
        aftersaleStatus={{
          name: aftersaleStatus.name,
          color: {
            bgClass: aftersaleStatus.color.bgClass,
            textClass: aftersaleStatus.color.textClass || undefined,
          },
        }}
        contactPhone={aftersale.contactPhone}
        comuna={project.comuna}
        teamTags={event.teamTags?.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: {
            bgClass: tag.color.bgClass,
            textClass: tag.color.textClass || undefined,
          },
        }))}
        tasks={aftersale.tasks}
      />
    </div>
  )
}
