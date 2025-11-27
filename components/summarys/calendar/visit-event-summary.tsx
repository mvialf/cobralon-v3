import { MapPin, Phone, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EVENT_TYPE_BORDER_COLORS } from '@/lib/constants/calendar'

interface VisitEventSummaryProps {
  name: string
  comuna: string
  phone?: string | null
  observations?: string | null
  visitStatus?: {
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  } | null
  teamTags?: Array<{
    id: string
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  }> | null
  className?: string
}

/**
 * Componente de resumen de visita para vistas de calendario.
 *
 * Muestra información esencial de la visita/medición en formato denso:
 * - Icono distintivo de visita (naranja)
 * - Nombre del prospecto
 * - Dirección completa
 * - Estado actual con badge
 * - Teléfono de contacto (si existe)
 * - Observaciones (si existen)
 *
 * Toda la información se renderiza condicionalmente si está disponible.
 * La altura es dinámica según el contenido.
 */
export function VisitEventSummary({
  name,
  comuna,
  phone,
  observations,
  visitStatus,
  teamTags,
  className,
}: VisitEventSummaryProps) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border bg-card p-3 pr-6 text-card-foreground',
        EVENT_TYPE_BORDER_COLORS.visit,
        className
      )}
    >
      {/* Nombre del prospecto */}
      <p className="text-sm font-medium truncate">{name}</p>

      <div className="flex justify-between">
        {visitStatus && (
          <Badge
            className={cn(
              'shrink-0 text-xs',
              visitStatus.color.bgClass,
              visitStatus.color.textClass || 'text-white'
            )}
          >
            {visitStatus.name}
          </Badge>
        )}
        {comuna && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{comuna}</span>
          </div>
        )}
      </div>

      {/* Team Tags - Integrantes asignados */}
      {Array.isArray(teamTags) && teamTags.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {teamTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className={cn('text-xs font-normal', tag.color.bgClass, tag.color.textClass)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Teléfono */}
      {phone && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span>{phone}</span>
        </div>
      )}

      {/* Observaciones */}
      {observations && (
        <p className="text-xs text-muted-foreground italic line-clamp-2">{observations}</p>
      )}
    </div>
  )
}
