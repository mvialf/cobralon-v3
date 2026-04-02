'use client'

import * as React from 'react'
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

/** Interfaz mínima del form handle (submit via ref) */
interface FormHandle {
  submit: () => void
  reset: () => void
}

/** Props comunes a todos los event dialogs */
export interface CalendarEventDialogProps<TEvent> {
  mode: 'create' | 'edit'
  event?: TEvent
  defaultDate?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Tipo mínimo de mutation que necesita la factory */
interface MutationLike {
  isPending: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutateAsync: (vars: any) => Promise<any>
}

/** Tipo base del event — solo lo que necesita la factory para getDefaultValues */
interface BaseEvent {
  scheduledDate: string | Date
  teamTags?: Array<{ id: string }>
}

interface CalendarEventDialogConfig<TEvent extends BaseEvent, TFormValues> {
  FormComponent: React.ForwardRefExoticComponent<
    {
      onSubmit: (data: TFormValues) => void
      defaultValues: Partial<TFormValues>
    } & React.RefAttributes<FormHandle>
  >
  useCreateMutation: () => MutationLike
  useUpdateMutation: () => MutationLike
  titles: {
    create: string
    edit: string
    createDesc: string
    editDesc: string
  }
  getEditEntityValues: (event: TEvent) => Partial<TFormValues>
  buildSubmitHandler: (ctx: {
    mode: 'create' | 'edit'
    event: TEvent | undefined
    createMutation: MutationLike
    updateMutation: MutationLike
    onOpenChange?: (open: boolean) => void
  }) => (data: TFormValues) => Promise<void>
}

export function createCalendarEventDialog<TEvent extends BaseEvent, TFormValues>(
  config: CalendarEventDialogConfig<TEvent, TFormValues>
): React.ComponentType<CalendarEventDialogProps<TEvent>> {
  function EventDialog({
    mode,
    event,
    defaultDate,
    open,
    onOpenChange,
  }: CalendarEventDialogProps<TEvent>) {
    const formRef = React.useRef<FormHandle>(null)
    const createMutation = config.useCreateMutation()
    const updateMutation = config.useUpdateMutation()

    if (mode === 'edit' && !event) {
      return null
    }

    const isSubmitting = createMutation.isPending || updateMutation.isPending

    const handleSubmit = config.buildSubmitHandler({
      mode,
      event,
      createMutation,
      updateMutation,
      onOpenChange,
    })

    const handleSave = () => {
      formRef.current?.submit()
    }

    const getDefaultValues = (): Partial<TFormValues> => {
      if (mode === 'edit' && event) {
        return {
          ...config.getEditEntityValues(event),
          scheduledDate: new Date(event.scheduledDate),
          teamTagIds: event.teamTags?.map((t) => t.id) || [],
        } as Partial<TFormValues>
      }

      if (mode === 'create' && defaultDate) {
        return { scheduledDate: new Date(defaultDate) } as unknown as Partial<TFormValues>
      }

      return {}
    }

    return (
      <ScrollableDialog open={open} onOpenChange={onOpenChange}>
        <ScrollableDialogContent className="sm">
          <ScrollableDialogHeader>
            <ScrollableDialogTitle>
              {mode === 'create' ? config.titles.create : config.titles.edit}
            </ScrollableDialogTitle>
          </ScrollableDialogHeader>

          <ScrollableDialogBody>
            <ScrollableDialogDescription asChild>
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  {mode === 'create' ? config.titles.createDesc : config.titles.editDesc}
                </p>
                <config.FormComponent
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

  EventDialog.displayName = `CalendarEventDialog(${config.titles.create})`

  return EventDialog
}
