import { cn } from '@/lib/utils'

interface CustomerNameSummaryProps {
  name: string
  phone: string
  email?: string | null
  className?: string
}

/**
 * Componente que muestra un resumen del cliente
 * con nombre, teléfono y email (opcional).
 */
export function CustomerNameSummary({ name, phone, email, className }: CustomerNameSummaryProps) {
  return (
    <div className={cn('flex flex-col space-y-1', className)}>
      <div className="font-medium">{name}</div>
      <div className="text-sm text-muted-foreground">Tel: {phone}</div>
      {email && <div className="text-sm text-muted-foreground">{email}</div>}
    </div>
  )
}
