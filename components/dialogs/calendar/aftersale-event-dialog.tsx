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
  AftersaleEventForm,
  type AftersaleEventFormHandle,
} from '@/components/forms/calendar/aftersale-event-form'
import type { AftersaleEventWithUpdateFormValues } from '@/lib/validations/aftersale-event-validations'
import type { AftersaleEventWithRelations } from '@/lib/types/calendar'
import {
  useCreateAftersaleEventWithUpdate,
  useUpdateAftersaleEvent,
} from '@/hooks/queries/use-aftersale-events'

interface AftersaleEventDialogProps {
  mode: 'create' | 'edit'
  event?: AftersaleEventWithRelations
  defaultDate?: Date
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AftersaleEventDialog({
  mode,
  event,
  defaultDate,
  open,
  onOpenChange,
}: AftersaleEventDialogProps) {
  const formRef = React.useRef<AftersaleEventFormHandle>(null)
  const createWithUpdateMutation = useCreateAftersaleEventWithUpdate()
  const updateMutation = useUpdateAftersaleEvent()

  // Early return si event no está presente en modo edit
  if (mode === 'edit' && !event) {
    return null
  }

  const isSubmitting = createWithUpdateMutation.isPending || updateMutation.isPending

  const handleSubmit = async (data: AftersaleEventWithUpdateFormValues) => {
    try {
      if (mode === 'create') {
        // Crear evento Y actualizar aftersale + project si hay cambios
        await createWithUpdateMutation.mutateAsync({
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
        })
      } else if (event) {
        // En modo edit, solo actualizamos la fecha del evento
        await updateMutation.mutateAsync({
          id: event.id,
          data: {
            scheduledDate: new Date(data.scheduledDate),
          },
        })
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
  const getDefaultValues = (): Partial<AftersaleEventWithUpdateFormValues> => {
    if (mode === 'edit' && event) {
      // En modo edit solo editamos fecha del evento
      return {
        aftersaleId: event.aftersaleId,
        scheduledDate: format(new Date(event.scheduledDate), 'yyyy-MM-dd'),
      }
    }

    if (mode === 'create' && defaultDate) {
      return {
        scheduledDate: format(defaultDate, 'yyyy-MM-dd'),
      }
    }

    return {}
  }

  return (
    <ScrollableDialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm">
        <ScrollableDialogHeader>
          <ScrollableDialogTitle>
            {mode === 'create' ? 'Crear Evento de Postventa' : 'Editar Evento de Postventa'}
          </ScrollableDialogTitle>
        </ScrollableDialogHeader>

        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {mode === 'create'
                  ? 'Programa un evento de postventa en el calendario'
                  : 'Modifica la fecha del evento de postventa'}
              </p>
              <AftersaleEventForm
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
