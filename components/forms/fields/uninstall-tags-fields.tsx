'use client'

import * as React from 'react'
import { Control } from 'react-hook-form'
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form'
import { TagSelector } from '@/components/custom/tag-system'
import { useUninstallTags } from '@/hooks/use-uninstall-tags'
import type { ProjectFormData } from '@/lib/validations/project-validations'
import type { UninstallTag } from '@/components/custom/tag-system/types'

interface UninstallTagsFieldsProps {
  control: Control<ProjectFormData>
}

/**
 * UninstallTagsFields - Campo de formulario para seleccionar materiales de desinstalación
 *
 * Este componente integra el sistema tag-system/ con React Hook Form.
 * Maneja la transformación entre IDs (form state) y objetos UninstallTag completos (TagSelector).
 *
 * @param control - React Hook Form control
 */
export function UninstallTagsFields({ control }: UninstallTagsFieldsProps) {
  const {
    availableTags,
    availableColors,
    createTag,
    editTag,
    deleteTag,
    loading: _loading,
  } = useUninstallTags()

  return (
    <FormField
      control={control}
      name="uninstallTagIds"
      render={({ field }) => {
        // Transformar IDs a objetos UninstallTag completos para TagSelector
        const selectedTagObjects =
          (field.value
            ?.map((id) => availableTags.find((tag) => tag.id === id))
            .filter(Boolean) as UninstallTag[]) || []

        // Handler: recibir objetos UninstallTag, enviar IDs al form
        const handleChange = (tags: UninstallTag[]) => {
          field.onChange(tags.map((t) => t.id))
        }

        return (
          <FormItem>
            <FormControl>
              <TagSelector
                selectedTags={selectedTagObjects}
                availableTags={availableTags}
                availableColors={availableColors}
                onTagsChange={handleChange}
                onCreateTag={createTag}
                onEditTag={editTag}
                onDeleteTag={deleteTag}
                label="Desinstalción"
                showFullNameInSelected
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
