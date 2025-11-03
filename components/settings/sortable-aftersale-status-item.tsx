'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import type { AftersaleStatus } from '@/lib/validations/aftersale-status-validations'

interface SortableAftersaleStatusItemProps {
  status: AftersaleStatus
  isDraggable: boolean
  onEdit: (status: AftersaleStatus) => void
  onDelete: (status: AftersaleStatus) => void
}

export function SortableAftersaleStatusItem({
  status,
  isDraggable,
  onEdit,
  onDelete,
}: SortableAftersaleStatusItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        {/* Handle de drag - solo visible si isDraggable */}
        {isDraggable ? (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </div>
        ) : (
          <div className="w-5 opacity-30">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        <StatusBadge bgClass={status.color.bgClass} label={status.name} />

        {status.isInitial && (
          <span className="rounded-md bg-blue-100 px-2 py-1 text-blue-700 text-xs font-medium">
            Inicial
          </span>
        )}
        {status.isFinal && (
          <span className="rounded-md bg-green-100 px-2 py-1 text-green-700 text-xs font-medium">
            Final
          </span>
        )}
        {status._count.aftersales > 0 && (
          <span className="text-muted-foreground text-xs">
            ({status._count.aftersales} caso{status._count.aftersales !== 1 ? 's' : ''} de
            postventa)
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(status)} title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(status)} title="Eliminar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
