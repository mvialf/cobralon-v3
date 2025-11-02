import * as React from 'react'
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TagBadge } from './TagBadge'
import { CreateTagModal } from './CreateTagModal'
import { EditTagModal } from './EditTagModal'
import type { TagSelectorProps, UninstallTag } from './types'

/**
 * TagSelector - Selector de team tags con popover estilo Trello
 * Adaptado de CalReact con aplicación inmediata (sin botón Aceptar)
 */
export const TagSelector = React.forwardRef<HTMLDivElement, TagSelectorProps>(
  (
    {
      selectedTags,
      availableTags,
      availableColors,
      onTagsChange,
      onCreateTag,
      onEditTag,
      onDeleteTag,
      placeholder: _placeholder = 'Seleccionar tags...',
      label,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isCreatingTag, setIsCreatingTag] = React.useState(false)
    const [isEditingTag, setIsEditingTag] = React.useState(false)
    const [tagToEdit, setTagToEdit] = React.useState<UninstallTag | null>(null)

    const handleTagToggle = (tag: UninstallTag) => {
      const isSelected = selectedTags.some((selected) => selected.id === tag.id)

      if (isSelected) {
        onTagsChange(selectedTags.filter((selected) => selected.id !== tag.id))
      } else {
        onTagsChange([...selectedTags, tag])
      }
    }

    const handleRemoveTag = (tagId: string) => {
      onTagsChange(selectedTags.filter((tag) => tag.id !== tagId))
    }

    const handleCreateTag = async (name: string, abbreviation: string, colorId: string) => {
      if (!onCreateTag) return
      await onCreateTag(name, abbreviation, colorId)
      setIsCreatingTag(false)
    }

    const handleEditTag = async (
      tagId: string,
      name: string,
      abbreviation: string,
      colorId: string
    ) => {
      if (!onEditTag) return
      await onEditTag(tagId, name, abbreviation, colorId)
      setIsEditingTag(false)
      setTagToEdit(null)
    }

    const handleOpenEditModal = (tag: UninstallTag) => {
      setTagToEdit(tag)
      setIsEditingTag(true)
    }

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {label && (
          <div className="flex items-center justify-start gap-2">
            <Label className="text-sm font-medium">{label}</Label>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="Gestionar tags"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-80 max-h-[400px] overflow-y-auto" align="start">
                <div className="space-y-1 p-1">
                  {availableTags.length > 0 && (
                    <>
                      <div className="px-2 py-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {selectedTags.length}{' '}
                          {selectedTags.length === 1 ? 'tag seleccionada' : 'tags seleccionadas'}
                        </Label>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {availableTags.map((tag) => {
                          const isSelected = selectedTags.some((selected) => selected.id === tag.id)
                          return (
                            <div
                              key={tag.id}
                              className={cn(
                                'group flex items-center space-x-2 px-2 rounded-md cursor-pointer transition-colors',
                                isSelected ? 'bg-muted/70 hover:bg-muted' : 'hover:bg-muted/50'
                              )}
                              onClick={() => handleTagToggle(tag)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleTagToggle(tag)}
                                className="shrink-0"
                              />
                              <div className="flex-1 flex items-center gap-2 py-2">
                                <TagBadge tag={tag} className="text-sm" />
                                <span className="text-sm font-medium">{tag.name}</span>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 p-0 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {onEditTag && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenEditModal(tag)
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {onDeleteTag && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteTag(tag.id)
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {onCreateTag && (
                    <>
                      {availableTags.length > 0 && <Separator className="my-2" />}
                      <Button
                        variant="outline"
                        className="w-full justify-start mx-1"
                        onClick={() => setIsCreatingTag(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Crear nueva tag
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} removable onRemove={handleRemoveTag} />
            ))}
          </div>
        )}

        {onCreateTag && (
          <CreateTagModal
            isOpen={isCreatingTag}
            onOpenChange={setIsCreatingTag}
            onCreateTag={handleCreateTag}
            existingTags={availableTags}
            availableColors={availableColors}
          />
        )}

        {onEditTag && (
          <EditTagModal
            isOpen={isEditingTag}
            onOpenChange={setIsEditingTag}
            onEditTag={handleEditTag}
            tag={tagToEdit}
            existingTags={availableTags}
            availableColors={availableColors}
          />
        )}
      </div>
    )
  }
)

TagSelector.displayName = 'TagSelector'
