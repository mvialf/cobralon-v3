import { Building2, MapPin, Phone, Ruler, Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProjectEventSummaryProps {
  projectNumber: string
  projectName?: string | null
  projectStatus?: {
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  } | null
  customerName: string
  phone: string
  address: {
    street: string
    apartment?: string | null
    comuna: string
    region: string
  }
  windowsCount?: number
  squareMeters?: number
  description?: string | null
  className?: string
}

/**
 * Componente reutilizable para mostrar detalles completos de un proyecto
 * en el contexto de eventos del calendario.
 *
 * Muestra información del proyecto sin datos financieros:
 * - Número y nombre del proyecto
 * - Estado actual
 * - Cliente y contacto
 * - Dirección completa
 * - Especificaciones (ventanas, m²)
 * - Descripción
 */
export function ProjectEventSummary({
  projectNumber,
  projectName,
  projectStatus,
  customerName,
  phone,
  address,
  windowsCount,
  squareMeters,
  description,
  className,
}: ProjectEventSummaryProps) {
  return (
    <div className={cn('space-y-3 rounded-lg border bg-muted/30 p-4', className)}>
      {/* Header: Número de proyecto + Estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              Proyecto #{projectNumber}
              {projectName && ` - ${projectName}`}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{customerName}</p>
        </div>
        {projectStatus && (
          <Badge
            className={cn(
              'shrink-0',
              projectStatus.color.bgClass,
              projectStatus.color.textClass || 'text-white'
            )}
          >
            {projectStatus.name}
          </Badge>
        )}
      </div>

      {/* Dirección */}
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p>
            {address.street}
            {address.apartment && `, ${address.apartment}`}
          </p>
          <p className="text-muted-foreground">
            {address.comuna}, {address.region}
          </p>
        </div>
      </div>

      {/* Teléfono */}
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm">{phone}</p>
      </div>

      {/* Elementos y m2 (si están disponibles) */}
      {(windowsCount !== undefined || squareMeters !== undefined) && (
        <div className="flex items-center gap-4">
          {windowsCount !== undefined && windowsCount > 0 && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                {windowsCount} {windowsCount === 1 ? 'elemento' : 'elementos'}
              </p>
            </div>
          )}
          {squareMeters !== undefined && squareMeters > 0 && (
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">{squareMeters} m²</p>
            </div>
          )}
        </div>
      )}

      {/* Descripción (si está disponible) */}
      {description && (
        <div className="border-t pt-3">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}
    </div>
  )
}
