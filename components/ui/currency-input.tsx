'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Input } from './input'
import { useConfiguration } from '@/hooks/use-configuration'

interface CurrencyInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
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
}

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
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>('')
  const [isFocused, setIsFocused] = React.useState(false)

  // Leer configuración global del contexto
  const { configuration } = useConfiguration()

  // Prioridad: props > context > defaults
  const currency = currencyProp ?? configuration.currency ?? 'EUR'
  const locale = localeProp ?? configuration.locale ?? 'es-ES'

  // Monedas sin decimales (centavos eliminados)
  const currenciesWithoutDecimals = ['CLP', 'JPY', 'KRW']
  const useDecimals = !currenciesWithoutDecimals.includes(currency)

  // Formateador de moneda
  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: useDecimals ? 2 : 0,
        maximumFractionDigits: useDecimals ? 2 : 0,
      }),
    [locale, currency, useDecimals]
  )

  // Helper para formatear con separador de miles (workaround para Intl.NumberFormat)
  // Intl.NumberFormat solo agrega separador de miles desde 10.000 en algunos browsers
  const formatWithThousandsSeparator = React.useCallback(
    (num: number): string => {
      const formatted = formatter.format(num)

      // Para números entre 1.000-9.999, forzamos el separador manualmente
      if (num >= 1000 && num < 10000) {
        // Regex: Captura símbolo moneda, dígitos enteros, decimales, y sufijo
        // Ejemplo: "1234,56 €" → grupos: ["", "1234", ",56", " €"]
        const match = formatted.match(/^(\D*)(\d+)(,\d+)?(\D*)$/)
        if (match) {
          const [, prefix, integer, decimal = '', suffix] = match
          // Agregar punto cada 3 dígitos desde la derecha
          const withThousandsSep = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
          return `${prefix}${withThousandsSep}${decimal}${suffix}`
        }
      }

      // Para valores < 1000 o >= 10000, usar comportamiento estándar
      return formatted
    },
    [formatter]
  )

  // Actualizar display value cuando el value prop cambia (controlled)
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatWithThousandsSeparator(value))
    }
  }, [value, formatWithThousandsSeparator, isFocused])

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    // Mostrar solo el número cuando está en focus (sin formato)
    setDisplayValue(value.toString())
    props.onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    // Formatear cuando pierde el focus
    setDisplayValue(formatWithThousandsSeparator(value))
    props.onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Permitir solo números, punto decimal, coma y signo negativo
    const sanitized = inputValue.replace(/[^0-9.,-]/g, '')

    // Convertir coma a punto para parsing
    const normalized = sanitized.replace(',', '.')

    // Parsear a número
    let numValue = parseFloat(normalized)

    // Si es un número válido, actualizar
    if (!isNaN(numValue)) {
      // Redondear si la moneda no permite decimales
      if (!useDecimals) {
        numValue = Math.round(numValue)
      }

      // Validar min/max
      let finalValue = numValue

      if (min !== undefined && numValue < min) {
        finalValue = min
      }
      if (max !== undefined && numValue > max) {
        finalValue = max
      }

      onChange(finalValue)
      setDisplayValue(!useDecimals ? finalValue.toString() : normalized)
    } else if (sanitized === '' || sanitized === '-') {
      // Permitir campo vacío o solo signo negativo (en proceso de escribir)
      onChange(0)
      setDisplayValue(sanitized)
    }
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder={placeholder || formatter.format(0)}
      className={cn('tabular-nums', className)}
      {...props}
    />
  )
}

export { CurrencyInput }
