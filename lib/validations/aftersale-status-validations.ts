import { type BadgeColor } from './common'
import { baseStatusSchema, type BaseStatusFormValues } from './base-status-validations'

export type { BadgeColor }

/**
 * Type para el conteo de aftersales asociados a un estado
 */
export type AftersaleStatusCount = {
  aftersales: number
}

/**
 * Type completo de AftersaleStatus (from API)
 */
export type AftersaleStatus = {
  id: string
  name: string
  order: number
  colorId: string
  color: BadgeColor
  isInitial: boolean
  isFinal: boolean
  isActive: boolean
  _count: AftersaleStatusCount
}

/**
 * Schema de validación para crear/editar estados de postventa
 * Usa baseStatusSchema compartido (name + colorId)
 */
export const aftersaleStatusSchema = baseStatusSchema

/**
 * Type inferido del schema (para formularios)
 */
export type AftersaleStatusFormValues = BaseStatusFormValues

/**
 * Type para el payload de creación (API)
 */
export type CreateAftersaleStatusPayload = {
  name: string
  colorId: string
  isInitial: boolean
  isFinal: boolean
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateAftersaleStatusPayload = CreateAftersaleStatusPayload

/**
 * Helper para convertir form values a API payload
 * @param values - Valores del formulario (nombre + color)
 * @param isInitial - Si el estado es inicial (determinado por el dialog)
 * @param isFinal - Si el estado es final (determinado por el dialog)
 */
export function formValuesToPayload(
  values: AftersaleStatusFormValues,
  isInitial: boolean,
  isFinal: boolean
): CreateAftersaleStatusPayload {
  return {
    name: values.name,
    colorId: values.colorId,
    isInitial,
    isFinal,
  }
}

/**
 * Helper para convertir AftersaleStatus a form values
 * Nota: Solo retorna nombre + color. El tipo (isInitial/isFinal) se preserva en el dialog.
 */
export function statusToFormValues(status: AftersaleStatus): AftersaleStatusFormValues {
  return {
    name: status.name,
    colorId: status.colorId,
  }
}
