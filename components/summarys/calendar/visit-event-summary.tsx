import { MapPin, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EVENT_TYPE_BORDER_COLORS } from '@/lib/constants/calendar'

interface VisitEventSummaryProps {
  name: string
  street: string
  apartment?: string | null
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
  street,
  apartment,
  comuna,
  phone,
  observations,
  visitStatus,
  className,
}: VisitEventSummaryProps) {
  // Construir dirección completa
  const fullAddress = `${street}${apartment ? ` ${apartment}` : ''}, ${comuna}`

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border bg-card p-3 pr-6 text-card-foreground',
        EVENT_TYPE_BORDER_COLORS.visit,
        className
      )}
    >
      <div className="flex items-start gap-2">
        {/* Icono distintivo de visita */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-900/30">
            <MapPin className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Nombre del prospecto */}
          <p className="text-sm font-medium truncate">{name}</p>

          {/* Dirección */}
          <p className="text-xs text-muted-foreground truncate">{fullAddress}</p>
        </div>
      </div>

      {/* Status badge */}
      {visitStatus && (
        <div>
          <Badge
            className={cn(
              'shrink-0 text-xs',
              visitStatus.color.bgClass,
              visitStatus.color.textClass || 'text-white'
            )}
          >
            {visitStatus.name}
          </Badge>
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
