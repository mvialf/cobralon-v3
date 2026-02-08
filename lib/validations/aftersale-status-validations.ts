import { type BadgeColor } from './common'
import {
  baseStatusSchema,
  type BaseStatusFormValues,
  formValuesToPayload,
  statusToFormValues,
} from './base-status-validations'

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

// Re-exportar helpers compartidos desde base
export { formValuesToPayload, statusToFormValues }
