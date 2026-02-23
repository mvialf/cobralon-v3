import { z } from 'zod'
import { todoListOptionalSchema, type TodoItemFormData } from './todo-validations'
import { chilePhoneSchema, addressOptionalStreetWithNullableApartmentSchema } from './common'
import { normalizePhone } from '@/lib/utils/phone'

/**
 * Schema de validación para crear/editar casos de postventa
 * Incluye campos de dirección del proyecto (editables)
 */
export const aftersaleSchema = z.object({
  projectId: z.string().uuid('Debe seleccionar un proyecto válido'),
  aftersaleStatusId: z.string().uuid('Debe seleccionar un estado válido'),
  contactPhone: chilePhoneSchema,
  description: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional()
    .default(''),
  reportedAt: z.date({
    required_error: 'La fecha de reporte es obligatoria',
    invalid_type_error: 'Fecha inválida',
  }),
  tasks: todoListOptionalSchema, // Lista de tareas para resolver el caso de postventa
  // Campos de dirección del proyecto (editables desde aftersale)
  ...addressOptionalStreetWithNullableApartmentSchema,
})

/**
 * Schema API para crear aftersale (server-side)
 * Usa z.string().datetime() en vez de z.date() porque recibe JSON serializado
 */
export const createAftersaleApiSchema = z.object({
  projectId: z.string().uuid('Debe seleccionar un proyecto válido'),
  aftersaleStatusId: z.string().uuid('Debe seleccionar un estado válido'),
  contactPhone: chilePhoneSchema,
  description: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional()
    .default(''),
  reportedAt: z.string().datetime({ message: 'Fecha de reporte inválida' }),
  tasks: todoListOptionalSchema,
  ...addressOptionalStreetWithNullableApartmentSchema,
})

/**
 * Schema API para actualizar aftersale (server-side, todos opcionales)
 */
export const updateAftersaleApiSchema = createAftersaleApiSchema.partial()

export type CreateAftersaleApiBody = z.infer<typeof createAftersaleApiSchema>
export type UpdateAftersaleApiBody = z.infer<typeof updateAftersaleApiSchema>

/**
 * Type inferido del schema (para formularios)
 */
export type AftersaleFormValues = z.infer<typeof aftersaleSchema>

/**
 * Type para Aftersale completo (from API)
 */
export type Aftersale = {
  id: string
  projectId: string
  aftersaleStatusId: string
  contactPhone: string
  description: string
  reportedAt: Date
  tasks: TodoItemFormData[]
  createdAt: Date
  updatedAt: Date
  project: {
    id: string
    projectNumber: string
    projectName: string | null
    customer: {
      name: string
    }
    // Campos de dirección del proyecto
    street: string | null
    apartment: string | null
    comuna: string
    region: string
  }
  aftersaleStatus: {
    id: string
    name: string
    color: {
      bgClass: string
      textClass: string
    }
  }
}

/**
 * Type para el payload de creación (API)
 */
export type CreateAftersalePayload = {
  projectId: string
  aftersaleStatusId: string
  contactPhone: string
  description?: string
  reportedAt: string // ISO string for API
  tasks?: TodoItemFormData[] // Lista de tareas para resolver el caso
  // Campos de dirección del proyecto
  street?: string
  apartment?: string | null
  comuna: string
  region: string
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateAftersalePayload = CreateAftersalePayload

/**
 * Helper para convertir form values a API payload
 */
export function formValuesToPayload(values: AftersaleFormValues): CreateAftersalePayload {
  return {
    projectId: values.projectId,
    aftersaleStatusId: values.aftersaleStatusId,
    contactPhone: values.contactPhone,
    description: values.description,
    reportedAt: values.reportedAt.toISOString(),
    tasks: values.tasks, // Incluir tareas
    // Campos de dirección del proyecto
    street: values.street || undefined,
    apartment: values.apartment,
    comuna: values.comuna,
    region: values.region,
  }
}

/**
 * Helper para convertir Aftersale a form values
 */
export function aftersaleToFormValues(aftersale: Aftersale): AftersaleFormValues {
  return {
    projectId: aftersale.projectId,
    aftersaleStatusId: aftersale.aftersaleStatusId,
    contactPhone: normalizePhone(aftersale.contactPhone), // Normalizar para manejar datos legacy
    description: aftersale.description,
    reportedAt: new Date(aftersale.reportedAt),
    tasks: aftersale.tasks || [], // Incluir tareas (default vacío si no existen)
    // Campos de dirección del proyecto
    street: aftersale.project.street || '',
    apartment: aftersale.project.apartment,
    comuna: aftersale.project.comuna,
    region: aftersale.project.region,
  }
}
