import { z } from 'zod'

/**
 * Type para los colores de badge disponibles (reutilizado de BadgeColor)
 */
export type BadgeColor = {
  id: string
  name: string
  key: string
  bgClass: string
  textClass: string
}

/**
 * Type completo de TeamTag (from API)
 */
export type TeamTag = {
  id: string
  name: string
  abbreviation: string
  colorId: string
  color: BadgeColor
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Schema de validación para crear/editar team tags
 */
export const teamTagSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  abbreviation: z
    .string()
    .length(2, 'La abreviatura debe tener exactamente 2 caracteres')
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'La abreviatura debe contener solo letras mayúsculas'),
  colorId: z.string().uuid('Debe seleccionar un color válido'),
})

/**
 * Type inferido del schema (para formularios)
 */
export type TeamTagFormValues = z.infer<typeof teamTagSchema>

/**
 * Type para el payload de creación (API)
 */
export type CreateTeamTagPayload = {
  name: string
  abbreviation: string
  colorId: string
}

/**
 * Type para el payload de actualización (API)
 */
export type UpdateTeamTagPayload = CreateTeamTagPayload

/**
 * Helper para auto-generar abreviatura desde nombre
 * Toma las primeras 2 letras del nombre en mayúsculas
 */
export function generateAbbreviation(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return ''
  if (trimmed.length === 1) return trimmed.toUpperCase() + 'X' // Padding
  return trimmed.substring(0, 2).toUpperCase()
}

/**
 * Helper para convertir TeamTag a form values
 */
export function tagToFormValues(tag: TeamTag): TeamTagFormValues {
  return {
    name: tag.name,
    abbreviation: tag.abbreviation,
    colorId: tag.colorId,
  }
}

/**
 * Schema para auto-generación de abreviatura (opcional)
 * Usado en modales donde el usuario puede dejar abbreviation vacío
 */
export const teamTagWithOptionalAbbreviationSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  abbreviation: z
    .string()
    .max(2, 'La abreviatura no puede exceder 2 caracteres')
    .toUpperCase()
    .optional(),
  colorId: z.string().uuid('Debe seleccionar un color válido'),
})

/**
 * Helper para normalizar payload con auto-generación de abreviatura
 */
export function normalizeTeamTagPayload(
  values: z.infer<typeof teamTagWithOptionalAbbreviationSchema>
): CreateTeamTagPayload {
  return {
    name: values.name,
    abbreviation: values.abbreviation || generateAbbreviation(values.name),
    colorId: values.colorId,
  }
}
