import { z } from 'zod'

import { FINANCIAL } from '../constants/financial-constants'

/**
 * Type para el conteo de pagos asociados a un método
 */
export type PaymentMethodCount = {
  payments: number
}

/**
 * Type para un tier de comisión (from API)
 */
export type CommissionTier = {
  id: string
  minInstallments: number | null
  maxInstallments: number | null
  percentageFee: number
  fixedFee: number
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
  commissionTiers: CommissionTier[]
  _count: PaymentMethodCount
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema para un tier de comisión
 */
export const commissionTierSchema = z.object({
  minInstallments: z.number().int().min(1, 'Mínimo 1 cuota').nullable(),
  maxInstallments: z.number().int().min(1).max(36, 'Máximo 36 cuotas').nullable(),
  percentageFee: z
    .number()
    .min(0, 'No puede ser negativo')
    .max(FINANCIAL.COMMISSION.MAX_PERCENTAGE, `Máximo ${FINANCIAL.COMMISSION.MAX_PERCENTAGE}%`),
  fixedFee: z
    .number()
    .min(0, 'No puede ser negativo')
    .max(
      FINANCIAL.COMMISSION.MAX_FIXED_FEE,
      `Máximo ${FINANCIAL.COMMISSION.MAX_FIXED_FEE.toLocaleString()}`
    ),
})

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
    hasCommission: z.boolean().optional(),
    commissionTiers: z
      .array(commissionTierSchema)
      .max(FINANCIAL.COMMISSION.MAX_TIERS, `Máximo ${FINANCIAL.COMMISSION.MAX_TIERS} tramos`)
      .optional()
      .default([]),
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
  .refine(
    (data) => {
      // Validar que tiers con rango tengan ambos valores o ambos null
      for (const tier of data.commissionTiers) {
        const hasMin = tier.minInstallments !== null
        const hasMax = tier.maxInstallments !== null
        if (hasMin !== hasMax) return false
      }
      return true
    },
    {
      message: 'Los tramos deben tener ambos valores (desde y hasta) o ninguno',
      path: ['commissionTiers'],
    }
  )
  .refine(
    (data) => {
      // Validar que min <= max en cada tramo
      for (const tier of data.commissionTiers) {
        if (
          tier.minInstallments !== null &&
          tier.maxInstallments !== null &&
          tier.minInstallments > tier.maxInstallments
        ) {
          return false
        }
      }
      return true
    },
    {
      message: 'El mínimo de cuotas debe ser menor o igual al máximo en cada tramo',
      path: ['commissionTiers'],
    }
  )
  .refine(
    (data) => {
      // Validar que no haya rangos solapados entre tramos
      const rangedTiers = data.commissionTiers.filter(
        (t) => t.minInstallments !== null && t.maxInstallments !== null
      )
      for (let i = 0; i < rangedTiers.length; i++) {
        for (let j = i + 1; j < rangedTiers.length; j++) {
          const a = rangedTiers[i]
          const b = rangedTiers[j]
          if (
          a.minInstallments! <= b.maxInstallments! &&
          b.minInstallments! <= a.maxInstallments!
        ) {
            return false
          }
        }
      }
      return true
    },
    {
      message: 'Los tramos de cuotas no pueden solaparse',
      path: ['commissionTiers'],
    }
  )

/**
 * Schema para reordenar métodos de pago
 */
export const reorderPaymentMethodsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
})

export type ReorderPaymentMethodsBody = z.infer<typeof reorderPaymentMethodsSchema>

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
  commissionTiers?: Array<{
    minInstallments: number | null
    maxInstallments: number | null
    percentageFee: number
    fixedFee: number
  }>
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
    commissionTiers: values.hasCommission ? values.commissionTiers : [],
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
    hasCommission: method.commissionTiers.length > 0,
    commissionTiers: method.commissionTiers.map((t) => ({
      minInstallments: t.minInstallments,
      maxInstallments: t.maxInstallments,
      percentageFee: Number(t.percentageFee),
      fixedFee: Number(t.fixedFee),
    })),
  }
}
