'use client'

import { AftersaleEventForm } from '@/components/forms/calendar/aftersale-event-form'
import type { AftersaleEventWithUpdateFormValues } from '@/lib/validations/aftersale-event-validations'
import type { AftersaleEventWithRelations } from '@/lib/types/calendar'
import {
  useCreateAftersaleEventWithUpdate,
  useUpdateAftersaleEvent,
} from '@/hooks/queries/use-aftersale-events'
import { updateAftersaleFields } from '@/lib/api/calendar-event-updates'
import { createCalendarEventDialog } from './create-calendar-event-dialog'

export const AftersaleEventDialog = createCalendarEventDialog<
  AftersaleEventWithRelations,
  AftersaleEventWithUpdateFormValues
>({
  FormComponent: AftersaleEventForm,
  useCreateMutation: useCreateAftersaleEventWithUpdate,
  useUpdateMutation: useUpdateAftersaleEvent,
  titles: {
    create: 'Crear Evento de Postventa',
    edit: 'Editar Evento de Postventa',
    createDesc: 'Programa un evento de postventa en el calendario',
    editDesc: 'Modifica los datos del evento y del caso de postventa',
  },
  getEditEntityValues: (event) => ({ aftersaleId: event.aftersaleId }),
  buildSubmitHandler:
    ({ mode, event, createMutation, updateMutation, onOpenChange }) =>
    async (data) => {
      try {
        if (mode === 'create') {
          await createMutation.mutateAsync({
            aftersaleId: data.aftersaleId,
            scheduledDate: data.scheduledDate,
            aftersaleStatusId: data.aftersaleStatusId,
            contactPhone: data.contactPhone,
            description: data.description,
            tasks: data.tasks,
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
              scheduledDate: data.scheduledDate,
              teamTagIds: data.teamTagIds,
            },
          })
          await updateAftersaleFields(event.aftersaleId, data)
        }
        onOpenChange?.(false)
      } catch (error) {
        console.error('Error en submit:', error)
      }
    },
})
