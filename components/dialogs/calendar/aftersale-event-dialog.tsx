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
import { updateAftersaleFields } from '@/lib/api/calendar-event-updates'

interface AftersaleEventDialogProps {
  mode: 'create' | 'edit'
  event?: AftersaleEventWithRelations
  defaultDate?: string // Formato yyyy-MM-dd (solo fecha, sin timezone)
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

        // 2. Actualizar aftersale (status, contactPhone, description, tasks, dirección)
        await updateAftersaleFields(event.aftersaleId, data)
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
      // En modo edit cargamos aftersaleId, scheduledDate y teamTagIds del evento
      // Los demás campos se cargan desde el API en el form
      return {
        aftersaleId: event.aftersaleId,
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
            {mode === 'create' ? 'Crear Evento de Postventa' : 'Editar Evento de Postventa'}
          </ScrollableDialogTitle>
        </ScrollableDialogHeader>

        <ScrollableDialogBody>
          <ScrollableDialogDescription asChild>
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {mode === 'create'
                  ? 'Programa un evento de postventa en el calendario'
                  : 'Modifica los datos del evento y del caso de postventa'}
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
