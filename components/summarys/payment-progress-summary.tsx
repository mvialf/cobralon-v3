'use client'

import { Badge } from '@/components/ui/badge'
import { useConfiguration } from '@/hooks/use-configuration'
import { PAYMENT_PROGRESS_THRESHOLDS } from '@/lib/constants/payment-constants'
import { cn } from '@/lib/utils'

interface PaymentProgressSummaryProps {
  /** Monto total pagado (puede incluir decimales) */
  totalPaid: number
  /** Porcentaje pagado (0-100, puede tener decimales ej: 67.45) */
  percentPaid: number
  /** Si el estado del proyecto es final (ej: Completado). Cambia badge a warning si hay balance pendiente */
  isFinal?: boolean
  /** Código de moneda (ej: "CLP", "USD"). Si no se provee, usa configuración global */
  currency?: string
  /** Locale para formateo (ej: "es-CL", "en-US"). Si no se provee, usa configuración global */
  locale?: string
  /** Clases CSS adicionales para el contenedor */
  className?: string
}

/**
 * Determina cuántos decimales usar según la moneda
 * CLP, JPY, KRW no usan decimales
 * USD, EUR, ARS, etc. usan 2 decimales
 */
function getCurrencyDecimals(currency: string): number {
  const noCurrencyDecimals = ['CLP', 'JPY', 'KRW']
  return noCurrencyDecimals.includes(currency.toUpperCase()) ? 0 : 2
}

/**
 * Determina el variant del Badge según el porcentaje pagado y estado del proyecto
 *
 * Si el proyecto está en estado final (ej: Completado) pero no está 100% pagado,
 * usa variant 'warning' (amarillo) para indicar que necesita ajuste/condonación.
 */
function determineVariant(
  percentPaid: number,
  isFinal?: boolean
): 'success' | 'default' | 'secondary' | 'destructive' | 'warning' {
  if (percentPaid >= PAYMENT_PROGRESS_THRESHOLDS.COMPLETE) {
    return 'success' // Verde - Completamente pagado
  }

  // Trabajo terminado pero balance pendiente → necesita atención
  if (isFinal) {
    return 'warning'
  }

  if (percentPaid >= PAYMENT_PROGRESS_THRESHOLDS.HIGH) {
    return 'default' // Neutral - Buen progreso
  } else if (percentPaid >= PAYMENT_PROGRESS_THRESHOLDS.MEDIUM) {
    return 'secondary' // Secundario - Progreso medio
  } else {
    return 'destructive' // Rojo - Requiere atención
  }
}

/**
 * Formatea un monto como moneda según el locale y currency
 */
function formatCurrency(amount: number, currency: string, locale: string): string {
  const decimals = getCurrencyDecimals(currency)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

/**
 * Componente que muestra el progreso de pago de un proyecto
 *
 * Renderiza:
 * - Monto pagado formateado como moneda
 * - Badge con porcentaje pagado redondeado
 * - Color del badge según umbrales de progreso
 *
 * @example
 * ```tsx
 * <PaymentProgressSummary
 *   totalPaid={750000}
 *   percentPaid={75}
 * />
 * // Resultado: "$750.000  [75%]" con badge color default
 * ```
 */
export function PaymentProgressSummary({
  totalPaid,
  percentPaid,
  isFinal,
  currency: propCurrency,
  locale: propLocale,
  className,
}: PaymentProgressSummaryProps) {
  const { configuration } = useConfiguration()

  // Prioridad: props > context > defaults
  const effectiveCurrency = propCurrency || configuration.currency || 'CLP'
  const effectiveLocale = propLocale || configuration.locale || 'es-CL'

  // Redondear porcentaje para mostrar (sin decimales)
  const percentRounded = Math.round(percentPaid)

  // Determinar color del badge según umbrales y estado
  const variant = determineVariant(percentPaid, isFinal)

  // Formatear monto con configuración regional
  const formattedAmount = formatCurrency(totalPaid, effectiveCurrency, effectiveLocale)

  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      <span>{formattedAmount}</span>
      <Badge variant={variant}>{percentRounded}%</Badge>
    </div>
  )
}
