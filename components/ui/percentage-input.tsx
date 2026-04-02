'use client'

import * as React from 'react'
import { NumericFormat } from 'react-number-format'

import { cn } from '@/lib/utils'

interface PercentageInputProps {
  /** Valor numérico del input (ej: 19.0 para 19%) */
  value?: number
  /** Callback cuando el valor cambia */
  onValueChange?: (value: number | undefined) => void
  /** Placeholder del input */
  placeholder?: string
  /** Número de decimales a mostrar (default: 1) */
  decimalScale?: number
  /** Valor mínimo permitido (default: 0) */
  min?: number
  /** Valor máximo permitido (default: 100) */
  max?: number
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
 * Input de porcentaje con formateo en tiempo real
 *
 * Features:
 * - Formateo mientras escribes: 19 → 19.0%
 * - Símbolo de porcentaje automático
 * - Validación min/max (default: 0-100)
 * - Decimales configurables
 *
 * @example Uso básico
 * ```tsx
 * <PercentageInput
 *   value={taxRate}
 *   onValueChange={setTaxRate}
 * />
 * ```
 *
 * @example Con React Hook Form
 * ```tsx
 * <FormField
 *   control={form.control}
 *   name="taxRate"
 *   render={({ field }) => (
 *     <PercentageInput
 *       value={field.value}
 *       onValueChange={field.onChange}
 *       placeholder="19.0"
 *     />
 *   )}
 * />
 * ```
 */
function PercentageInput({
  value,
  onValueChange,
  placeholder = '0.0',
  decimalScale = 1,
  min = 0,
  max = 100,
  disabled,
  className,
  id,
  name,
  onFocus,
  onBlur,
}: PercentageInputProps) {
  // Handler para seleccionar todo el contenido al enfocar
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // setTimeout necesario porque react-number-format reposiciona el cursor tras el focus
    setTimeout(() => e.target.select(), 0)
    onFocus?.(e)
  }

  return (
    <NumericFormat
      value={value}
      onValueChange={(values) => {
        let numValue = values.floatValue

        // Si el valor es undefined/null, pasar undefined
        if (numValue === undefined || numValue === null) {
          onValueChange?.(undefined)
          return
        }

        // Validar min/max
        if (min !== undefined && numValue < min) {
          numValue = min
        }
        if (max !== undefined && numValue > max) {
          numValue = max
        }

        onValueChange?.(numValue)
      }}
      // Configuración de formato
      suffix="%"
      decimalScale={decimalScale}
      fixedDecimalScale
      allowNegative={false}
      // Props del input
      id={id}
      name={name}
      disabled={disabled}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={onBlur}
      onDoubleClick={(e) => e.currentTarget.select()}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        'tabular-nums',
        className
      )}
    />
  )
}

export { PercentageInput }
