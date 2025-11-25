'use client'

import { MapPin, MoreVertical, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
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
            <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
              <MapPin className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Nombre del prospecto */}
            <p className="text-sm font-medium truncate">{visit.name}</p>

            {/* Dirección */}
            <p className="text-xs text-muted-foreground truncate">
              {visit.street}
              {visit.apartment && ` ${visit.apartment}`}, {visit.comuna}
            </p>

            {/* Footer: Status + Phone */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={visitStatus.color.bgClass}
                style={{
                  color: visitStatus.color.textClass || undefined,
                }}
              >
                {visitStatus.name}
              </Badge>

              {visit.phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{visit.phone}</span>
                </div>
              )}
            </div>

            {/* Observaciones (si existen) */}
            {visit.observations && (
              <p className="text-xs text-muted-foreground italic line-clamp-1">
                {visit.observations}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
