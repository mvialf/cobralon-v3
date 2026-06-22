'use client'

import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectFlagCellProps {
  projectId: string
  flagStatus: 'none' | 'flagged'
  isPending?: boolean
  onToggle?: (projectId: string, flagStatus: 'none' | 'flagged') => void
}

export function ProjectFlagCell({
  projectId,
  flagStatus,
  isPending = false,
  onToggle,
}: ProjectFlagCellProps) {
  const isFlagged = flagStatus === 'flagged'

  return (
    <button
      type="button"
      disabled={isPending || !onToggle}
      onClick={() => onToggle?.(projectId, isFlagged ? 'none' : 'flagged')}
      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      title={isFlagged ? 'Desmarcar' : 'Marcar para seguimiento'}
    >
      <Bookmark
        className={cn(
          'h-4 w-4 transition-colors',
          isFlagged ? 'fill-primary text-primary' : 'text-muted-foreground'
        )}
      />
    </button>
  )
}
