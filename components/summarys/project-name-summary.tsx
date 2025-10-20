import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProjectNameSummaryProps {
  projectNumber: string
  customerName: string
  projectName?: string | null
  projectId?: string // Si se provee, el componente será clickeable
  className?: string
}

/**
 * Componente que muestra un resumen del nombre del proyecto
 * con el número de proyecto y el cliente.
 * Si projectName es null o undefined, solo muestra cliente.
 * Si projectId es provisto, el componente es clickeable y lleva a /projects/[id]
 */
export function ProjectNameSummary({
  projectNumber,
  customerName,
  projectName,
  projectId,
  className,
}: ProjectNameSummaryProps) {
  const content = (
    <>
      <div className="text-sm text-muted-foreground">Proyecto #{projectNumber}</div>
      <div className="font-medium">
        {customerName}
        {projectName && ` - ${projectName}`}
      </div>
    </>
  )

  if (projectId) {
    return (
      <Link
        href={`/projects/${projectId}`}
        className={cn('flex flex-col space-y-1 transition-colors hover:text-primary', className)}
      >
        {content}
      </Link>
    )
  }

  return <div className={cn('flex flex-col space-y-1', className)}>{content}</div>
}
