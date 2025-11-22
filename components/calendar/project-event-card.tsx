'use client'

import { MoreVertical, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { ProjectEventWithRelations } from '@/lib/types/calendar'
import type { TodoItem } from '@/hooks/use-todo-list'

interface ProjectEventCardProps {
  event: ProjectEventWithRelations
  onEdit?: () => void
  onDelete?: () => void
}

export function ProjectEventCard({ event, onEdit, onDelete }: ProjectEventCardProps) {
  const { project } = event

  return (
    <Card
      className="group relative p-3 hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: 'hsl(var(--chart-1))' }}
    >
      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Content */}
      <div className="space-y-2 pr-6">
        {/* Customer Name */}
        <div className="font-medium text-sm line-clamp-1">{project.customer.name}</div>

        {/* Project Number */}
        <div className="text-xs text-muted-foreground">#{project.projectNumber}</div>

        {/* Status Badge */}
        {project.projectStatus && (
          <Badge
            variant="outline"
            className="text-xs"
            style={{
              backgroundColor: project.projectStatus.color?.bgClass || 'transparent',
            }}
          >
            {project.projectStatus.name}
          </Badge>
        )}

        {/* Tasks Badge */}
        {event.tasks && Array.isArray(event.tasks) && event.tasks.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3" />
            <span>
              {(event.tasks as unknown as TodoItem[]).filter((t) => t.completed).length}/
              {event.tasks.length} tareas
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
