/**
 * Types para el sistema de Uninstall Tags (adaptado de CalReact uninstall-tags)
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
 * Uninstall Tag completa (desde API)
 */
export interface UninstallTag {
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
  selectedTags: UninstallTag[]
  availableTags: UninstallTag[]
  availableColors: TagColor[]
  onTagsChange: (tags: UninstallTag[]) => void
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
  showFullNameInSelected?: boolean // Si true, las tags seleccionadas muestran nombre completo
}

/**
 * Props para TagBadge
 */
export interface TagBadgeProps {
  tag: UninstallTag
  removable?: boolean
  onRemove?: (tagId: string) => void
  className?: string
  showFullName?: boolean // Si true, muestra tag.name en lugar de tag.abbreviation
}

/**
 * Props para CreateTagModal
 */
export interface CreateTagModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreateTag: (name: string, abbreviation: string, colorId: string) => void | Promise<void>
  existingTags: UninstallTag[]
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
  tag: UninstallTag | null
  existingTags: UninstallTag[]
  availableColors: TagColor[]
}
