'use client'

import * as React from 'react'
import { NumericFormat } from 'react-number-format'

import { cn } from '@/lib/utils'
import { useConfiguration } from '@/hooks/use-configuration'

interface CurrencyInputProps {
  /** Valor numérico del input */
  value: number
  /** Callback cuando el valor cambia */
  onChange: (value: number) => void
  /** Código de moneda ISO 4217 (ej: "EUR", "USD", "GBP", "CLP") */
  currency?: string
  /** Locale para formateo (ej: "es-ES", "en-US", "es-CL") */
  locale?: string
  /** Valor mínimo permitido */
  min?: number
  /** Valor máximo permitido */
  max?: number
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
 * - Validación min/max
 *
 * @example Uso básico
 * ```tsx
 * <CurrencyInput
 *   value={amount}
 *   onChange={setAmount}
 * />
 * ```
 *
 * @example Con moneda específica
 * ```tsx
 * <CurrencyInput
 *   value={amount}
 *   onChange={setAmount}
 *   currency="USD"
 *   locale="en-US"
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
  const useDecimals = !currenciesWithoutDecimals.includes(currency)

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
    // Usar número grande (12345.67) para garantizar que siempre aparezca separador de miles
    const numberFormatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    const parts = numberFormatter.formatToParts(12345.67)

    // Buscar separadores específicos por tipo
    const thousandSeparator = parts.find((p) => p.type === 'group')?.value || ','
    const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value || '.'

    return {
      currencySymbol,
      thousandSeparator,
      decimalSeparator,
    }
  }, [locale, currency])

  // Handler para seleccionar todo el contenido al hacer doble click
  const handleDoubleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select()
  }

  return (
    <NumericFormat
      value={value}
      onValueChange={(values) => {
        let numValue = values.floatValue || 0

        // Validar min/max
        if (min !== undefined && numValue < min) {
          numValue = min
        }
        if (max !== undefined && numValue > max) {
          numValue = max
        }

        onChange(numValue)
      }}
      // Configuración de formato
      thousandSeparator={formatConfig.thousandSeparator}
      decimalSeparator={formatConfig.decimalSeparator}
      decimalScale={useDecimals ? 2 : 0}
      fixedDecimalScale={useDecimals}
      prefix={formatConfig.currencySymbol + ' '}
      allowNegative={min === undefined || min < 0}
      // Props del input
      id={id}
      name={name}
      disabled={disabled}
      placeholder={placeholder || `${formatConfig.currencySymbol} 0`}
      onFocus={onFocus}
      onBlur={onBlur}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground  selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base  transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'tabular-nums',
        className
      )}
    />
  )
}

export { CurrencyInput }
