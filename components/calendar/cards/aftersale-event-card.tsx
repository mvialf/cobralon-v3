'use client'

import { Wrench, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { AftersaleEventWithRelations } from '@/lib/types/calendar'

interface AftersaleEventCardProps {
  event: AftersaleEventWithRelations
  onEdit?: () => void
  onDelete?: () => void
}

export function AftersaleEventCard({ event, onEdit, onDelete }: AftersaleEventCardProps) {
  const { aftersale } = event
  const { project, aftersaleStatus } = aftersale

  // Truncar descripción si es muy larga
  const truncatedDescription =
    aftersale.description.length > 60
      ? aftersale.description.substring(0, 60) + '...'
      : aftersale.description

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

      {/* Card Content */}
      <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-900/30">
              <Wrench className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Cliente */}
            <p className="text-sm font-medium truncate">{project.customer.name}</p>

            {/* Descripción */}
            <p className="text-xs text-muted-foreground line-clamp-2">{truncatedDescription}</p>

            {/* Footer: Status + Phone */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={aftersaleStatus.color.bgClass}
                style={{
                  color: aftersaleStatus.color.textClass || undefined,
                }}
              >
                {aftersaleStatus.name}
              </Badge>

              {aftersale.contactPhone && (
                <span className="text-xs text-muted-foreground">{aftersale.contactPhone}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
