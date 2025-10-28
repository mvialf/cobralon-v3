/**
 * Types para el sistema de Team Tags (adaptado de CalReact uninstall-tags)
 */

/**
 * Color de badge (desde BadgeColor table)
 */
export type TagColor = {
  id: string
  name: string // "Azul", "Verde", etc.
  key: string // "blue", "green", etc.
  bgClass: string // "bg-blue-500"
  textClass: string // "text-white"
}

/**
 * Team Tag completa (desde API)
 */
export interface TeamTag {
  id: string
  name: string
  abbreviation: string
  colorId: string
  color: TagColor
  order?: number
  isActive?: boolean
  createdAt?: Date
}

/**
 * Props para TagSelector
 */
export interface TagSelectorProps {
  selectedTags: TeamTag[]
  availableTags: TeamTag[]
  availableColors: TagColor[]
  onTagsChange: (tags: TeamTag[]) => void
  onCreateTag?: (name: string, abbreviation: string, colorId: string) => void | Promise<void>
  onEditTag?: (
    tagId: string,
    name: string,
    abbreviation: string,
    colorId: string
  ) => void | Promise<void>
  onDeleteTag?: (tagId: string) => void | Promise<void>
  placeholder?: string
  label?: string
  className?: string
}

/**
 * Props para TagBadge
 */
export interface TagBadgeProps {
  tag: TeamTag
  removable?: boolean
  onRemove?: (tagId: string) => void
  className?: string
}

/**
 * Props para CreateTagModal
 */
export interface CreateTagModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreateTag: (name: string, abbreviation: string, colorId: string) => void | Promise<void>
  existingTags: TeamTag[]
  availableColors: TagColor[]
}

/**
 * Props para EditTagModal
 */
export interface EditTagModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onEditTag: (
    tagId: string,
    name: string,
    abbreviation: string,
    colorId: string
  ) => void | Promise<void>
  tag: TeamTag | null
  existingTags: TeamTag[]
  availableColors: TagColor[]
}
