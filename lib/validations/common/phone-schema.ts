import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'

// Constantes compartidas
const CHILE_PHONE_REGEX = /^\+56[2-9]\d{8}$/
const PHONE_ERROR_MESSAGE = 'Formato inválido. Debe ser un teléfono chileno válido (+56...)'

/**
 * Schema de teléfono chileno requerido
 * Normaliza a formato E.164 y valida formato
 */
export const chilePhoneSchema = z
  .string()
  .min(1, 'El teléfono es requerido')
  .transform((val) => normalizePhone(val))
  .refine((val) => CHILE_PHONE_REGEX.test(val), PHONE_ERROR_MESSAGE)

/**
 * Schema de teléfono chileno opcional
 * Solo valida si hay valor
 */
export const optionalChilePhoneSchema = z
  .string()
  .optional()
  .transform((val) => (val ? normalizePhone(val) : undefined))
  .refine((val) => !val || CHILE_PHONE_REGEX.test(val), PHONE_ERROR_MESSAGE)

// Exportar constantes para tests
export { CHILE_PHONE_REGEX, PHONE_ERROR_MESSAGE }
