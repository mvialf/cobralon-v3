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
  icon: string | null
  hasInstallments: boolean
  maxInstallments: number | null
  _count: PaymentMethodCount
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema de validación para crear/editar métodos de pago
 */
export const paymentMethodSchema = z
  .object({
    name: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(50, 'El nombre no puede exceder 50 caracteres')
      .trim(),
    icon: z
      .string()
      .max(50, 'El icono no puede exceder 50 caracteres')
      .trim()
      .nullable()
      .optional(),
    hasInstallments: z.boolean().optional(),
    maxInstallments: z
      .number()
      .int('Debe ser un número entero')
      .min(2, 'Mínimo 2 cuotas')
      .max(36, 'Máximo 36 cuotas')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Si hasInstallments = true, maxInstallments es requerido
      if (data.hasInstallments && !data.maxInstallments) {
        return false
      }
      return true
    },
    {
      message: 'El número máximo de cuotas es obligatorio cuando se habilitan cuotas',
      path: ['maxInstallments'],
    }
  )

/**
 * Type inferido del schema (para formularios)
 */
export type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>

/**
 * Type para el payload de creación (API)
 */
export type CreatePaymentMethodPayload = {
  name: string
  icon: string | null
  hasInstallments?: boolean
  maxInstallments?: number | null
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
    icon: values.icon || null,
    hasInstallments: values.hasInstallments || false,
    maxInstallments: values.maxInstallments || null,
  }
}

/**
 * Helper para convertir PaymentMethod a form values
 */
export function methodToFormValues(method: PaymentMethod): PaymentMethodFormValues {
  return {
    name: method.name,
    icon: method.icon,
    hasInstallments: method.hasInstallments,
    maxInstallments: method.maxInstallments,
  }
}
