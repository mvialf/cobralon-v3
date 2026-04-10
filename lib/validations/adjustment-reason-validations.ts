import { z } from 'zod'

/**
 * Niveles de advertencia para razones de ajuste
 * Determinan el impacto en el historial del cliente
 */
export const WARNING_LEVELS = [
  { value: 'none', label: 'Ninguno' },
  { value: 'caution', label: 'Precaución' },
  { value: 'critical', label: 'Crítico' },
] as const

export type WarningLevel = 'none' | 'caution' | 'critical'

/**
 * Type para AdjustmentReason desde la API
 */
export type AdjustmentReason = {
  id: string
  name: string
  warningLevel: WarningLevel
  isActive: boolean
  order: number
  _count: { adjustments: number }
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema para crear/editar una razón de ajuste
 */
export const adjustmentReasonSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  warningLevel: z.enum(['none', 'caution', 'critical']).default('none'),
  isActive: z.boolean().default(true),
})

export type AdjustmentReasonFormValues = z.infer<typeof adjustmentReasonSchema>
