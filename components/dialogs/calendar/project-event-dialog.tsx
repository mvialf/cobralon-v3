'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
  ScrollableDialog,
  ScrollableDialogBody,
  ScrollableDialogClose,
  ScrollableDialogContent,
  ScrollableDialogDescription,
  ScrollableDialogFooter,
  ScrollableDialogHeader,
  ScrollableDialogTitle,
} from '@/components/ui/scrollable-dialog'
import { Button } from '@/components/ui/button'

import {
  ProjectEventForm,
  type ProjectEventFormHandle,
} from '@/components/forms/calendar/project-event-form'
import type { ProjectEventWithProjectUpdateFormValues } from '@/lib/validations/calendar-validations'
import type { ProjectEventWithRelations } from '@/lib/types/calendar'
import {
  useCreateProjectEventWithUpdate,
  useUpdateProjectEvent,
} from '@/hooks/queries/use-project-events'

interface ProjectEventDialogProps {
  mode: 'create' | 'edit'
  event?: ProjectEventWithRelations
  defaultDate?: string // Formato yyyy-MM-dd (solo fecha, sin timezone)
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Actualiza los campos del proyecto (uninstallTagIds, phone, dirección, etc.)
 * Se usa cuando se edita un evento para mantener sincronizados los datos del proyecto
 */
async function updateProjectFields(
  projectId: string,
  data: ProjectEventWithProjectUpdateFormValues
): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uninstallTagIds: data.uninstallTagIds || [],
      phone: data.phone,
      street: data.street,
      apartment: data.apartment,
      comuna: data.comuna,
      region: data.region,
      windowsCount: data.windowsCount,
      squareMeters: data.squareMeters,
      description: data.description,
      projectStatusId: data.projectStatusId,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar datos del proyecto')
  }
}

export function ProjectEventDialog({
  mode,
  event,
  defaultDate,
  open,
  onOpenChange,
}: ProjectEventDialogProps) {
  const formRef = React.useRef<ProjectEventFormHandle>(null)
  const createWithUpdateMutation = useCreateProjectEventWithUpdate()
  const updateMutation = useUpdateProjectEvent()

  // Early return si event no está presente en modo edit
  if (mode === 'edit' && !event) {
    return null
  }

  const isSubmitting = createWithUpdateMutation.isPending || updateMutation.isPending

  const handleSubmit = async (data: ProjectEventWithProjectUpdateFormValues) => {
    try {
      if (mode === 'create') {
        // Crear evento Y actualizar proyecto si hay cambios
        await createWithUpdateMutation.mutateAsync({
          projectId: data.projectId,
          scheduledDate: new Date(data.scheduledDate),
          phone: data.phone,
          street: data.street,
          apartment: data.apartment,
          comuna: data.comuna,
          region: data.region,
          windowsCount: data.windowsCount,
          squareMeters: data.squareMeters,
          description: data.description,
        })
      } else if (event) {
        // 1. Actualizar evento (scheduledDate, teamTagIds, tasks)
        await updateMutation.mutateAsync({
          id: event.id,
          data: {
            scheduledDate: new Date(data.scheduledDate),
            teamTagIds: data.teamTagIds,
            tasks: data.tasks,
          },
        })

        // 2. Actualizar proyecto (uninstallTagIds y otros campos)
        await updateProjectFields(event.projectId, data)
      }
      onOpenChange?.(false)
    } catch (error) {
      // Los errores se manejan en los hooks con toast
      console.error('Error en submit:', error)
    }
  }

  const handleSave = () => {
    formRef.current?.submit()
  }

  // Preparar defaultValues según modo
  const getDefaultValues = (): Partial<ProjectEventWithProjectUpdateFormValues> => {
    if (mode === 'edit' && event) {
      // En modo edit cargamos projectId, scheduledDate y teamTagIds del evento
      // Los demás campos se cargan desde el API en el form
      return {
        projectId: event.projectId,
        scheduledDate: format(new Date(event.scheduledDate), 'yyyy-MM-dd'),
        teamTagIds: event.teamTags?.map((t) => t.id) || [],
      }
    }

    if (mode === 'create' && defaultDate) {
      return {
        scheduledDate: defaultDate, // Ya viene como string yyyy-MM-dd
      }
    }

    return {}
  }

  return (
    <ScrollableDialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm">
        <ScrollableDialogHeader>
          <ScrollableDialogTitle>
            {mode === 'create' ? 'Crear Evento' : 'Editar Evento'}
          </ScrollableDialogTitle>
        </ScrollableDialogHeader>

        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {mode === 'create'
                  ? 'Programa un evento de proyecto en el calendario'
                  : 'Modifica los datos del evento y del proyecto'}
              </p>
              <ProjectEventForm
                ref={formRef}
                onSubmit={handleSubmit}
                defaultValues={getDefaultValues()}
              />
            </div>
          </ScrollableDialogDescription>
        </ScrollableDialogBody>

        <ScrollableDialogFooter>
          <ScrollableDialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>
              Cancelar
            </Button>
          </ScrollableDialogClose>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creando...'
                : 'Guardando...'
              : mode === 'create'
                ? 'Crear Evento'
                : 'Guardar Cambios'}
          </Button>
        </ScrollableDialogFooter>
      </ScrollableDialogContent>
    </ScrollableDialog>
  )
}
