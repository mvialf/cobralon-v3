import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagBadge } from './TagBadge'
import { cn } from '@/lib/utils'
import type { EditTagModalProps, TeamTag } from './types'

export const EditTagModal: React.FC<EditTagModalProps> = ({
  isOpen,
  onOpenChange,
  onEditTag,
  tag,
  existingTags,
  availableColors,
}) => {
  const [tagName, setTagName] = React.useState('')
  const [tagAbbreviation, setTagAbbreviation] = React.useState('')
  const [tagColorId, setTagColorId] = React.useState('')
  const [isEditing, setIsEditing] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (isOpen && tag) {
      setTagName(tag.name)
      setTagAbbreviation(tag.abbreviation || tag.name.substring(0, 2).toUpperCase())
      setTagColorId(tag.colorId)
      setError('')
    } else if (!isOpen) {
      setTagName('')
      setTagAbbreviation('')
      setTagColorId('')
      setError('')
    }
  }, [isOpen, tag])

  const validateTagName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre es obligatorio')
      return false
    }

    const isDuplicate = existingTags.some(
      (t) => t.id !== tag?.id && t.name.toLowerCase() === trimmed.toLowerCase()
    )

    if (isDuplicate) {
      setError('Ya existe una tag con este nombre')
      return false
    }

    setError('')
    return true
  }

  const handleSave = async () => {
    if (!tag || !validateTagName(tagName)) return

    // Validar que haya un color seleccionado
    if (!tagColorId) {
      setError('Debes seleccionar un color')
      return
    }

    const finalAbbreviation = tagAbbreviation.trim() || tagName.trim().substring(0, 2).toUpperCase()

    setIsEditing(true)
    try {
      await onEditTag(tag.id, tagName.trim(), finalAbbreviation, tagColorId)
      onOpenChange(false)
    } catch (error) {
      setError('Error al actualizar la tag')
    } finally {
      setIsEditing(false)
    }
  }

  const selectedColor = availableColors.find((c) => c.id === tagColorId)

  const previewTag: TeamTag = {
    id: 'preview',
    name: tagName.trim() || 'Tag',
    abbreviation: tagAbbreviation.trim() || tagName.trim().substring(0, 2).toUpperCase() || 'XX',
    colorId: tagColorId,
    color: selectedColor || {
      id: '',
      name: 'Gris',
      key: 'gray',
      bgClass: 'bg-gray-500',
      textClass: 'text-white',
    },
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Team Tag</DialogTitle>
          <DialogDescription>Modifica el nombre, abreviatura o color.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Nombre</Label>
            <Input
              id="tag-name"
              value={tagName}
              onChange={(e) => {
                setTagName(e.target.value)
                validateTagName(e.target.value)
              }}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-abbreviation">Abreviatura</Label>
            <Input
              id="tag-abbreviation"
              value={tagAbbreviation}
              onChange={(e) => setTagAbbreviation(e.target.value.slice(0, 2).toUpperCase())}
              maxLength={2}
              className="uppercase"
            />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-3 gap-2">
              {availableColors.map((color) => {
                const isSelected = color.id === tagColorId
                return (
                  <Button
                    key={color.id}
                    type="button"
                    variant="outline"
                    className={cn(
                      'h-9 w-full p-0 border-2',
                      color.bgClass,
                      isSelected && 'ring-2 ring-primary'
                    )}
                    onClick={() => setTagColorId(color.id)}
                    title={color.key}
                  />
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
              <TagBadge tag={previewTag} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isEditing}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!tagName.trim() || !tagColorId || !!error || isEditing}
          >
            {isEditing ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
