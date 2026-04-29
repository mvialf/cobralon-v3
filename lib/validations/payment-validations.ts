import { z } from 'zod'
import { FINANCIAL, getBalanceTolerance } from '../constants/financial-constants'

// Re-export business logic functions for convenience
export { calculateProjectBalance } from '../business-logic/project-balance'
export { calculateFIFO } from '../business-logic/payment-fifo'

/**
 * Schema Zod para el body del POST /api/payments
 *
 * Reemplaza las validaciones manuales if-chain. Las reglas de negocio
 * que dependen de DB (customer exists, same currency, etc.) siguen
 * validándose después del parse.
 */
export const createPaymentApiSchema = z.object({
  type: z.enum(['Project', 'Customer'], {
    required_error: 'El tipo de pago es requerido',
    invalid_type_error: 'El tipo de pago debe ser "Project" o "Customer"',
  }),
  customerId: z
    .string({ required_error: 'El cliente es requerido' })
    .min(1, 'El cliente es requerido'),
  amount: z.coerce
    .number({
      required_error: 'El monto es requerido',
      invalid_type_error: 'El monto debe ser un número',
    })
    .positive('El monto debe ser mayor a 0'),
  currency: z
    .string({ required_error: 'La moneda es requerida' })
    .length(3, 'La moneda debe ser un código de 3 letras'),
  date: z.string({ required_error: 'La fecha es requerida' }).min(1, 'La fecha es requerida'),
  paymentMethodId: z
    .string({ required_error: 'El método de pago es requerido' })
    .min(1, 'El método de pago es requerido'),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  selectedInstallments: z.number().int().min(1).nullable().optional(),
  creditApplied: z.number().min(0).optional().default(0),
  allocations: z
    .array(
      z.object({
        projectId: z.string().min(1),
        allocatedAmount: z.number().positive(),
      })
    )
    .min(1, 'Debe asignar el pago a al menos un proyecto'),
})

export type CreatePaymentApiBody = z.infer<typeof createPaymentApiSchema>

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
  commissionAmount: number | null
  netAmount: number | null
  commissionRate: number | null
  commissionFixed: number | null
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

/**
 * Schema API para actualizar pago (server-side, todos opcionales)
 * Solo campos editables: amount, date, paymentMethodId, notes
 */
export const updatePaymentApiSchema = z.object({
  amount: z.coerce
    .number()
    .positive('El monto debe ser mayor a 0')
    .multipleOf(FINANCIAL.DECIMAL_PRECISION, 'El monto debe tener máximo 2 decimales')
    .optional(),
  date: z.coerce.date({ invalid_type_error: 'Fecha inválida' }).optional(),
  paymentMethodId: z.string().uuid('ID de método de pago inválido').optional(),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .trim()
    .nullable()
    .optional(),
})

export type UpdatePaymentApiBody = z.infer<typeof updatePaymentApiSchema>

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

  // Crédito del cliente a aplicar (opcional)
  creditApplied: z.coerce
    .number()
    .min(0, 'El crédito aplicado no puede ser negativo')
    .optional()
    .default(0),

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
 * Type para ProjectWithBalance serializado (como viene del API)
 *
 * Cuando los datos viajan por JSON, las fechas se convierten a strings ISO.
 * Este type representa la forma serializada.
 */
export type ProjectWithBalanceSerialized = Omit<ProjectWithBalance, 'createdAt'> & {
  createdAt: string // ISO 8601 string
}

/**
 * Transforma ProjectWithBalance serializado (del API) a objetos con Date
 *
 * Soluciona el problema de que JSON serializa Date como strings ISO.
 * Usa después de fetch para convertir strings de vuelta a Date objects.
 *
 * @param projects - Array de proyectos serializados (createdAt como string)
 * @returns Array de proyectos con createdAt como Date object
 *
 * @example
 * ```ts
 * const res = await fetch('/api/payments/customer-projects?customerId=123')
 * const data = await res.json() // createdAt es string aquí
 * const projects = parseProjectsWithBalance(data) // createdAt es Date ahora
 * calculateFIFO(1000, projects) // ✅ Funciona correctamente
 * ```
 */
export function parseProjectsWithBalance(
  projects: ProjectWithBalanceSerialized[]
): ProjectWithBalance[] {
  return projects.map((p) => ({
    ...p,
    createdAt: new Date(p.createdAt), // Convertir string ISO → Date
  }))
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
    // Nota: permitimos allocatedAmount >= 0 porque el formulario muestra TODAS las filas
    // y solo algunas tendrán valor. El filtrado y validación real ocurre en los refines.
    allocations: z
      .array(
        z.object({
          projectId: z.string().uuid('ID de proyecto inválido'),
          allocatedAmount: z.coerce
            .number()
            .min(0, 'El monto no puede ser negativo')
            .multipleOf(FINANCIAL.DECIMAL_PRECISION, 'El monto debe tener máximo 2 decimales'),
        })
      )
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
      // Debe haber al menos una allocation con monto > 0
      const allocationsWithValue = data.allocations.filter((a) => a.allocatedAmount > 0)
      return allocationsWithValue.length >= 1
    },
    {
      message: 'Debe asignar el pago a al menos un proyecto',
      path: ['allocations'],
    }
  )
  .refine(
    (data) => {
      // Suma de allocations (solo las con valor > 0) debe ser igual al monto total
      const totalAllocated = data.allocations
        .filter((a) => a.allocatedAmount > 0)
        .reduce((sum, a) => sum + a.allocatedAmount, 0)
      // Tolerancia laxa (CLP=1). El backend re-valida con la currency exacta del pago.
      return Math.abs(totalAllocated - data.amount) <= getBalanceTolerance('CLP')
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
