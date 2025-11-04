import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { TagBadgeProps } from './types'

/**
 * Componente TagBadge - Muestra una team tag individual con colores de Tailwind
 *
 * CAMBIO CLAVE vs CalReact:
 * - CalReact: style={{ backgroundColor: hex, color: hex }}
 * - Cobralon: className={cn(bgClass, textClass)} desde BadgeColor table
 */
export const TagBadge = React.forwardRef<HTMLDivElement, TagBadgeProps>(
  ({ tag, removable = false, onRemove, className, showFullName = false, ...props }, ref) => {
    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation()
      onRemove?.(tag.id)
    }

    return (
      <div
        ref={ref}
        className={cn(
          // Estilos base del badge
          'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium',
          'rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          // Colores desde BadgeColor (Tailwind classes)
          tag.color.bgClass,
          tag.color.textClass,
          className
        )}
        {...props}
      >
        <span className="truncate max-w-[120px]" title={tag.name}>
          {showFullName ? tag.name : tag.abbreviation || tag.name}
        </span>

        {removable && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-3 w-3 p-0 ml-1 hover:bg-black/10 rounded-sm',
              'focus:ring-1 focus:ring-offset-0 focus:ring-current',
              'transition-colors'
            )}
            onClick={handleRemove}
            aria-label={`Remover tag ${tag.name}`}
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
    )
  }
)

TagBadge.displayName = 'TagBadge'
