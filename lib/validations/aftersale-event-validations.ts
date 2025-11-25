import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'
import { todoListOptionalSchema } from '@/lib/validations/todo-validations'
import type { TodoItem } from '@/hooks/use-todo-list'

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
  scheduledDate: z.string().min(1, 'La fecha es requerida'),

  // Datos del Aftersale (editables)
  aftersaleStatusId: z.string().uuid('ID de estado inválido'),
  contactPhone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .transform((val) => normalizePhone(val))
    .refine(
      (val) => /^\+56[2-9]\d{8}$/.test(val),
      'Formato inválido. Debe ser un teléfono chileno válido (+56...)'
    ),
  description: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .default(''),
  tasks: todoListOptionalSchema.optional(),

  // Datos de dirección del Project (editables desde aftersale)
  street: z.string().min(1, 'La calle es obligatoria'),
  apartment: z.string().nullable(),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
})

/**
 * Type inferido del schema para API
 */
export type CreateAftersaleEventWithUpdateInput = z.infer<
  typeof createAftersaleEventWithUpdateSchema
>

/**
 * Form values para el formulario (scheduledDate como string para input type="date")
 */
export type AftersaleEventWithUpdateFormValues = {
  aftersaleId: string
  scheduledDate: string
  aftersaleStatusId: string
  contactPhone: string
  description: string
  tasks?: TodoItem[]
  street: string
  apartment: string | null
  comuna: string
  region: string
}
