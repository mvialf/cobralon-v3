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
  VisitEventForm,
  type VisitEventFormHandle,
} from '@/components/forms/calendar/visit-event-form'
import type { VisitEventWithUpdateFormValues } from '@/lib/validations/visit-event-validations'
import type { VisitEventWithRelations } from '@/lib/types/calendar'
import {
  useCreateVisitEventWithUpdate,
  useUpdateVisitEvent,
} from '@/hooks/queries/use-visit-events'
import { updateVisitFields } from '@/lib/api/calendar-event-updates'

interface VisitEventDialogProps {
  mode: 'create' | 'edit'
  event?: VisitEventWithRelations
  defaultDate?: string // Formato yyyy-MM-dd (solo fecha, sin timezone)
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function VisitEventDialog({
  mode,
  event,
  defaultDate,
  open,
  onOpenChange,
}: VisitEventDialogProps) {
  const formRef = React.useRef<VisitEventFormHandle>(null)
  const createWithUpdateMutation = useCreateVisitEventWithUpdate()
  const updateMutation = useUpdateVisitEvent()

  // Early return si event no está presente en modo edit
  if (mode === 'edit' && !event) {
    return null
  }

  const isSubmitting = createWithUpdateMutation.isPending || updateMutation.isPending

  const handleSubmit = async (data: VisitEventWithUpdateFormValues) => {
    try {
      if (mode === 'create') {
        // Crear evento Y actualizar visita si hay cambios
        await createWithUpdateMutation.mutateAsync({
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
        // 1. Actualizar evento (scheduledDate, teamTagIds)
        await updateMutation.mutateAsync({
          id: event.id,
          data: {
            scheduledDate: new Date(data.scheduledDate),
            teamTagIds: data.teamTagIds,
          },
        })

        // 2. Actualizar visita (name, phone, observations, status, dirección)
        await updateVisitFields(event.visitId, data)
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
  const getDefaultValues = (): Partial<VisitEventWithUpdateFormValues> => {
    if (mode === 'edit' && event) {
      // En modo edit cargamos visitId, scheduledDate y teamTagIds del evento
      // Los demás campos se cargan desde el API en el form
      return {
        visitId: event.visitId,
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
            {mode === 'create' ? 'Crear Evento de Visita' : 'Editar Evento de Visita'}
          </ScrollableDialogTitle>
        </ScrollableDialogHeader>

        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {mode === 'create'
                  ? 'Programa una visita de medición en el calendario'
                  : 'Modifica los datos del evento y de la visita'}
              </p>
              <VisitEventForm
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
