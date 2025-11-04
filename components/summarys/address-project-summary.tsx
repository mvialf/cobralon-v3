import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'

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
    <div className={cn('flex flex-row items-start gap-3', className)}>
      <MapPin className="h-5 w-5" />
      <div>
        <p className="text-xs">
          {street}
          {apartment && `, ${apartment}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {comuna}, {region}
        </p>
      </div>
    </div>
  )
}
