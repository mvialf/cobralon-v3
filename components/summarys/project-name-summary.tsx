import { cn } from '@/lib/utils'

interface ProjectNameSummaryProps {
  projectNumber: string
  customerName: string
  projectName?: string | null
  projectId?: string // Mantener por compatibilidad, pero no se usa
  className?: string
}

/**
 * Componente que muestra un resumen del nombre del proyecto
 * con el número de proyecto y el cliente.
 * Si projectName es null o undefined, solo muestra cliente.
 */
export function ProjectNameSummary({
  projectNumber,
  customerName,
  projectName,
  className,
}: ProjectNameSummaryProps) {
  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      <div className="text-sm text-muted-foreground">Proyecto #{projectNumber}</div>
      <div className="font-medium">
        {customerName}
        {projectName && ` - ${projectName}`}
      </div>
    </div>
  )
}
