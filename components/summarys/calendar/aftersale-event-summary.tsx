import { MapPin, Phone, CheckCircle, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { cn } from '@/lib/utils'
import { EVENT_TYPE_BORDER_COLORS } from '@/lib/constants/calendar'

interface TodoItem {
  completed: boolean
}

interface AftersaleEventSummaryProps {
  projectId: string
  projectNumber: string
  projectName?: string | null
  customerName: string
  description: string
  aftersaleStatus?: {
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  } | null
  contactPhone?: string | null
  comuna?: string | null
  teamTags?: Array<{
    id: string
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  }> | null
  tasks?: unknown | null
  className?: string
}

/**
 * Componente de resumen de aftersale para vistas de calendario.
 *
 * Muestra información esencial del caso de postventa en formato denso:
 * - Icono distintivo de aftersale (naranja)
 * - Identificación del proyecto (número, nombre, cliente)
 * - Descripción del problema (truncada)
 * - Estado actual con badge
 * - Teléfono de contacto (si existe)
 * - Contador de tareas (si existen)
 *
 * Toda la información se renderiza condicionalmente si está disponible.
 * La altura es dinámica según el contenido.
 */
export function AftersaleEventSummary({
  projectId,
  projectNumber,
  projectName,
  customerName,
  description,
  aftersaleStatus,
  contactPhone,
  comuna,
  teamTags,
  tasks,
  className,
}: AftersaleEventSummaryProps) {
  const hasTasks = Array.isArray(tasks) && tasks.length > 0

  // Truncar descripción si es muy larga
  const truncatedDescription =
    description.length > 80 ? description.substring(0, 80) + '...' : description

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border bg-card p-3 pr-6 text-card-foreground',
        EVENT_TYPE_BORDER_COLORS.aftersale,
        className
      )}
    >
      <div className="flex items-start gap-2">
        {/* Identificación del proyecto */}
        <ProjectNameSummary
          projectId={projectId}
          projectNumber={projectNumber}
          projectName={projectName}
          customerName={customerName}
          className="flex-1 min-w-0"
        />
      </div>

      {/* Descripción del problema */}
      <p className="text-xs text-muted-foreground line-clamp-2">{truncatedDescription}</p>

      <div className="flex justify-between">
        {aftersaleStatus && (
          <Badge
            className={cn(
              'shrink-0 text-xs',
              aftersaleStatus.color.bgClass,
              aftersaleStatus.color.textClass || 'text-white'
            )}
          >
            {aftersaleStatus.name}
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

      {/* Footer: Teléfono + Tareas */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {contactPhone && (
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            <span>{contactPhone}</span>
          </div>
        )}

        {hasTasks && (
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>
              {(tasks as TodoItem[]).filter((t) => t.completed).length}/
              {(tasks as TodoItem[]).length} tareas
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
