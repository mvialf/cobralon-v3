import { z } from 'zod'

// --- Base ---

const locationFieldsSchema = {
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
}

// --- Street OBLIGATORIO (eventos de calendario) ---

export const addressFieldsSchema = {
  street: z.string().min(1, 'La calle es obligatoria'),
  ...locationFieldsSchema,
}

export const addressWithOptionalApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().optional(),
}

export const addressWithNullableApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().nullable().optional(),
}

export const addressWithNullableOnlyApartmentSchema = {
  ...addressFieldsSchema,
  apartment: z.string().nullable(),
}

// --- Street OPCIONAL (entidades: proyecto, visita, postventa) ---
// Al crear una entidad puede no conocerse la calle exacta.
// Se completa obligatoriamente al agendar un evento (trabajo de campo).

export const addressFieldsOptionalStreetSchema = {
  street: z.string().default(''),
  ...locationFieldsSchema,
}

export const addressOptionalStreetWithOptionalApartmentSchema = {
  ...addressFieldsOptionalStreetSchema,
  apartment: z.string().optional(),
}

export const addressOptionalStreetWithNullableApartmentSchema = {
  ...addressFieldsOptionalStreetSchema,
  apartment: z.string().nullable().optional(),
}
