import { z } from 'zod'
import { FINANCIAL } from '../constants/financial-constants'

// Re-export business logic functions for convenience
export { calculateProjectBalance } from '../business-logic/project-balance'
export { calculateFIFO } from '../business-logic/payment-fifo'

/**
 * Type para PaymentMethod simplificado
 */
export type PaymentMethodInfo = {
  id: string
  name: string
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
  type: 'Project' | 'Customer'
  amount: number
  currency: string
  date: Date
  reference: string | null
  notes: string | null
  selectedInstallments: number | null
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
    .multipleOf(FINANCIAL.DECIMAL_PRECISION, 'El monto debe tener máximo 2 decimales'),
})

/**
 * Type para el payload de creación (API)
 */
export type CreatePaymentPayload = {
  type: 'Project' | 'Customer' // Tipo de pago
  customerId: string
  amount: number
  currency: string
  date: Date
  paymentMethodId: string
  reference: string | null
  notes: string | null
  selectedInstallments?: number | null
  allocations: Array<{
    projectId: string
    allocatedAmount: number
  }>
}

// ============================================================================
// SCHEMAS ESPECÍFICOS PARA FLUJOS SIMPLIFICADOS
// ============================================================================

/**
 * Schema para "Pago a Proyecto" (1:1)
 *
 * Flujo simplificado donde el usuario:
 * 1. Busca y selecciona un proyecto
 * 2. El customerId y currency se derivan automáticamente
 * 3. El monto se asigna 100% al proyecto seleccionado
 */
export const paymentToProjectSchema = z.object({
  // Proyecto seleccionado (required)
  projectId: z
    .string({
      required_error: 'Debe seleccionar un proyecto',
    })
    .uuid('ID de proyecto inválido'),

  // Monto del pago
  amount: z.coerce
    .number({
      required_error: 'El monto es obligatorio',
      invalid_type_error: 'El monto debe ser un número',
    })
    .positive('El monto debe ser mayor a 0')
    .multipleOf(FINANCIAL.DECIMAL_PRECISION, 'El monto debe tener máximo 2 decimales'),

  // Fecha del pago
  date: z.date({
    required_error: 'La fecha es obligatoria',
    invalid_type_error: 'Fecha inválida',
  }),

  // Método de pago
  paymentMethodId: z
    .string({
      required_error: 'Debe seleccionar un método de pago',
    })
    .uuid('ID de método de pago inválido'),

  // Cuotas sin interés (opcional)
  selectedInstallments: z.coerce
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 cuota')
    .optional()
    .nullable(),

  // Notas adicionales (opcional)
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .trim()
    .optional()
    .nullable(),
})

/**
 * Type inferido para el formulario de Pago a Proyecto
 */
export type PaymentToProjectFormValues = z.infer<typeof paymentToProjectSchema>

/**
 * Type para proyecto con balance calculado (usado en search)
 */
export type ProjectWithBalance = {
  id: string
  projectNumber: string
  projectName: string | null
  totalAmount: number
  currency: string
  balance: number
  createdAt: Date // Para ordenamiento FIFO
  customer: {
    id: string
    name: string
  }
}

/**
 * Helper para convertir form values de "Pago a Proyecto" a payload de API
 *
 * Transforma el schema simplificado 1:1 al schema completo del API
 */
export function paymentToProjectToPayload(
  values: PaymentToProjectFormValues,
  project: ProjectWithBalance
): CreatePaymentPayload {
  return {
    type: 'Project', // ← Tipo 1:1
    customerId: project.customer.id, // ← Derivado del proyecto
    amount: values.amount,
    currency: project.currency, // ← Derivado del proyecto
    date: values.date,
    paymentMethodId: values.paymentMethodId,
    reference: null,
    notes: values.notes || null,
    selectedInstallments: values.selectedInstallments || null,
    allocations: [
      {
        projectId: values.projectId,
        allocatedAmount: values.amount, // ← 100% del monto (1:1)
      },
    ],
  }
}

// ============================================================================
// SCHEMA PARA "PAGO A CLIENTE" (1:N)
// ============================================================================

/**
 * Schema para "Pago a Cliente" (1:N)
 *
 * Flujo donde el usuario:
 * 1. Selecciona un cliente
 * 2. Ingresa el monto total del pago
 * 3. Distribuye el monto entre múltiples proyectos (FIFO o manual)
 * 4. La suma de allocations debe ser exactamente igual al monto total
 */
export const paymentToCustomerSchema = z
  .object({
    // Cliente seleccionado (required)
    customerId: z
      .string({
        required_error: 'Debe seleccionar un cliente',
      })
      .uuid('ID de cliente inválido'),

    // Monto total del pago
    amount: z.coerce
      .number({
        required_error: 'El monto es obligatorio',
        invalid_type_error: 'El monto debe ser un número',
      })
      .positive('El monto debe ser mayor a 0')
      .multipleOf(FINANCIAL.DECIMAL_PRECISION, 'El monto debe tener máximo 2 decimales'),

    // Fecha del pago
    date: z.date({
      required_error: 'La fecha es obligatoria',
      invalid_type_error: 'Fecha inválida',
    }),

    // Método de pago
    paymentMethodId: z
      .string({
        required_error: 'Debe seleccionar un método de pago',
      })
      .uuid('ID de método de pago inválido'),

    // Cuotas sin interés (opcional)
    selectedInstallments: z.coerce
      .number()
      .int('Debe ser un número entero')
      .min(1, 'Mínimo 1 cuota')
      .optional()
      .nullable(),

    // Notas adicionales (opcional)
    notes: z
      .string()
      .max(500, 'Las notas no pueden exceder 500 caracteres')
      .trim()
      .optional()
      .nullable(),

    // Asignaciones a proyectos (array de allocations)
    allocations: z
      .array(
        z.object({
          projectId: z.string().uuid('ID de proyecto inválido'),
          allocatedAmount: z.coerce
            .number()
            .positive('El monto asignado debe ser mayor a 0')
            .multipleOf(FINANCIAL.DECIMAL_PRECISION, 'El monto debe tener máximo 2 decimales'),
        })
      )
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
      return Math.abs(totalAllocated - data.amount) < FINANCIAL.TOLERANCE
    },
    {
      message: 'La suma de los montos asignados debe ser igual al monto total del pago',
      path: ['allocations'],
    }
  )

/**
 * Type inferido para el formulario de Pago a Cliente
 */
export type PaymentToCustomerFormValues = z.infer<typeof paymentToCustomerSchema>

/**
 * Helper para convertir form values de "Pago a Cliente" a payload de API
 *
 * Transforma el schema simplificado 1:N al schema completo del API
 */
export function paymentToCustomerToPayload(
  values: PaymentToCustomerFormValues,
  currency: string // ← Derivado del primer proyecto (todos deben tener la misma)
): CreatePaymentPayload {
  return {
    type: 'Customer', // ← Tipo 1:N
    customerId: values.customerId,
    amount: values.amount,
    currency, // ← Derivada de los proyectos
    date: values.date,
    paymentMethodId: values.paymentMethodId,
    reference: null,
    notes: values.notes || null,
    selectedInstallments: values.selectedInstallments || null,
    allocations: values.allocations,
  }
}
