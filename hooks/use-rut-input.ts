import { useState, useCallback } from 'react'
import { rutHelpers } from '@/lib/rut-validations'

export interface UseRutInputOptions {
  /**
   * Valor inicial del RUT
   */
  initialValue?: string

  /**
   * Callback cuando el RUT cambia (valor limpio sin puntos ni guión)
   */
  onChange?: (cleanRut: string) => void

  /**
   * Si debe formatear mientras escribe (default: true)
   * Si es false, solo formatea en blur
   */
  formatOnChange?: boolean
}

export interface UseRutInputReturn {
  /**
   * Valor formateado del RUT (ej: "12.345.678-9")
   */
  formattedValue: string

  /**
   * Valor limpio del RUT (ej: "123456789")
   */
  cleanValue: string

  /**
   * Si el RUT actual es válido
   */
  isValid: boolean

  /**
   * Props para pasar directamente a un Input
   */
  inputProps: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onBlur: () => void
  }

  /**
   * Setea un nuevo valor (acepta formateado o limpio)
   */
  setValue: (value: string) => void

  /**
   * Limpia el input
   */
  clear: () => void
}

/**
 * Hook para manejar inputs de RUT con formateo automático
 *
 * @example
 * ```tsx
 * const { inputProps, isValid, cleanValue } = useRutInput({
 *   onChange: (cleanRut) => console.log(cleanRut)
 * })
 *
 * return <Input {...inputProps} />
 * ```
 *
 * @example Con React Hook Form
 * ```tsx
 * const form = useForm()
 * const rutInput = useRutInput({
 *   onChange: (cleanRut) => form.setValue('rut', cleanRut)
 * })
 *
 * return <Input {...rutInput.inputProps} />
 * ```
 */
export function useRutInput(options: UseRutInputOptions = {}): UseRutInputReturn {
  const { initialValue = '', onChange, formatOnChange = true } = options

  // Estado interno: siempre guardamos el valor formateado para display
  const [formattedValue, setFormattedValue] = useState(() =>
    initialValue ? rutHelpers.format(initialValue) : ''
  )

  // Valor limpio (sin puntos ni guión)
  const cleanValue = rutHelpers.clean(formattedValue)

  // Validación
  const isValid = formattedValue ? rutHelpers.validate(formattedValue) : false

  /**
   * Maneja cambios en el input
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value

      // Permitir solo números, puntos, guión y k/K
      const sanitized = inputValue.replace(/[^0-9kK.-]/g, '').toUpperCase()

      if (formatOnChange) {
        // Formatear mientras escribe
        const cleaned = rutHelpers.clean(sanitized)
        const formatted = cleaned ? rutHelpers.format(cleaned) : ''
        setFormattedValue(formatted)

        // Llamar onChange con valor limpio
        if (onChange) {
          onChange(cleaned)
        }
      } else {
        // No formatear, solo sanitizar
        setFormattedValue(sanitized)

        if (onChange) {
          onChange(rutHelpers.clean(sanitized))
        }
      }
    },
    [formatOnChange, onChange]
  )

  /**
   * Maneja blur (siempre formatea en blur)
   */
  const handleBlur = useCallback(() => {
    if (!formattedValue) return

    const cleaned = rutHelpers.clean(formattedValue)
    const formatted = cleaned ? rutHelpers.format(cleaned) : ''
    setFormattedValue(formatted)
  }, [formattedValue])

  /**
   * Setea un nuevo valor programáticamente
   */
  const setValue = useCallback((value: string) => {
    const cleaned = rutHelpers.clean(value)
    const formatted = cleaned ? rutHelpers.format(cleaned) : ''
    setFormattedValue(formatted)
  }, [])

  /**
   * Limpia el input
   */
  const clear = useCallback(() => {
    setFormattedValue('')
    if (onChange) {
      onChange('')
    }
  }, [onChange])

  return {
    formattedValue,
    cleanValue,
    isValid,
    inputProps: {
      value: formattedValue,
      onChange: handleChange,
      onBlur: handleBlur,
    },
    setValue,
    clear,
  }
}
