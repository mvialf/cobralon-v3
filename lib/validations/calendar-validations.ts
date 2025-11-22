import { z } from 'zod'
import { normalizePhone } from '@/lib/utils/phone'
import { todoListOptionalSchema } from '@/lib/validations/todo-validations'
import type { TodoItem } from '@/hooks/use-todo-list'

// Schema base para eventos
const baseEventSchema = z.object({
  scheduledDate: z.coerce.date({
    required_error: 'La fecha es requerida',
    invalid_type_error: 'Fecha inválida',
  }),
  tasks: todoListOptionalSchema.optional(),
})

// ProjectEvent schemas
export const createProjectEventSchema = baseEventSchema.extend({
  projectId: z.string().uuid('ID de proyecto inválido'),
})

export const updateProjectEventSchema = baseEventSchema.partial()

/**
 * Schema extendido para crear evento Y actualizar datos del proyecto
 * Combina datos del evento con campos editables del proyecto
 */
export const createProjectEventWithProjectUpdateSchema = z.object({
  // Datos del evento
  projectId: z.string().uuid('ID de proyecto inválido'),
  scheduledDate: z.string().min(1, 'La fecha es requerida'),
  tasks: todoListOptionalSchema.optional(),

  // Datos del proyecto (validación consistente con project-validations.ts)
  projectStatusId: z.string().uuid('ID de estado inválido').optional(),
  phone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .transform((val) => normalizePhone(val))
    .refine(
      (val) => /^\+56[2-9]\d{8}$/.test(val),
      'Formato inválido. Debe ser un teléfono chileno válido (+56...)'
    ),
  street: z.string().min(1, 'La calle es obligatoria'),
  apartment: z.string().nullable(),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),
  windowsCount: z
    .number({ invalid_type_error: 'Los elementos deben ser un número' })
    .int('Los elementos deben ser un número entero')
    .min(0, 'Los elementos no pueden ser negativos'),
  squareMeters: z
    .number({ invalid_type_error: 'Los m² deben ser un número' })
    .min(0, 'Los m² no pueden ser negativos'),
  description: z.string().nullable(),
  uninstallTagIds: z.array(z.string().uuid()).optional().nullable().default([]),
})

// Schema para query params (rango de fechas)
export const calendarQuerySchema = z.object({
  start: z.coerce.date({
    required_error: 'Fecha de inicio es requerida',
  }),
  end: z.coerce.date({
    required_error: 'Fecha de fin es requerida',
  }),
})

// Types inferidos
export type CreateProjectEventInput = z.infer<typeof createProjectEventSchema>
export type UpdateProjectEventInput = z.infer<typeof updateProjectEventSchema>
export type CreateProjectEventWithProjectUpdateInput = z.infer<
  typeof createProjectEventWithProjectUpdateSchema
>
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>

// Form values (scheduledDate como string para input type="date")
export type ProjectEventFormValues = {
  projectId: string
  scheduledDate: string
}

/**
 * Form values extendidos con datos del proyecto
 */
export type ProjectEventWithProjectUpdateFormValues = {
  projectId: string
  scheduledDate: string
  tasks?: TodoItem[]
  projectStatusId?: string
  phone: string
  street: string
  apartment: string | null
  comuna: string
  region: string
  windowsCount: number
  squareMeters: number
  description: string | null
  uninstallTagIds: string[] | null
}
