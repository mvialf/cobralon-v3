import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'

/**
 * Schema base compartido (campos de entrada del usuario)
 */
const visitBaseSchema = z.object({
  // Datos del prospecto
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),

  // Contacto (opcional)
  phone: z
    .string()
    .optional()
    .transform((val) => (val ? normalizePhone(val) : undefined))
    .refine(
      (val) => !val || /^\+56[2-9]\d{8}$/.test(val),
      'Formato inválido. Debe ser un teléfono chileno válido (+56...)'
    ),

  // Dirección de la visita (igual que Project)
  street: z.string().min(1, 'La calle es obligatoria'),
  apartment: z.string().optional(),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),

  // Estado y fecha
  visitStatusId: z.string().min(1, 'El estado de la visita es requerido'), // FK a VisitStatus (obligatorio)
  date: z.date({
    required_error: 'La fecha de solicitud es requerida',
  }),

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
    observations: visit.observations || undefined,
  }
}
