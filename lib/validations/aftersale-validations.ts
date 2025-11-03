import { z } from 'zod'

/**
 * Schema de validación para crear/editar casos de postventa
 */
export const aftersaleSchema = z.object({
  projectId: z.string().uuid('Debe seleccionar un proyecto válido'),
  aftersaleStatusId: z.string().uuid('Debe seleccionar un estado válido'),
  description: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional()
    .default(''),
  reportedAt: z.date({
    required_error: 'La fecha de reporte es obligatoria',
    invalid_type_error: 'Fecha inválida',
  }),
})

/**
 * Type inferido del schema (para formularios)
 */
export type AftersaleFormValues = z.infer<typeof aftersaleSchema>

/**
 * Type para Aftersale completo (from API)
 */
export type Aftersale = {
  id: string
  projectId: string
  aftersaleStatusId: string
  description: string
  reportedAt: Date
  createdAt: Date
  updatedAt: Date
  project: {
    id: string
    projectNumber: string
    projectName: string | null
    customer: {
      name: string
    }
  }
  aftersaleStatus: {
    id: string
    name: string
    color: {
      bgClass: string
      textClass: string
    }
  }
}

/**
 * Type para el payload de creación (API)
 */
export type CreateAftersalePayload = {
  projectId: string
  aftersaleStatusId: string
  description?: string
  reportedAt: string // ISO string for API
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateAftersalePayload = CreateAftersalePayload

/**
 * Helper para convertir form values a API payload
 */
export function formValuesToPayload(values: AftersaleFormValues): CreateAftersalePayload {
  return {
    projectId: values.projectId,
    aftersaleStatusId: values.aftersaleStatusId,
    description: values.description,
    reportedAt: values.reportedAt.toISOString(),
  }
}

/**
 * Helper para convertir Aftersale a form values
 */
export function aftersaleToFormValues(aftersale: Aftersale): AftersaleFormValues {
  return {
    projectId: aftersale.projectId,
    aftersaleStatusId: aftersale.aftersaleStatusId,
    description: aftersale.description,
    reportedAt: new Date(aftersale.reportedAt),
  }
}
