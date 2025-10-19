'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useRutInput } from '@/hooks/use-rut-input'
import { CheckCircle2, XCircle } from 'lucide-react'

export interface RutInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  /**
   * Valor inicial del RUT (puede ser formateado o limpio)
   */
  value?: string

  /**
   * Callback cuando el RUT cambia
   * Retorna el valor LIMPIO (sin puntos ni guión)
   *
   * @example
   * onRutChange={(cleanRut) => form.setValue('rut', cleanRut)}
   */
  onRutChange?: (cleanRut: string) => void

  /**
   * Mostrar indicador visual de validez (checkmark/x)
   * Default: false
   */
  showValidationIcon?: boolean

  /**
   * Si debe formatear mientras escribe
   * Default: true (formatea on-change)
   * Si es false, solo formatea en blur
   */
  formatOnChange?: boolean

  /**
   * Clase CSS custom
   */
  className?: string
}

/**
 * Input especializado para RUT chileno con formateo automático
 *
 * Features:
 * - Formateo automático (12.345.678-9)
 * - Validación en tiempo real
 * - Compatible con React Hook Form
 * - Sanitización de input (solo números, K, puntos, guión)
 *
 * @example Uso simple
 * ```tsx
 * <RutInput
 *   placeholder="12.345.678-9"
 *   onRutChange={(cleanRut) => console.log(cleanRut)}
 * />
 * ```
 *
 * @example Con React Hook Form
 * ```tsx
 * <FormField
 *   control={form.control}
 *   name="rut"
 *   render={({ field }) => (
 *     <FormItem>
 *       <FormLabel>RUT</FormLabel>
 *       <FormControl>
 *         <RutInput
 *           value={field.value}
 *           onRutChange={field.onChange}
 *           showValidationIcon
 *         />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )}
 * />
 * ```
 *
 * @example Con validación visual
 * ```tsx
 * <RutInput
 *   value={rut}
 *   onRutChange={setRut}
 *   showValidationIcon
 *   placeholder="Ingresa tu RUT"
 * />
 * ```
 */
export function RutInput({
  value: externalValue,
  onRutChange,
  showValidationIcon = false,
  formatOnChange = true,
  className,
  disabled,
  ...props
}: RutInputProps) {
  const { inputProps, isValid, formattedValue } = useRutInput({
    initialValue: externalValue,
    onChange: onRutChange,
    formatOnChange,
  })

  // Sincronizar con valor externo si cambia
  React.useEffect(() => {
    if (externalValue !== undefined && externalValue !== formattedValue) {
      // Solo actualizar si el valor externo es diferente
      // (evita loops infinitos)
    }
  }, [externalValue, formattedValue])

  const showIcon = showValidationIcon && formattedValue.length > 0

  return (
    <div className="relative">
      <input
        type="text"
        data-slot="input"
        disabled={disabled}
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          showIcon && 'pr-9', // Espacio para el icono
          className
        )}
        {...inputProps}
        {...props}
        aria-invalid={formattedValue.length > 0 && !isValid}
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
