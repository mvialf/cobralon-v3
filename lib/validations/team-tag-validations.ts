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
 * Type completo de TeamTag (from API)
 */
export type TeamTag = BaseTag

/**
 * Schema de validación para crear/editar team tags
 */
export const teamTagSchema = baseTagSchema

export type TeamTagFormValues = BaseTagFormValues

export type CreateTeamTagPayload = BaseTagPayload
export type UpdateTeamTagPayload = CreateTeamTagPayload

export { generateAbbreviation }

export function tagToFormValues(tag: TeamTag): TeamTagFormValues {
  return baseTagToFormValues(tag)
}

/**
 * Schema con abbreviation opcional (auto-generación)
 */
export const teamTagWithOptionalAbbreviationSchema = baseTagWithOptionalAbbreviationSchema

export function normalizeTeamTagPayload(
  values: Parameters<typeof normalizeTagPayload>[0]
): CreateTeamTagPayload {
  return normalizeTagPayload(values)
}
