import { z } from 'zod'

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
  phone: z.string().min(1, 'El teléfono es requerido'), // Obligatorio

  // Dirección del proyecto
  street: z.string().min(1, 'La calle es obligatoria'),
  apartment: z.string().optional(),
  comuna: z.string().min(1, 'La comuna es obligatoria'),
  region: z.string().min(1, 'La región es obligatoria'),

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

/**
 * Schema para crear proyecto (usado en API)
 * El total se calcula automáticamente en el backend
 */
export const createProjectSchema = projectSchema

/**
 * Schema para actualizar proyecto (todos los campos opcionales excepto ID)
 */
export const updateProjectSchema = projectSchema.partial().extend({
  id: z.string().min(1, 'El ID del proyecto es requerido'),
})
