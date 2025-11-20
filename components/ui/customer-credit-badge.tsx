import { DollarSign } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'

interface CustomerCreditBadgeProps {
  creditBalance: number
  compact?: boolean
  className?: string
}

/**
 * Badge component to display customer credit balance
 *
 * @param creditBalance - Customer's available credit
 * @param compact - If true, shows only the amount without "Crédito:" label
 * @param className - Additional CSS classes
 *
 * @example
 * <CustomerCreditBadge creditBalance={50000} />
 * // Renders: [badge with icon] Crédito: $50.000
 *
 * @example
 * <CustomerCreditBadge creditBalance={50000} compact />
 * // Renders: [badge with icon] $50.000
 */
export function CustomerCreditBadge({
  creditBalance,
  compact = false,
  className,
}: CustomerCreditBadgeProps) {
  // No mostrar badge si no hay crédito
  if (creditBalance === 0) return null

  return (
    <Badge variant="secondary" className={`gap-1 ${className || ''}`}>
      <DollarSign className="h-3 w-3" />
      {compact ? (
        formatCurrency(creditBalance, 'CLP')
      ) : (
        <>Crédito: {formatCurrency(creditBalance, 'CLP')}</>
      )}
    </Badge>
  )
}
