'use client'

import * as React from 'react'
import { NumericFormat } from 'react-number-format'

import { cn } from '@/lib/utils'
import { useConfiguration } from '@/hooks/use-configuration'

interface CurrencyInputProps {
  /** Valor numérico del input */
  value?: number | null
  /** Callback cuando el valor cambia */
  onChange: (value: number | null) => void
  /** Código de moneda ISO 4217 (ej: "EUR", "USD", "GBP", "CLP") */
  currency?: string
  /** Locale para formateo (ej: "es-ES", "en-US", "es-CL") */
  locale?: string
  /** Valor mínimo permitido */
  min?: number
  /** Valor máximo permitido */
  max?: number
  /** Precision de decimales (si se omite, se usa la de la moneda) */
  decimalScale?: number
  /** Permitir números negativos */
  allowNegative?: boolean
  /** Placeholder del input */
  placeholder?: string
  /** Si el input está deshabilitado */
  disabled?: boolean
  /** Clase CSS personalizada */
  className?: string
  /** ID del input */
  id?: string
  /** Nombre del input (para formularios) */
  name?: string
  /** Callback onFocus */
  onFocus?: React.FocusEventHandler<HTMLInputElement>
  /** Callback onBlur */
  onBlur?: React.FocusEventHandler<HTMLInputElement>
}

/**
 * Input de moneda con formateo en tiempo real (input masking)
 *
 * Features:
 * - Formateo mientras escribes: 1234567 → $1.234.567
 * - Separadores de miles automáticos
 * - Símbolo de moneda basado en configuración global
 * - Soporte para monedas sin decimales (CLP, JPY, KRW)
 * - Validación min/max (reforzada al salir del foco)
 * - Selección automática al enfocar
 *
 * @example Uso básico
 * ```tsx
 * <CurrencyInput
 *   value={amount}
 *   onChange={setAmount}
 * />
 * ```
 */
function CurrencyInput({
  value,
  onChange,
  currency: currencyProp,
  locale: localeProp,
  className,
  disabled,
  placeholder,
  min,
  max,
  decimalScale: decimalScaleProp,
  allowNegative: allowNegativeProp,
  id,
  name,
  onFocus,
  onBlur,
}: CurrencyInputProps) {
  // Leer configuración global del contexto
  const { configuration } = useConfiguration()

  // Prioridad: props > context > defaults
  const currency = currencyProp ?? configuration.currency ?? 'EUR'
  const locale = localeProp ?? configuration.locale ?? 'es-ES'

  // Monedas sin decimales (centavos eliminados)
  const currenciesWithoutDecimals = ['CLP', 'JPY', 'KRW']
  const defaultDecimalScale = currenciesWithoutDecimals.includes(currency) ? 0 : 2
  const decimalScale = decimalScaleProp ?? defaultDecimalScale

  // Obtener símbolo de moneda y separadores según locale
  const formatConfig = React.useMemo(() => {
    // Crear formatter para obtener el símbolo de la moneda
    const currencyFormatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })

    // Extraer símbolo de moneda (ej: "$", "€", "USD")
    const currencyParts = currencyFormatter.formatToParts(0)
    const currencySymbol = currencyParts.find((p) => p.type === 'currency')?.value || currency

    // Detectar separadores usando formatToParts (método confiable)
    const numberFormatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const parts = numberFormatter.formatToParts(12345.67)

    const thousandSeparator = parts.find((p) => p.type === 'group')?.value || ','
    const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value || '.'

    return {
      currencySymbol,
      thousandSeparator,
      decimalSeparator,
    }
  }, [locale, currency])

  // Handler para focus - seleccionar todo el contenido para facilitar edición
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // setTimeout necesario porque react-number-format reposiciona el cursor tras el focus
    setTimeout(() => e.target.select(), 0)
    onFocus?.(e)
  }

  // Handler para clamping estricto al salir del foco
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (value !== undefined && value !== null) {
      let numValue = value
      if (min !== undefined && numValue < min) numValue = min
      if (max !== undefined && numValue > max) numValue = max

      if (numValue !== value) {
        onChange(numValue)
      }
    }
    onBlur?.(e)
  }

  return (
    <NumericFormat
      value={value ?? ''}
      onValueChange={(values) => {
        const numValue = values.floatValue ?? null
        if (numValue !== value) {
          onChange(numValue)
        }
      }}
      // Configuración de formato
      thousandSeparator={formatConfig.thousandSeparator}
      decimalSeparator={formatConfig.decimalSeparator}
      decimalScale={decimalScale}
      fixedDecimalScale={decimalScale > 0}
      prefix={formatConfig.currencySymbol + ' '}
      allowNegative={allowNegativeProp ?? (min === undefined || min < 0)}
      // Props del input
      id={id}
      name={name}
      disabled={disabled}
      placeholder={placeholder || ''}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onDoubleClick={(e) => e.currentTarget.select()}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'tabular-nums',
        className
      )}
    />
  )
}

export { CurrencyInput }
