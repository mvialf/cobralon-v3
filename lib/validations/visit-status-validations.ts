import { type BadgeColor } from './common'
import { baseStatusSchema, type BaseStatusFormValues } from './base-status-validations'

export type { BadgeColor }

/**
 * Type para el conteo de visitas asociadas a un estado
 */
export type VisitStatusCount = {
  visits: number
}

/**
 * Type completo de VisitStatus (from API)
 */
export type VisitStatus = {
  id: string
  name: string
  order: number
  colorId: string
  color: BadgeColor
  isInitial: boolean
  isFinal: boolean
  isActive: boolean
  _count: VisitStatusCount
}

/**
 * Schema de validación para crear/editar estados de visita
 * Usa baseStatusSchema compartido (name + colorId)
 */
export const visitStatusSchema = baseStatusSchema

/**
 * Type inferido del schema (para formularios)
 */
export type VisitStatusFormValues = BaseStatusFormValues

/**
 * Type para el payload de creación (API)
 */
export type CreateVisitStatusPayload = {
  name: string
  colorId: string
  isInitial: boolean
  isFinal: boolean
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateVisitStatusPayload = CreateVisitStatusPayload

/**
 * Helper para convertir form values a API payload
 * @param values - Valores del formulario (nombre + color)
 * @param isInitial - Si el estado es inicial (determinado por el dialog)
 * @param isFinal - Si el estado es final (determinado por el dialog)
 */
export function formValuesToPayload(
  values: VisitStatusFormValues,
  isInitial: boolean,
  isFinal: boolean
): CreateVisitStatusPayload {
  return {
    name: values.name,
    colorId: values.colorId,
    isInitial,
    isFinal,
  }
}

/**
 * Helper para convertir VisitStatus a form values
 * Nota: Solo retorna nombre + color. El tipo (isInitial/isFinal) se preserva en el dialog.
 */
export function statusToFormValues(status: VisitStatus): VisitStatusFormValues {
  return {
    name: status.name,
    colorId: status.colorId,
  }
}
