import { type BadgeColor } from './common'
import {
  baseStatusSchema,
  type BaseStatusFormValues,
  formValuesToPayload,
  statusToFormValues,
} from './base-status-validations'

export type { BadgeColor }

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
 * Usa baseStatusSchema compartido (name + colorId)
 */
export const projectStatusSchema = baseStatusSchema

/**
 * Type inferido del schema (para formularios)
 */
export type ProjectStatusFormValues = BaseStatusFormValues

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

// Re-exportar helpers compartidos desde base
export { formValuesToPayload, statusToFormValues }
