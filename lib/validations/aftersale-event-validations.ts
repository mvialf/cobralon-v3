import { z } from 'zod'
import { todoListOptionalSchema } from '@/lib/validations/todo-validations'
import type { TodoItem } from '@/hooks/use-todo-list'
import { chilePhoneSchema, addressWithNullableOnlyApartmentSchema } from './common'

/**
 * Schema extendido para crear AftersaleEvent Y actualizar datos del Aftersale + Project
 *
 * Combina:
 * - Datos del evento (aftersaleId, scheduledDate)
 * - Datos editables del Aftersale (status, phone, description, tasks)
 * - Datos de dirección del Project (street, apartment, comuna, region)
 *
 * Patrón: Similar a createProjectEventWithProjectUpdateSchema
 */
export const createAftersaleEventWithUpdateSchema = z.object({
  // Datos del evento
  aftersaleId: z.string().uuid('ID de postventa inválido'),
  scheduledDate: z.coerce.date({
    required_error: 'La fecha es requerida',
    invalid_type_error: 'Fecha inválida',
  }),

  // Datos del Aftersale (editables)
  aftersaleStatusId: z.string().uuid('ID de estado inválido'),
  contactPhone: chilePhoneSchema,
  description: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .default(''),
  tasks: todoListOptionalSchema.optional(),

  // Datos de dirección del Project (editables desde aftersale)
  ...addressWithNullableOnlyApartmentSchema,

  // Team tags (integrantes asignados al evento)
  teamTagIds: z.array(z.string().uuid()).optional().nullable().default([]),
})

/**
 * Type inferido del schema para API
 */
export type CreateAftersaleEventWithUpdateInput = z.infer<
  typeof createAftersaleEventWithUpdateSchema
>

/**
 * Form values para el formulario
 */
export type AftersaleEventWithUpdateFormValues = {
  aftersaleId: string
  scheduledDate: Date
  aftersaleStatusId: string
  contactPhone: string
  description: string
  tasks?: TodoItem[]
  street: string
  apartment: string | null
  comuna: string
  region: string
  teamTagIds: string[] | null
}
