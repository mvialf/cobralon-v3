import { z } from 'zod'
import { type BadgeColor } from './badge-color'

/**
 * Interface base para tags (UninstallTag, TeamTag)
 */
export interface BaseTag {
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
 * Schema base para tags (name + abbreviation exacta 2 chars + colorId)
 */
export const baseTagSchema = z.object({
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

export type BaseTagFormValues = z.infer<typeof baseTagSchema>

/**
 * Schema con abbreviation opcional (para auto-generación)
 */
export const baseTagWithOptionalAbbreviationSchema = z.object({
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
 * Type para payload de creación/actualización de tags
 */
export type BaseTagPayload = {
  name: string
  abbreviation: string
  colorId: string
}

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
 * Helper para convertir cualquier tag a form values
 */
export function tagToFormValues<T extends BaseTag>(tag: T): BaseTagFormValues {
  return {
    name: tag.name,
    abbreviation: tag.abbreviation,
    colorId: tag.colorId,
  }
}

/**
 * Helper para normalizar payload con auto-generación de abreviatura
 */
export function normalizeTagPayload(
  values: z.infer<typeof baseTagWithOptionalAbbreviationSchema>
): BaseTagPayload {
  return {
    name: values.name,
    abbreviation: values.abbreviation || generateAbbreviation(values.name),
    colorId: values.colorId,
  }
}
