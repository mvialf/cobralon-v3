'use client'

import { ProjectEventForm } from '@/components/forms/calendar/project-event-form'
import type { ProjectEventWithProjectUpdateFormValues } from '@/lib/validations/calendar-validations'
import type { ProjectEventWithRelations } from '@/lib/types/calendar'
import {
  useCreateProjectEventWithUpdate,
  useUpdateProjectEvent,
} from '@/hooks/queries/use-project-events'
import { updateProjectFields } from '@/lib/api/calendar-event-updates'
import { createCalendarEventDialog } from './create-calendar-event-dialog'

export const ProjectEventDialog = createCalendarEventDialog<
  ProjectEventWithRelations,
  ProjectEventWithProjectUpdateFormValues
>({
  FormComponent: ProjectEventForm,
  useCreateMutation: useCreateProjectEventWithUpdate,
  useUpdateMutation: useUpdateProjectEvent,
  titles: {
    create: 'Crear Evento',
    edit: 'Editar Evento',
    createDesc: 'Programa un evento de proyecto en el calendario',
    editDesc: 'Modifica los datos del evento y del proyecto',
  },
  getEditEntityValues: (event) => ({ projectId: event.projectId }),
  buildSubmitHandler:
    ({ mode, event, createMutation, updateMutation, onOpenChange }) =>
    async (data) => {
      try {
        if (mode === 'create') {
          await createMutation.mutateAsync({
            projectId: data.projectId,
            scheduledDate: data.scheduledDate,
            phone: data.phone,
            street: data.street,
            apartment: data.apartment,
            comuna: data.comuna,
            region: data.region,
            windowsCount: data.windowsCount,
            squareMeters: data.squareMeters,
            description: data.description,
            teamTagIds: data.teamTagIds,
          })
        } else if (event) {
          await updateMutation.mutateAsync({
            id: event.id,
            data: {
              scheduledDate: data.scheduledDate,
              teamTagIds: data.teamTagIds,
              tasks: data.tasks,
            },
          })
          await updateProjectFields(event.projectId, data)
        }
        onOpenChange?.(false)
      } catch (error) {
        console.error('Error en submit:', error)
      }
    },
})
