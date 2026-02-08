import { z } from 'zod'

/**
 * Schema de validación para devolución de crédito
 * Nota: el .refine() con availableCredit se aplica en el componente (depende de runtime data)
 */
export const refundCreditSchema = z.object({
  amount: z
    .number({
      required_error: 'Monto es requerido',
      invalid_type_error: 'Debe ser un número',
    })
    .positive('Monto debe ser positivo'),

  refundDate: z.string({
    required_error: 'Fecha de devolución es requerida',
  }),

  refundMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'], {
    required_error: 'Método de devolución es requerido',
  }),

  comments: z.string().optional(),
})

export type RefundCreditFormData = z.infer<typeof refundCreditSchema>
