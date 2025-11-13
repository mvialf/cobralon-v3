import { z } from 'zod'

// Schema base para eventos
const baseEventSchema = z.object({
  scheduledDate: z.coerce.date({
    required_error: 'La fecha es requerida',
    invalid_type_error: 'Fecha inválida',
  }),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional().nullable(),
})

// ProjectEvent schemas
export const createProjectEventSchema = baseEventSchema.extend({
  projectId: z.string().uuid('ID de proyecto inválido'),
})

export const updateProjectEventSchema = baseEventSchema.partial()

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
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>

// Form values (scheduledDate como string para input type="date")
export type ProjectEventFormValues = {
  projectId: string
  scheduledDate: string
  notes?: string | null
}
