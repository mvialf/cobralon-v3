import { type BadgeColor } from './common'
import {
  baseStatusSchema,
  type BaseStatusFormValues,
  formValuesToPayload,
  statusToFormValues,
} from './base-status-validations'

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

// Re-exportar helpers compartidos desde base
export { formValuesToPayload, statusToFormValues }
