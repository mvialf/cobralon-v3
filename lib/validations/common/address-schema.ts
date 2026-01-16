import { z } from 'zod'

/**
 * Campos base de dirección (siempre presentes)
 */
export const addressFieldsSchema = {
  street: z.string().min(1, 'La calle es obligatoria'),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
}

/**
 * Dirección con apartment opcional (para formularios de creación)
 * Usado en: project-validations, visit-validations
 */
export const addressWithOptionalApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().optional(),
}

/**
 * Dirección con apartment nullable y opcional (para formularios de edición)
 * Usado en: aftersale-validations, visit-event-validations
 */
export const addressWithNullableApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().nullable().optional(),
}

/**
 * Dirección con apartment solo nullable (para eventos de calendario)
 * Usado en: calendar-validations, aftersale-event-validations
 */
export const addressWithNullableOnlyApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().nullable(),
}
