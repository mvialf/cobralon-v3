import { Wrench, Phone, CheckCircle } from 'lucide-react'
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
        {/* Icono distintivo de aftersale */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-900/30">
            <Wrench className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          </div>
        </div>

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

      {/* Status badge */}
      {aftersaleStatus && (
        <div>
          <Badge
            className={cn(
              'shrink-0 text-xs',
              aftersaleStatus.color.bgClass,
              aftersaleStatus.color.textClass || 'text-white'
            )}
          >
            {aftersaleStatus.name}
          </Badge>
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
