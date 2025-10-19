import { z } from 'zod'
import RUT from 'rut.js'

/**
 * Schema de Zod para validación de RUT chileno
 *
 * @example
 * ```tsx
 * const formSchema = z.object({
 *   rut: rutSchema,
 *   // o con mensaje custom:
 *   rut: rutSchema.refine(val => val !== "", {
 *     message: "El RUT es obligatorio"
 *   })
 * })
 * ```
 */
export const rutSchema = z
  .string()
  .min(1, 'El RUT es obligatorio')
  .refine(
    (value) => {
      // Permitir vacío si es opcional (depende del .min() de arriba)
      if (!value) return true

      // Validar usando rut.js
      return RUT.validate(value)
    },
    {
      message: 'RUT inválido',
    }
  )

/**
 * Schema de RUT opcional (puede estar vacío)
 *
 * @example
 * ```tsx
 * const formSchema = z.object({
 *   rutOpcional: rutSchemaOptional
 * })
 * ```
 */
export const rutSchemaOptional = z
  .string()
  .optional()
  .refine(
    (value) => {
      // Si está vacío, es válido
      if (!value || value === '') return true

      // Si tiene valor, validar
      return RUT.validate(value)
    },
    {
      message: 'RUT inválido',
    }
  )

/**
 * Helpers para trabajar con RUTs
 */
export const rutHelpers = {
  /**
   * Formatea un RUT con puntos y guión
   * @example "12345678-9" -> "12.345.678-9"
   */
  format: (rut: string): string => {
    if (!rut) return ''
    return RUT.format(rut)
  },

  /**
   * Limpia un RUT (remueve puntos y guión)
   * @example "12.345.678-9" -> "123456789"
   */
  clean: (rut: string): string => {
    if (!rut) return ''
    return RUT.clean(rut)
  },

  /**
   * Valida si un RUT es válido
   * @example rutHelpers.validate("12.345.678-9") -> true
   */
  validate: (rut: string): boolean => {
    if (!rut) return false
    return RUT.validate(rut)
  },

  /**
   * Obtiene el dígito verificador de un RUT
   * @example rutHelpers.getCheckDigit("12345678") -> "9"
   */
  getCheckDigit: (rut: string): string => {
    if (!rut) return ''
    const cleaned = RUT.clean(rut)
    return RUT.getCheckDigit(cleaned)
  },
}
