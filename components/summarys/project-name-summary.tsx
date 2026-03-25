import { cn } from '@/lib/utils'

interface ProjectNameSummaryProps {
  projectId: string
  projectNumber: string
  customerName: string
  projectName?: string | null
  className?: string
  size?: 'sm' | 'xs'
}

/**
 * Componente que muestra un resumen del nombre del proyecto
 * con el número de proyecto y el cliente.
 * Si projectName es null o undefined, solo muestra cliente.
 */
export function ProjectNameSummary({
  projectId: _projectId,
  projectNumber,
  customerName,
  projectName,
  className,
  size = 'sm',
}: ProjectNameSummaryProps) {
  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      <div className={cn('text-inherit', size === 'xs' ? 'text-xs' : 'text-sm')}>
        P - {projectNumber} - {customerName}
      </div>
      <div className="text-xs font-medium text-inherit">{projectName && ` ${projectName}`}</div>
    </div>
  )
}
