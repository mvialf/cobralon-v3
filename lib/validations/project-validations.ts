import { z } from 'zod'
import { chilePhoneSchema, addressWithOptionalApartmentSchema } from './common'

/**
 * Valores válidos para filtro de estado de proyecto
 */
export const projectStateValues = z.enum(['Activo', 'Finalizado', 'all'])

/**
 * Schema base compartido (campos de entrada del usuario)
 */
const projectBaseSchema = z.object({
  // Relación con customer
  customerId: z.string().min(1, 'El cliente es requerido'),

  // Datos básicos
  projectNumber: z.string().min(1, 'El número de proyecto es requerido'),
  projectName: z.string().optional(), // Glosa opcional

  // Contacto
  phone: chilePhoneSchema,

  // Dirección del proyecto
  ...addressWithOptionalApartmentSchema,

  // Estado y fecha
  projectStatusId: z.string().min(1, 'El estado del proyecto es requerido'), // FK a ProjectStatus (obligatorio)
  date: z.date({
    required_error: 'La fecha de ingreso es requerida',
  }),

  // Financials
  subtotal: z
    .number({
      required_error: 'El subtotal es requerido',
      invalid_type_error: 'El subtotal debe ser un número',
    })
    .positive('El subtotal debe ser mayor a 0'),

  taxRate: z
    .number({
      invalid_type_error: 'El impuesto debe ser un número',
    })
    .min(0, 'El impuesto no puede ser negativo')
    .max(100, 'El impuesto no puede ser mayor a 100')
    .default(19),

  currency: z.string().length(3, 'La moneda debe ser un código de 3 letras').default('CLP'),

  // Metrics
  windowsCount: z
    .number({
      invalid_type_error: 'Los elementos deben ser un número',
    })
    .int('Los elementos deben ser un número entero')
    .min(0, 'Los elementos no pueden ser negativos')
    .default(0),

  squareMeters: z
    .number({
      invalid_type_error: 'Los m² deben ser un número',
    })
    .min(0, 'Los m² no pueden ser negativos')
    .default(0),

  // Descripción
  description: z.string().optional(),

  // Materiales de desinstalación (team tags)
  uninstallTagIds: z.array(z.string().uuid()).optional().default([]),
})

/**
 * Schema para el formulario (sin totalAmount - se calcula después de validación)
 */
export const projectFormSchema = projectBaseSchema

export type ProjectFormData = z.infer<typeof projectFormSchema>

/**
 * Schema completo con totalAmount (usado en API y operaciones con DB)
 */
export const projectSchema = projectBaseSchema.extend({
  totalAmount: z
    .number({
      invalid_type_error: 'El monto total debe ser un número',
    })
    .positive('El monto total debe ser mayor a 0'),
})

export type ProjectData = z.infer<typeof projectSchema>

/**
 * Type para el payload de creación (API)
 * Las fechas se envían como strings ISO en JSON
 */
export type CreateProjectAPIPayload = {
  customerId: string
  projectNumber: string
  projectName?: string
  phone: string
  street: string
  apartment?: string
  comuna: string
  region: string
  projectStatusId: string
  date: string // ISO string for API
  subtotal: number
  taxRate: number
  currency: string
  windowsCount: number
  squareMeters: number
  description?: string
  uninstallTagIds?: string[]
  totalAmount: number
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateProjectAPIPayload = Partial<CreateProjectAPIPayload> & {
  id: string
}

/**
 * Schema para creación vía API (acepta ISO strings para dates, projectStatusId nullable)
 * totalAmount se ignora y recalcula en servidor por seguridad
 */
export const createProjectApiSchema = projectBaseSchema.extend({
  projectStatusId: z.string().min(1).nullable().default(null),
  date: z.coerce.date({
    required_error: 'La fecha de ingreso es requerida',
  }),
  totalAmount: z.number().positive().optional(),
})

export type CreateProjectApiBody = z.infer<typeof createProjectApiSchema>

/**
 * Schema para actualización vía API (todos los campos opcionales)
 */
export const updateProjectApiSchema = createProjectApiSchema.partial()

export type UpdateProjectApiBody = z.infer<typeof updateProjectApiSchema>

/**
 * Helper para convertir form values a API payload
 */
export function projectFormToPayload(values: ProjectData): CreateProjectAPIPayload {
  return {
    customerId: values.customerId,
    projectNumber: values.projectNumber,
    projectName: values.projectName,
    phone: values.phone,
    street: values.street,
    apartment: values.apartment,
    comuna: values.comuna,
    region: values.region,
    projectStatusId: values.projectStatusId,
    date: values.date.toISOString(),
    subtotal: values.subtotal,
    taxRate: values.taxRate,
    currency: values.currency,
    windowsCount: values.windowsCount,
    squareMeters: values.squareMeters,
    description: values.description,
    uninstallTagIds: values.uninstallTagIds,
    totalAmount: values.totalAmount,
  }
}
