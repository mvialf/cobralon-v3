import { cn } from '@/lib/utils'

interface AddressProjectSummaryProps {
  street: string
  apartment?: string | null
  comuna: string
  region: string
  className?: string
}

/**
 * Componente reutilizable para mostrar dirección de proyecto
 * Usado en sheets, dialogs y vistas de detalles
 */
export function AddressProjectSummary({
  street,
  apartment,
  comuna,
  region,
  className,
}: AddressProjectSummaryProps) {
  return (
    <div className={cn(className)}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dirección</h3>
      <p className="text-base">
        {street}
        {apartment && `, ${apartment}`}
      </p>
      <p className="text-sm text-muted-foreground">
        {comuna}, {region}
      </p>
    </div>
  )
}
