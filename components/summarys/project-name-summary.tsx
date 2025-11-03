import { cn } from '@/lib/utils'

interface ProjectNameSummaryProps {
  projectId: string
  projectNumber: string
  customerName: string
  projectName?: string | null
  className?: string
}

/**
 * Componente que muestra un resumen del nombre del proyecto
 * con el número de proyecto y el cliente.
 * Si projectName es null o undefined, solo muestra cliente.
 */
export function ProjectNameSummary({
  projectId,
  projectNumber,
  customerName,
  projectName,
  className,
}: ProjectNameSummaryProps) {
  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      <div className="text-sm text-inherit">
        P - {projectNumber} - {customerName}
      </div>
      <div className="text-xs font-medium text-inherit">{projectName && ` ${projectName}`}</div>
    </div>
  )
}
