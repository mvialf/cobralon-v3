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
}

function PhoneInput({
  value,
  onChange,
  defaultCountry: countryProp,
  showValidationIcon = false,
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

  const defaultPlaceholder = `+${countryCallingCode} 9 1234 5678`

  // Validación del número
  const isValid = React.useMemo(() => {
    if (!value || value.length === 0) return true // Vacío no es error
    try {
      return RPNInput.isValidPhoneNumber(value, defaultCountry)
    } catch {
      return false
    }
  }, [value, defaultCountry])

  const showIcon = showValidationIcon && value.length > 0

  return (
    <div className="relative">
      {/* @ts-expect-error - react-phone-number-input tiene problemas de tipos con forwardRef */}
      <RPNInput.default
        international={false} // Sin selector internacional
        defaultCountry={defaultCountry}
        countrySelectComponent={() => null} // Quitar completamente el selector de país (bandera)
        inputComponent={InputComponent}
        value={value}
        onChange={(newValue) => onChange(newValue ?? '')}
        disabled={disabled}
        className={cn(showIcon && 'pr-9', className)} // Espacio para icono
        placeholder={placeholder || defaultPlaceholder}
        aria-invalid={value.length > 0 && !isValid}
        {...props}
      />

      {/* Icono de validación */}
      {showIcon && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
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
const InputComponent = React.forwardRef<HTMLInputElement, any>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      className={cn('tabular-nums', className)}
      {...props}
    />
  )
})

InputComponent.displayName = 'InputComponent'

export { PhoneInput }
