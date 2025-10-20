import { z } from 'zod'

/**
 * Type para los colores de badge disponibles
 */
export type BadgeColor = {
  id: string
  name: string
  key: string
  bgClass: string
  textClass: string
}

/**
 * Type para el conteo de proyectos asociados a un estado
 */
export type ProjectStatusCount = {
  projects: number
}

/**
 * Type completo de ProjectStatus (from API)
 */
export type ProjectStatus = {
  id: string
  name: string
  order: number
  colorId: string
  color: BadgeColor
  isInitial: boolean
  isFinal: boolean
  isActive: boolean
  _count: ProjectStatusCount
}

/**
 * Schema de validación para crear/editar estados de proyecto
 */
export const projectStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  colorId: z.string().uuid('Debe seleccionar un color válido'),
  type: z.enum(['normal', 'initial', 'final'], {
    required_error: 'Debe seleccionar un tipo de estado',
  }),
})

/**
 * Type inferido del schema (para formularios)
 */
export type ProjectStatusFormValues = z.infer<typeof projectStatusSchema>

/**
 * Type para el payload de creación (API)
 */
export type CreateProjectStatusPayload = {
  name: string
  colorId: string
  isInitial: boolean
  isFinal: boolean
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateProjectStatusPayload = CreateProjectStatusPayload

/**
 * Helper para convertir form values a API payload
 */
export function formValuesToPayload(values: ProjectStatusFormValues): CreateProjectStatusPayload {
  return {
    name: values.name,
    colorId: values.colorId,
    isInitial: values.type === 'initial',
    isFinal: values.type === 'final',
  }
}

/**
 * Helper para convertir ProjectStatus a form values
 */
export function statusToFormValues(status: ProjectStatus): ProjectStatusFormValues {
  return {
    name: status.name,
    colorId: status.colorId,
    type: status.isInitial ? 'initial' : status.isFinal ? 'final' : 'normal',
  }
}
