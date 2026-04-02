'use client'

import * as React from 'react'
import * as RPNInput from 'react-phone-number-input'
import { CheckCircle2, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from './input'
import { useConfiguration } from '@/hooks/use-configuration'

interface PhoneInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** Valor del teléfono (formato E.164, ej: "+56912345678") */
  value: string
  /** Callback cuando el valor cambia */
  onChange: (value: string) => void
  /** Código de país ISO 3166-1 alpha-2 (ej: "CL", "US", "ES") */
  defaultCountry?: RPNInput.Country
  /** Mostrar indicador visual de validez (checkmark/x). Default: false */
  showValidationIcon?: boolean
  /** Mostrar prefijo de país fijo (visual). Default: true */
  showCountryPrefix?: boolean
  /** Forzar prefijo en el value si el usuario no lo incluye. Default: true */
  autoAddPrefix?: boolean
}

function PhoneInput({
  value,
  onChange,
  defaultCountry: countryProp,
  showValidationIcon = false,
  showCountryPrefix = true,
  autoAddPrefix = true,
  className,
  disabled,
  placeholder,
  ...props
}: PhoneInputProps) {
  // Leer configuración global del contexto
  const { configuration } = useConfiguration()

  // Prioridad: props > context > default (Chile)
  // Convertir código de país a mayúsculas (pais: "cl" -> "CL")
  const defaultCountry =
    countryProp ?? (configuration.pais.toUpperCase() as RPNInput.Country) ?? 'CL'

  // Placeholder dinámico basado en el país
  const countryCallingCode = React.useMemo(() => {
    try {
      return RPNInput.getCountryCallingCode(defaultCountry)
    } catch {
      return '56' // Fallback a Chile
    }
  }, [defaultCountry])

  const prefix = `+${countryCallingCode}`

  // Handler que auto-añade prefijo si falta
  const handleChange = (newValue: string | undefined) => {
    let finalValue = newValue ?? ''

    if (autoAddPrefix && finalValue && !finalValue.startsWith('+')) {
      // Usuario escribió "912345678" → forzar "+56912345678"
      finalValue = prefix + finalValue
    }

    onChange(finalValue)
  }

  // Validación del número (solo Chile: +56 + 9 dígitos)
  const isValid = React.useMemo(() => {
    if (!value || value.length === 0) return true // Vacío no es error

    // Validación estricta para Chile: +56 + exactamente 9 dígitos
    // Celular: +56 9 XXXX XXXX
    // Fijo RM: +56 2 XXXX XXXX
    // Fijo región: +56 YY XXX XXXX
    const chilePhonePattern = /^\+56[2-9]\d{8}$/

    return chilePhonePattern.test(value)
  }, [value])

  const showIcon = showValidationIcon && value.length > 0

  return (
    <div className="relative">
      {/* Prefijo visual fijo */}
      {showCountryPrefix && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
          <span className="text-sm font-medium text-muted-foreground">{prefix}</span>
        </div>
      )}

      {/* @ts-expect-error - react-phone-number-input tiene problemas de tipos con forwardRef */}
      <RPNInput.default
        international={false} // Sin selector internacional
        defaultCountry={defaultCountry}
        countrySelectComponent={() => null} // Quitar completamente el selector de país (bandera)
        inputComponent={InputComponent}
        value={value}
        onChange={handleChange} // Usa el nuevo handler con auto-add de prefijo
        disabled={disabled}
        inputClassName={cn(
          showCountryPrefix && 'pl-10', // Espacio para prefijo (+56)
          showIcon && 'pr-7', // Espacio para icono
          className
        )}
        placeholder={placeholder}
        aria-invalid={value.length > 0 && !isValid}
        {...props}
      />

      {/* Icono de validación */}
      {showIcon && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
          {isValid ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      )}
    </div>
  )
}

// Componente interno para el input (wrapper de shadcn/ui Input)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const InputComponent = React.forwardRef<HTMLInputElement, any>(
  ({ className, inputClassName, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        className={cn('tabular-nums', inputClassName, className)}
        {...props}
      />
    )
  }
)

InputComponent.displayName = 'InputComponent'

export { PhoneInput }
