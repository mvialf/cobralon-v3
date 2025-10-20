import { z } from 'zod'

/**
 * Type para el conteo de pagos asociados a un método
 */
export type PaymentMethodCount = {
  payments: number
}

/**
 * Type completo de PaymentMethod (from API)
 */
export type PaymentMethod = {
  id: string
  name: string
  active: boolean
  order: number
  requiresReference: boolean
  icon: string | null
  _count: PaymentMethodCount
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema de validación para crear/editar métodos de pago
 */
export const paymentMethodSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  requiresReference: z.boolean().default(false),
  icon: z.string().max(50, 'El icono no puede exceder 50 caracteres').trim().nullable().optional(),
})

/**
 * Type inferido del schema (para formularios)
 */
export type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>

/**
 * Type para el payload de creación (API)
 */
export type CreatePaymentMethodPayload = {
  name: string
  requiresReference: boolean
  icon: string | null
  active?: boolean
  order?: number
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdatePaymentMethodPayload = CreatePaymentMethodPayload

/**
 * Helper para convertir form values a API payload
 */
export function formValuesToPayload(values: PaymentMethodFormValues): CreatePaymentMethodPayload {
  return {
    name: values.name,
    requiresReference: values.requiresReference ?? false,
    icon: values.icon || null,
  }
}

/**
 * Helper para convertir PaymentMethod a form values
 */
export function methodToFormValues(method: PaymentMethod): PaymentMethodFormValues {
  return {
    name: method.name,
    requiresReference: method.requiresReference,
    icon: method.icon,
  }
}
