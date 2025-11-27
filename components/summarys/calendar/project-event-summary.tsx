import { MapPin, Hash, Ruler, CheckCircle, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProjectNameSummary } from '@/components/summarys/project-name-summary'
import { cn } from '@/lib/utils'
import { EVENT_TYPE_BORDER_COLORS } from '@/lib/constants/calendar'

interface TodoItem {
  completed: boolean
}

interface ProjectEventSummaryProps {
  projectId: string
  projectNumber: string
  projectName?: string | null
  customerName: string
  projectStatus?: {
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  } | null
  comuna?: string | null
  uninstallTags?: Array<{
    id: string
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  }> | null
  teamTags?: Array<{
    id: string
    name: string
    color: {
      bgClass: string
      textClass?: string
    }
  }> | null
  windowsCount?: number | null
  squareMeters?: number | null
  tasks?: unknown | null
  className?: string
}

/**
 * Componente de resumen de proyecto para vistas de calendario.
 *
 * Muestra información esencial del proyecto en formato denso:
 * - Identificación del proyecto (número, nombre, cliente)
 * - Estado actual con badge
 * - Ubicación (comuna)
 * - Tags de desinstalación (todos, con wrap)
 * - Especificaciones técnicas (elementos, m²)
 *
 * Toda la información se renderiza condicionalmente si está disponible.
 * La altura es dinámica según el contenido.
 */
export function ProjectEventSummary({
  projectId,
  projectNumber,
  projectName,
  customerName,
  projectStatus,
  comuna,
  uninstallTags,
  teamTags,
  windowsCount,
  squareMeters,
  tasks,
  className,
}: ProjectEventSummaryProps) {
  const hasSpecs =
    (windowsCount !== null && windowsCount !== undefined && windowsCount > 0) ||
    (squareMeters !== null && squareMeters !== undefined && squareMeters > 0)
  const hasTasks = Array.isArray(tasks) && tasks.length > 0

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border bg-card p-3 pr-6 text-card-foreground',
        EVENT_TYPE_BORDER_COLORS.project,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <ProjectNameSummary
          projectId={projectId}
          projectNumber={projectNumber}
          projectName={projectName}
          customerName={customerName}
          className="flex-1 min-w-0"
        />
      </div>
      <div className="flex justify-between">
        {projectStatus && (
          <Badge
            className={cn(
              'shrink-0 text-xs',
              projectStatus.color.bgClass,
              projectStatus.color.textClass || 'text-white'
            )}
          >
            {projectStatus.name}
          </Badge>
        )}
        {comuna && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{comuna}</span>
          </div>
        )}
      </div>
      {Array.isArray(uninstallTags) &&
        uninstallTags.length > 0 &&
        (() => (
          <div className="flex flex-wrap gap-1">
            {uninstallTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className={cn('text-xs font-normal', tag.color.bgClass, tag.color.textClass)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        ))()}

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

      {hasSpecs && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {windowsCount !== null && windowsCount !== undefined && windowsCount > 0 && (
            <div className="flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              <span>
                {windowsCount} {windowsCount === 1 ? 'elemento' : 'elementos'}
              </span>
            </div>
          )}
          {squareMeters !== null && squareMeters !== undefined && squareMeters > 0 && (
            <div className="flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />
              <span>{squareMeters} m²</span>
            </div>
          )}
        </div>
      )}

      {hasTasks && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3" />
          <span>
            {(tasks as TodoItem[]).filter((t) => t.completed).length}/{(tasks as TodoItem[]).length}{' '}
            tareas
          </span>
        </div>
      )}
    </div>
  )
}
