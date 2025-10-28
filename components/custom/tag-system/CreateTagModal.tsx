import * as React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TagBadge } from './TagBadge'
import type { CreateTagModalProps, TeamTag } from './types'

/**
 * Modal para crear team tags
 * Adaptado de CalReact con selector de colores dinámico desde BadgeColor API
 */
export const CreateTagModal: React.FC<CreateTagModalProps> = ({
  isOpen,
  onOpenChange,
  onCreateTag,
  existingTags,
  availableColors,
}) => {
  const [tagName, setTagName] = React.useState('')
  const [tagAbbreviation, setTagAbbreviation] = React.useState('')
  const [tagColorId, setTagColorId] = React.useState('')
  const [isCreating, setIsCreating] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!isOpen) {
      setTagName('')
      setTagAbbreviation('')
      setTagColorId('')
      setError('')
    } else if (availableColors.length > 0 && !tagColorId) {
      setTagColorId(availableColors[0].id)
    }
  }, [isOpen, availableColors, tagColorId])

  const validateTagName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre es obligatorio')
      return false
    }

    const isDuplicate = existingTags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())

    if (isDuplicate) {
      setError('Ya existe una tag con este nombre')
      return false
    }

    setError('')
    return true
  }

  const handleCreate = async () => {
    const trimmed = tagName.trim()
    if (!validateTagName(trimmed)) return

    // Validar que haya un color seleccionado
    if (!tagColorId) {
      setError('Debes seleccionar un color')
      return
    }

    const finalAbbreviation = tagAbbreviation.trim() || trimmed.substring(0, 2).toUpperCase()

    setIsCreating(true)
    try {
      await onCreateTag(trimmed, finalAbbreviation, tagColorId)
      onOpenChange(false)
    } catch (error) {
      setError('Error al crear la tag')
    } finally {
      setIsCreating(false)
    }
  }

  const selectedColor = availableColors.find((c) => c.id === tagColorId)

  const previewTag: TeamTag = {
    id: 'preview',
    name: tagName.trim() || 'Nueva tag',
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
          <DialogTitle>Crear Team Tag</DialogTitle>
          <DialogDescription>
            Define el nombre, abreviatura y color de la nueva tag.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Nombre</Label>
            <Input
              id="tag-name"
              placeholder="Ej: Desarrollador"
              value={tagName}
              onChange={(e) => {
                setTagName(e.target.value)
                if (e.target.value) validateTagName(e.target.value)
                else setError('')
              }}
              autoFocus
              className={cn(error && 'border-destructive')}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tag-abbreviation">Abreviatura (2 letras)</Label>
            <Input
              id="tag-abbreviation"
              placeholder="DV"
              value={tagAbbreviation}
              onChange={(e) => setTagAbbreviation(e.target.value.slice(0, 2).toUpperCase())}
              maxLength={2}
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {availableColors.map((color) => {
                const isSelected = tagColorId === color.id
                return (
                  <button
                    key={color.id}
                    type="button"
                    className={cn(
                      'h-9 w-full p-0 border-2 rounded-md transition-all cursor-pointer',
                      'hover:scale-105 active:scale-95',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      color.bgClass,
                      isSelected ? 'ring-2 ring-offset-2 ring-primary scale-105' : ''
                    )}
                    onClick={() => setTagColorId(color.id)}
                    title={color.key}
                    aria-label={`Seleccionar color ${color.name}`}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!tagName.trim() || !tagColorId || !!error || isCreating}>
            {isCreating ? (
              'Creando...'
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> Crear
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
