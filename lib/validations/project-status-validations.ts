import { type BadgeColor } from './common'
import { baseStatusSchema, type BaseStatusFormValues } from './base-status-validations'

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

/**
 * Helper para convertir form values a API payload
 * @param values - Valores del formulario (nombre + color)
 * @param isInitial - Si el estado es inicial (determinado por el dialog)
 * @param isFinal - Si el estado es final (determinado por el dialog)
 */
export function formValuesToPayload(
  values: ProjectStatusFormValues,
  isInitial: boolean,
  isFinal: boolean
): CreateProjectStatusPayload {
  return {
    name: values.name,
    colorId: values.colorId,
    isInitial,
    isFinal,
  }
}

/**
 * Helper para convertir ProjectStatus a form values
 * Nota: Solo retorna nombre + color. El tipo (isInitial/isFinal) se preserva en el dialog.
 */
export function statusToFormValues(status: ProjectStatus): ProjectStatusFormValues {
  return {
    name: status.name,
    colorId: status.colorId,
  }
}
