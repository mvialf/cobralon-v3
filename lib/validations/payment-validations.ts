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
    .multipleOf(0.01, 'El monto debe tener máximo 2 decimales'),

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

  // Referencia (opcional, pero requerida si el método lo exige)
  reference: z
    .string()
    .max(100, 'La referencia no puede exceder 100 caracteres')
    .trim()
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
    customerId: project.customer.id, // ← Derivado del proyecto
    amount: values.amount,
    currency: project.currency, // ← Derivado del proyecto
    date: values.date,
    paymentMethodId: values.paymentMethodId,
    reference: values.reference || null,
    notes: values.notes || null,
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
      .multipleOf(0.01, 'El monto debe tener máximo 2 decimales'),

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

    // Referencia (opcional, pero requerida si el método lo exige)
    reference: z
      .string()
      .max(100, 'La referencia no puede exceder 100 caracteres')
      .trim()
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
            .multipleOf(0.01, 'El monto debe tener máximo 2 decimales'),
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
      return Math.abs(totalAllocated - data.amount) < 0.01 // Tolerance para decimales
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
    customerId: values.customerId,
    amount: values.amount,
    currency, // ← Derivada de los proyectos
    date: values.date,
    paymentMethodId: values.paymentMethodId,
    reference: values.reference || null,
    notes: values.notes || null,
    allocations: values.allocations,
  }
}

/**
 * Calcula distribución FIFO (First In First Out) de un pago
 *
 * Distribuye el monto total entre los proyectos ordenados por fecha de creación,
 * priorizando los proyectos más antiguos primero.
 *
 * @param projects - Array de proyectos con balance pendiente
 * @param totalAmount - Monto total a distribuir
 * @returns Array de allocations con projectId y allocatedAmount
 *
 * @example
 * const projects = [
 *   { id: '1', createdAt: new Date('2024-06-01'), balance: 300000 },
 *   { id: '2', createdAt: new Date('2024-08-01'), balance: 400000 },
 * ]
 * calculateFIFO(projects, 500000)
 * // => [
 * //   { projectId: '1', allocatedAmount: 300000 }, // Cierra proyecto 1
 * //   { projectId: '2', allocatedAmount: 200000 }, // Abono parcial proyecto 2
 * // ]
 */
export function calculateFIFO(
  projects: ProjectWithBalance[],
  totalAmount: number
): Array<{ projectId: string; allocatedAmount: number }> {
  // 1. Ordenar proyectos por fecha de creación (más antiguo primero)
  const sorted = [...projects].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // 2. Distribuir el monto total
  let remaining = totalAmount
  const allocations: Array<{ projectId: string; allocatedAmount: number }> = []

  for (const project of sorted) {
    if (remaining <= 0) break

    // Asignar el mínimo entre el balance pendiente y el monto restante
    const toAllocate = Math.min(remaining, project.balance)

    allocations.push({
      projectId: project.id,
      allocatedAmount: toAllocate,
    })

    remaining -= toAllocate
  }

  return allocations
}
