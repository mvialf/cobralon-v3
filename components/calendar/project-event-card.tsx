'use client'

import { MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectEventSummaryCompact } from '@/components/summarys/calendar/project-event-summary-compact'
import type { ProjectEventWithRelations } from '@/lib/types/calendar'

interface ProjectEventCardProps {
  event: ProjectEventWithRelations
  onEdit?: () => void
  onDelete?: () => void
}

export function ProjectEventCard({ event, onEdit, onDelete }: ProjectEventCardProps) {
  const { project } = event

  return (
    <div className="group relative">
      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Content - ProjectEventSummaryCompact ES la card completa */}
      <ProjectEventSummaryCompact
        projectId={project.id}
        projectNumber={project.projectNumber}
        projectName={project.projectName}
        customerName={project.customer.name}
        projectStatus={
          project.projectStatus
            ? {
                name: project.projectStatus.name,
                color: {
                  bgClass: project.projectStatus.color.bgClass,
                  textClass: project.projectStatus.color.textClass || undefined,
                },
              }
            : undefined
        }
        comuna={project.comuna}
        uninstallTags={project.uninstallTags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          color: {
            bgClass: tag.color.bgClass,
            textClass: tag.color.textClass || undefined,
          },
        }))}
        windowsCount={project.windowsCount}
        squareMeters={Number(project.squareMeters)}
        tasks={event.tasks}
      />
    </div>
  )
}
