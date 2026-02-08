'use client'

import { type Control } from 'react-hook-form'
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form'
import { TagSelector } from '@/components/custom/tag-system'
import { useTeamTags, type TeamTag } from '@/hooks/use-team-tags'
import { cn } from '@/lib/utils'

interface TeamTagsFieldProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  disabled?: boolean
}

/**
 * TeamTagsField - Campo de formulario para seleccionar integrantes del equipo
 *
 * Sigue el patrón de UninstallTagsFields: hook interno, transformación IDs ↔ objetos.
 * Usado en los 3 event forms del calendario (project, visit, aftersale).
 */
export function TeamTagsField({ control, disabled }: TeamTagsFieldProps) {
  const {
    availableTags: availableTeamTags,
    availableColors: teamTagColors,
    createTag: createTeamTag,
    editTag: editTeamTag,
    deleteTag: deleteTeamTag,
  } = useTeamTags()

  return (
    <FormField
      control={control}
      name="teamTagIds"
      render={({ field }) => {
        const selectedTeamTagObjects =
          (field.value
            ?.map((id: string) => availableTeamTags.find((tag) => tag.id === id))
            .filter(Boolean) as TeamTag[]) || []

        const handleTeamTagChange = (tags: TeamTag[]) => {
          field.onChange(tags.map((t) => t.id))
        }

        return (
          <FormItem>
            <FormControl>
              <div className={cn(disabled && 'opacity-50 pointer-events-none')}>
                <TagSelector
                  selectedTags={selectedTeamTagObjects}
                  availableTags={availableTeamTags}
                  availableColors={teamTagColors}
                  onTagsChange={handleTeamTagChange}
                  onCreateTag={createTeamTag}
                  onEditTag={editTeamTag}
                  onDeleteTag={deleteTeamTag}
                  label="Integrantes"
                  showFullNameInSelected
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
