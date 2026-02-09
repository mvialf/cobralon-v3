'use client'

import { VisitEventForm } from '@/components/forms/calendar/visit-event-form'
import type { VisitEventWithUpdateFormValues } from '@/lib/validations/visit-event-validations'
import type { VisitEventWithRelations } from '@/lib/types/calendar'
import {
  useCreateVisitEventWithUpdate,
  useUpdateVisitEvent,
} from '@/hooks/queries/use-visit-events'
import { updateVisitFields } from '@/lib/api/calendar-event-updates'
import { createCalendarEventDialog } from './create-calendar-event-dialog'

export const VisitEventDialog = createCalendarEventDialog<
  VisitEventWithRelations,
  VisitEventWithUpdateFormValues
>({
  FormComponent: VisitEventForm,
  useCreateMutation: useCreateVisitEventWithUpdate,
  useUpdateMutation: useUpdateVisitEvent,
  titles: {
    create: 'Crear Evento de Visita',
    edit: 'Editar Evento de Visita',
    createDesc: 'Programa una visita de medición en el calendario',
    editDesc: 'Modifica los datos del evento y de la visita',
  },
  getEditEntityValues: (event) => ({ visitId: event.visitId }),
  buildSubmitHandler:
    ({ mode, event, createMutation, updateMutation, onOpenChange }) =>
    async (data) => {
      try {
        if (mode === 'create') {
          await createMutation.mutateAsync({
            visitId: data.visitId,
            scheduledDate: data.scheduledDate,
            visitStatusId: data.visitStatusId,
            name: data.name,
            phone: data.phone,
            observations: data.observations,
            street: data.street,
            apartment: data.apartment,
            comuna: data.comuna,
            region: data.region,
            teamTagIds: data.teamTagIds,
          })
        } else if (event) {
          await updateMutation.mutateAsync({
            id: event.id,
            data: {
              scheduledDate: new Date(data.scheduledDate),
              teamTagIds: data.teamTagIds,
            },
          })
          await updateVisitFields(event.visitId, data)
        }
        onOpenChange?.(false)
      } catch (error) {
        console.error('Error en submit:', error)
      }
    },
})
