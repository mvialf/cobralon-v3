import { z } from 'zod'

/**
 * Type para PaymentMethod simplificado
 */
export type PaymentMethodInfo = {
  id: string
  name: string
  requiresReference: boolean
}

/**
 * Type para Customer simplificado
 */
export type CustomerInfo = {
  id: string
  name: string
}

/**
 * Type para Project simplificado (para pagos)
 */
export type ProjectInfo = {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: number | null
  currency: string
  createdAt: Date
}

/**
 * Type para PaymentAllocation
 */
export type PaymentAllocation = {
  id: string
  projectId: string
  allocatedAmount: number
  project?: ProjectInfo
}

/**
 * Type completo de Payment (from API)
 */
export type Payment = {
  id: string
  amount: number
  currency: string
  date: Date
  reference: string | null
  notes: string | null
  status: string
  cancelledAt: Date | null
  cancelledReason: string | null
  customerId: string
  paymentMethodId: string
  customer?: CustomerInfo
  paymentMethod?: PaymentMethodInfo
  allocations: PaymentAllocation[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema para una asignación de pago a proyecto
 */
export const paymentAllocationSchema = z.object({
  projectId: z.string().uuid('ID de proyecto inválido'),
  allocatedAmount: z.coerce
    .number()
    .positive('El monto debe ser mayor a 0')
    .multipleOf(0.01, 'El monto debe tener máximo 2 decimales'),
})

/**
 * Schema de validación para crear un pago
 */
export const paymentSchema = z
  .object({
    customerId: z.string().uuid('Debe seleccionar un cliente válido'),
    amount: z.coerce
      .number()
      .positive('El monto debe ser mayor a 0')
      .multipleOf(0.01, 'El monto debe tener máximo 2 decimales'),
    currency: z.string().min(3, 'Moneda inválida').max(3, 'Moneda inválida'),
    date: z.date({
      required_error: 'La fecha es obligatoria',
      invalid_type_error: 'Fecha inválida',
    }),
    paymentMethodId: z.string().uuid('Debe seleccionar un método de pago válido'),
    reference: z
      .string()
      .max(100, 'La referencia no puede exceder 100 caracteres')
      .trim()
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(500, 'Las notas no pueden exceder 500 caracteres')
      .trim()
      .optional()
      .nullable(),
    allocations: z
      .array(paymentAllocationSchema)
      .min(1, 'Debe asignar el pago a al menos un proyecto')
      .refine(
        (allocations) => {
          // No duplicados de projectId
          const projectIds = allocations.map((a) => a.projectId)
          return new Set(projectIds).size === projectIds.length
        },
        { message: 'No puede asignar el mismo proyecto dos veces' }
      ),
  })
  .refine(
    (data) => {
      // Suma de allocations debe ser igual al monto total
      const totalAllocated = data.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0)
      return Math.abs(totalAllocated - data.amount) < 0.01 // Tolerance para decimales
    },
    {
      message: 'La suma de los montos asignados debe ser igual al monto total del pago',
      path: ['allocations'],
    }
  )

/**
 * Alias para usar en formularios (más explícito)
 */
export const paymentFormSchema = paymentSchema

/**
 * Type inferido del schema (para formularios)
 */
export type PaymentFormValues = z.infer<typeof paymentSchema>
export type PaymentFormData = PaymentFormValues // Alias alternativo

/**
 * Type para el payload de creación (API)
 */
export type CreatePaymentPayload = {
  customerId: string
  amount: number
  currency: string
  date: Date
  paymentMethodId: string
  reference: string | null
  notes: string | null
  allocations: Array<{
    projectId: string
    allocatedAmount: number
  }>
}

/**
 * Helper para convertir form values a API payload
 */
export function formValuesToPayload(values: PaymentFormValues): CreatePaymentPayload {
  return {
    customerId: values.customerId,
    amount: values.amount,
    currency: values.currency,
    date: values.date,
    paymentMethodId: values.paymentMethodId,
    reference: values.reference || null,
    notes: values.notes || null,
    allocations: values.allocations,
  }
}

/**
 * Helper para calcular el balance de un proyecto
 */
export function calculateProjectBalance(project: {
  totalAmount: number | null
  allocations?: Array<{ allocatedAmount: number; payment?: { status: string } }>
}): {
  totalPaid: number
  balance: number
  percentPaid: number
  isFullyPaid: boolean
} {
  const totalAmount = project.totalAmount || 0

  // Solo contar pagos activos (no cancelados)
  const totalPaid =
    project.allocations?.reduce((sum, alloc) => {
      const isActive = !alloc.payment || alloc.payment.status === 'ACTIVE'
      return sum + (isActive ? alloc.allocatedAmount : 0)
    }, 0) || 0

  const balance = totalAmount - totalPaid
  const percentPaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0
  const isFullyPaid = balance <= 0

  return {
    totalPaid,
    balance,
    percentPaid,
    isFullyPaid,
  }
}
