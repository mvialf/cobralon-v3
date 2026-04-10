import { z } from 'zod'

/**
 * Schema para crear un ajuste de proyecto
 */
export const createProjectAdjustmentSchema = z.object({
  amount: z
    .number({ required_error: 'El monto es requerido' })
    .positive('El monto debe ser positivo')
    .max(999999999.99, 'El monto es demasiado grande'),
  reason: z.string({ required_error: 'La razón es requerida' }).min(1, 'La razón es requerida'),
  reasonId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  appliedAt: z.coerce.date().optional(),
})

export type CreateProjectAdjustmentInput = z.infer<typeof createProjectAdjustmentSchema>

/**
 * Schema para el formulario (con strings que se convierten a number)
 */
export const projectAdjustmentFormSchema = z.object({
  amount: z.coerce
    .number({ required_error: 'El monto es requerido' })
    .positive('El monto debe ser positivo')
    .max(999999999.99, 'El monto es demasiado grande'),
  reason: z.string({ required_error: 'La razón es requerida' }).min(1, 'La razón es requerida'),
  reasonId: z.string().uuid().optional().nullable(),
  description: z.string().optional(),
  appliedAt: z.coerce.date().optional(),
})

export type ProjectAdjustmentFormValues = z.infer<typeof projectAdjustmentFormSchema>

/**
 * Type para ProjectAdjustment desde la API
 */
export type ProjectAdjustment = {
  id: string
  projectId: string
  amount: number
  reason: string
  reasonId: string | null
  description: string | null
  appliedAt: Date
  createdAt: Date
  updatedAt: Date
  adjustmentReason?: {
    name: string
    warningLevel: string
  } | null
}

/**
 * Valores por defecto para el formulario
 */
export const defaultProjectAdjustmentValues: Partial<ProjectAdjustmentFormValues> = {
  amount: undefined,
  reason: '',
  reasonId: null,
  description: '',
}
