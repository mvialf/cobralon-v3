import { z } from 'zod'

/**
 * Type para los colores de badge disponibles
 * Compartido por todos los tipos de status
 */
export type BadgeColor = {
  id: string
  name: string
  key: string
  bgClass: string
  textClass: string
}

/**
 * Type base para todos los status (Visit, Project, Aftersale)
 * Contiene los campos comunes a todos los tipos de estado
 */
export interface BaseStatus {
  id: string
  name: string
  order: number
  colorId: string
  color: BadgeColor
  isInitial: boolean
  isFinal: boolean
  isActive: boolean
  _count: Record<string, number>
}

/**
 * Schema base de validación para crear/editar estados
 * Compartido por todos los tipos de status
 */
export const baseStatusSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  colorId: z.string().uuid('Debe seleccionar un color válido'),
})

/**
 * Type inferido del schema base (para formularios)
 */
export type BaseStatusFormValues = z.infer<typeof baseStatusSchema>

/**
 * Type para el payload de creación/actualización (API)
 */
export type StatusPayload = {
  name: string
  colorId: string
  isInitial: boolean
  isFinal: boolean
}

/**
 * Helper para convertir form values a API payload
 */
export function formValuesToPayload(
  values: BaseStatusFormValues,
  isInitial: boolean,
  isFinal: boolean
): StatusPayload {
  return {
    name: values.name,
    colorId: values.colorId,
    isInitial,
    isFinal,
  }
}

/**
 * Helper para convertir cualquier status a form values
 */
export function statusToFormValues<T extends BaseStatus>(status: T): BaseStatusFormValues {
  return {
    name: status.name,
    colorId: status.colorId,
  }
}

/**
 * Configuración para diferentes tipos de entidad
 */
export type EntityType = 'visit' | 'project' | 'aftersale'

export interface EntityConfig {
  // Textos para UI
  title: string
  entityName: string
  entityNamePlural: string
  // Campos de API
  apiEndpoint: string
  countField: keyof BaseStatus['_count']
  // Respuesta del API
  responseKey: string
}

/**
 * Configuraciones predefinidas para cada tipo de entidad
 */
export const entityConfigs: Record<EntityType, EntityConfig> = {
  visit: {
    title: 'Estados de Visita',
    entityName: 'visita',
    entityNamePlural: 'visitas',
    apiEndpoint: '/api/visit-status',
    countField: 'visits',
    responseKey: 'visitStatuses',
  },
  project: {
    title: 'Estados de Proyecto',
    entityName: 'proyecto',
    entityNamePlural: 'proyectos',
    apiEndpoint: '/api/project-status',
    countField: 'projects',
    responseKey: 'projectStatuses',
  },
  aftersale: {
    title: 'Estados de Postventa',
    entityName: 'caso de postventa',
    entityNamePlural: 'casos de postventa',
    apiEndpoint: '/api/aftersale-status',
    countField: 'aftersales',
    responseKey: 'aftersaleStatuses',
  },
}
