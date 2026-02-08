import { z } from 'zod'
import { optionalChilePhoneSchema, addressWithOptionalApartmentSchema } from './common'

/**
 * Schema base compartido (campos de entrada del usuario)
 */
const visitBaseSchema = z.object({
  // Datos del prospecto
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),

  // Contacto (opcional)
  phone: optionalChilePhoneSchema,

  // Dirección de la visita (igual que Project)
  ...addressWithOptionalApartmentSchema,

  // Estado y fecha
  visitStatusId: z.string().min(1, 'El estado de la visita es requerido'), // FK a VisitStatus (obligatorio)
  date: z.date({
    required_error: 'La fecha de solicitud es requerida',
  }),

  // Hora agendada (informativo/referencial, formato HH:mm)
  scheduledTime: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
      'Formato de hora inválido. Use HH:mm (ej: 10:30)'
    ),

  // Observaciones
  observations: z.string().optional(),
})

/**
 * Schema para el formulario de creación
 */
export const createVisitSchema = visitBaseSchema

/**
 * Schema para el formulario de edición
 */
export const updateVisitSchema = visitBaseSchema.partial()

/**
 * Types derivados del formulario
 */
export type CreateVisitInput = z.infer<typeof createVisitSchema>
export type UpdateVisitInput = z.infer<typeof updateVisitSchema>

/**
 * Schema para validación en API (date como string ISO, no Date)
 */
export const createVisitApiSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  phone: optionalChilePhoneSchema,
  ...addressWithOptionalApartmentSchema,
  visitStatusId: z.string().min(1, 'El estado es requerido'),
  date: z.string().datetime('Fecha inválida'),
  scheduledTime: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val),
      'Formato de hora inválido'
    ),
  observations: z.string().optional(),
})

export type CreateVisitApiBody = z.infer<typeof createVisitApiSchema>

/**
 * Type para el payload de creación (API)
 * Las fechas se envían como strings ISO en JSON
 */
export type CreateVisitAPIPayload = {
  name: string
  phone?: string
  street: string
  apartment?: string
  comuna: string
  region: string
  visitStatusId: string
  date: string // ISO string for API
  scheduledTime?: string // Hora agendada (HH:mm)
  observations?: string
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateVisitAPIPayload = Partial<CreateVisitAPIPayload>

/**
 * Type para Visit completo (from API)
 */
export type Visit = {
  id: string
  name: string
  phone: string | null
  street: string
  apartment: string | null
  comuna: string
  region: string
  visitStatusId: string
  date: Date
  scheduledTime: string | null // Hora agendada (HH:mm)
  observations: string | null
  createdAt: Date
  updatedAt: Date
  visitStatus: {
    id: string
    name: string
    isInitial: boolean
    isFinal: boolean
    color: {
      bgClass: string
      textClass: string
    }
  }
}

/**
 * Helper para convertir form values a API payload
 */
export function formValuesToPayload(values: CreateVisitInput): CreateVisitAPIPayload {
  return {
    name: values.name,
    phone: values.phone,
    street: values.street,
    apartment: values.apartment,
    comuna: values.comuna,
    region: values.region,
    visitStatusId: values.visitStatusId,
    date: values.date.toISOString(),
    scheduledTime: values.scheduledTime,
    observations: values.observations,
  }
}

/**
 * Helper para convertir Visit a form values
 */
export function visitToFormValues(visit: Visit): CreateVisitInput {
  return {
    name: visit.name,
    phone: visit.phone || undefined,
    street: visit.street,
    apartment: visit.apartment || undefined,
    comuna: visit.comuna,
    region: visit.region,
    visitStatusId: visit.visitStatusId,
    date: new Date(visit.date),
    scheduledTime: visit.scheduledTime || undefined,
    observations: visit.observations || undefined,
  }
}
