import { z } from 'zod'
import {
  type BadgeColor,
  baseTagSchema,
  baseTagWithOptionalAbbreviationSchema,
  generateAbbreviation,
  tagToFormValues as baseTagToFormValues,
  normalizeTagPayload,
  type BaseTag,
  type BaseTagFormValues,
  type BaseTagPayload,
} from './common'

export type { BadgeColor }

/**
 * Type completo de UninstallTag (from API)
 */
export type UninstallTag = BaseTag

/**
 * Schema de validación para crear/editar uninstall tags
 */
export const uninstallTagSchema = baseTagSchema

export type UninstallTagFormValues = BaseTagFormValues

export type CreateUninstallTagPayload = BaseTagPayload
export type UpdateUninstallTagPayload = CreateUninstallTagPayload

export { generateAbbreviation }

export function tagToFormValues(tag: UninstallTag): UninstallTagFormValues {
  return baseTagToFormValues(tag)
}

/**
 * Schema con abbreviation opcional (auto-generación)
 */
export const uninstallTagWithOptionalAbbreviationSchema = baseTagWithOptionalAbbreviationSchema

export function normalizeUninstallTagPayload(
  values: Parameters<typeof normalizeTagPayload>[0]
): CreateUninstallTagPayload {
  return normalizeTagPayload(values)
}

/**
 * Schema API para actualizar uninstall tags (PUT /api/uninstall-tags/[id])
 * Todos los campos opcionales
 */
export const updateUninstallTagApiSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  abbreviation: z
    .string()
    .length(2)
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  colorId: z.string().uuid().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})
export type UpdateUninstallTagApiBody = z.infer<typeof updateUninstallTagApiSchema>
