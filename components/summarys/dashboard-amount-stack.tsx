import { cn } from '@/lib/utils'

interface DashboardAmountStackProps {
  primary: React.ReactNode
  secondary?: React.ReactNode
  align?: 'start' | 'end' | 'center'
  className?: string
}

/**
 * Componente reutilizable para mostrar un monto destacado con un detalle secundario.
 * Usado en el Panel Principal para mantener consistencia visual entre
 * "Proximas Cuotas", "Nuevos Proyectos", "Ultimos Pagos" y la tarjeta "Destacado".
 */
export function DashboardAmountStack({
  primary,
  secondary,
  align = 'end',
  className,
}: DashboardAmountStackProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-center',
        align === 'end' && 'items-end',
        align === 'start' && 'items-start',
        align === 'center' && 'items-center',
        className
      )}
    >
      <div className="px-1 font-bold text-sm">{primary}</div>
      {secondary && <div className="px-1 text-xs text-muted-foreground">{secondary}</div>}
    </div>
  )
}
