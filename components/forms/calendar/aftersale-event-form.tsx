'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  createAftersaleEventWithUpdateSchema,
  type AftersaleEventWithUpdateFormValues,
} from '@/lib/validations/aftersale-event-validations'
import { useAftersaleStatuses } from '@/hooks/queries/use-aftersale-statuses'
import { getRegionCodigoByNombre } from '@/lib/regiones-chile'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PhoneInput } from '@/components/ui/phone-input'
import { Combobox } from '@/components/ui/combobox'
import { StatusOptionDisplay } from '@/components/ui/status-option-display'
import { FormGrid } from '@/components/ui/form-grid'
import { AftersaleSearchField } from '@/components/forms/search/aftersale-search-field'
import { AddressFields } from '@/components/forms/fields/address-fields'
import { TodoListField } from '@/components/custom/todo'
import { TeamTagsField } from '@/components/forms/fields/team-tags-field'
import { formatDateForInput } from '@/lib/utils'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'

interface AftersaleEventFormProps {
  onSubmit: (data: AftersaleEventWithUpdateFormValues) => void | Promise<void>
  defaultValues?: Partial<AftersaleEventWithUpdateFormValues>
}

export interface AftersaleEventFormHandle {
  submit: () => void
  reset: () => void
}

export const AftersaleEventForm = React.forwardRef<
  AftersaleEventFormHandle,
  AftersaleEventFormProps
>(({ onSubmit, defaultValues }, ref) => {
  // Fetch aftersale statuses usando hook compartido con caché
  const { data: aftersaleStatuses = [], isLoading: loadingStatuses } = useAftersaleStatuses()

  // State para detalles del aftersale seleccionado
  const [aftersaleDetails, setAftersaleDetails] = React.useState<{
    id: string
    description: string
    contactPhone: string
    tasks: unknown[]
    aftersaleStatus: {
      id: string
      name: string
      color: {
        bgClass: string
        textClass?: string
      }
    }
    project: {
      id: string
      projectNumber: string
      projectName: string | null
      customer: {
        name: string
      }
      street: string
      apartment: string | null
      comuna: string
      region: string
    }
  } | null>(null)

  const form = useForm<AftersaleEventWithUpdateFormValues>({
    resolver: zodResolver(createAftersaleEventWithUpdateSchema),
    defaultValues: {
      aftersaleId: '',
      scheduledDate: '',
      aftersaleStatusId: '',
      contactPhone: '',
      description: '',
      tasks: [],
      street: '',
      apartment: null,
      comuna: '',
      region: '',
      teamTagIds: [],
      ...defaultValues,
    },
  })

  // Exponer métodos al parent via ref
  React.useImperativeHandle(ref, () => ({
    submit: () => {
      // Usar getValues() para capturar TODOS los valores (incluidos disabled)
      const allValues = form.getValues()
      form.handleSubmit(() => onSubmit(allValues))()
    },
    reset: () => form.reset(),
  }))

  // Cargar detalles completos del aftersale cuando se selecciona
  const aftersaleId = form.watch('aftersaleId')
  React.useEffect(() => {
    if (!aftersaleId) {
      setAftersaleDetails(null)
      return
    }

    console.log('🔍 Fetching aftersale details for:', aftersaleId)

    // Fetch aftersale completo para obtener todos los detalles
    fetch(`/api/aftersales/${aftersaleId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        return res.json()
      })
      .then((data) => {
        console.log('📦 Aftersale data received:', data)

        const details = {
          id: data.id,
          description: data.description || '',
          contactPhone: data.contactPhone || '',
          tasks: data.tasks || [],
          aftersaleStatus: data.aftersaleStatus,
          project: {
            id: data.project.id,
            projectNumber: data.project.projectNumber,
            projectName: data.project.projectName,
            customer: data.project.customer,
            street: data.project.street,
            apartment: data.project.apartment,
            comuna: data.project.comuna,
            region: data.project.region,
          },
        }

        setAftersaleDetails(details)

        // Convertir nombre de región a código (API devuelve nombre, form necesita código)
        const regionCodigo = getRegionCodigoByNombre(data.project.region) || data.project.region

        // Poblar campos del formulario con datos del aftersale
        // IMPORTANTE: Preservar teamTagIds existentes (vienen del evento, no del aftersale)
        const formData: AftersaleEventWithUpdateFormValues = {
          aftersaleId: data.id,
          scheduledDate: form.getValues('scheduledDate') || '',
          aftersaleStatusId: data.aftersaleStatus.id,
          contactPhone: data.contactPhone || '',
          description: data.description || '',
          tasks: data.tasks || [],
          // Campos de dirección del proyecto
          street: data.project.street,
          apartment: data.project.apartment || null,
          comuna: data.project.comuna,
          region: regionCodigo,
          teamTagIds: form.getValues('teamTagIds') || [], // ← Preservar del evento
        }

        console.log('📝 Setting form values:', formData)
        form.reset(formData)
      })
      .catch((err) => {
        console.error('❌ Error fetching aftersale details:', err)
        setAftersaleDetails(null)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aftersaleId])

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* 1. Selección de Aftersale */}
        <AftersaleSearchField
          control={form.control}
          onAftersaleSelect={(aftersale) => {
            if (aftersale) {
              form.setValue('aftersaleId', aftersale.id)
              form.clearErrors('aftersaleId')
            }
          }}
        />

        {/* Info del proyecto (solo lectura) */}
        {aftersaleDetails && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Proyecto #{aftersaleDetails.project.projectNumber} -{' '}
              {aftersaleDetails.project.customer.name}
              {aftersaleDetails.project.projectName && ` - ${aftersaleDetails.project.projectName}`}
            </p>
          </div>
        )}

        {/* 2. Datos del Aftersale (editables) */}
        <div className="space-y-4">
          {/* Grid: Fecha programada + Estado + Teléfono */}
          <FormGrid columns={3}>
            {/* Campo: Fecha programada */}
            <FormField
              control={form.control}
              name="scheduledDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha evento *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ? formatDateForInput(field.value) : ''}
                      onChange={(e) => {
                        const dateValue = e.target.value
                        field.onChange(dateValue)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado - Combobox */}
            <FormField
              control={form.control}
              name="aftersaleStatusId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Estado *</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={aftersaleStatuses}
                      getOptionValue={(status) => status.id}
                      getOptionLabel={(status) => status.name}
                      renderOption={(status) => (
                        <StatusOptionDisplay
                          option={{
                            id: status.id,
                            label: status.name,
                            color: status.color,
                          }}
                        />
                      )}
                      placeholder="Seleccionar estado"
                      searchPlaceholder="Buscar estado..."
                      emptyMessage="No se encontraron estados"
                      contentWidth="300px"
                      loading={loadingStatuses}
                      disabled={!aftersaleDetails}
                      modal
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono */}
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <PhoneInput {...field} disabled={!aftersaleDetails} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGrid>

          {/* Dirección del proyecto */}
          <AddressFields control={form.control} disabled={!aftersaleDetails} />

          {/* Descripción del problema */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción del Problema</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={!aftersaleDetails} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Team Tags - Integrantes asignados al evento */}
          <TeamTagsField control={form.control} disabled={!aftersaleDetails} />

          {/* Tareas del Aftersale */}
          <FormField
            control={form.control}
            name="tasks"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Tareas del Caso</FormLabel>
                <FormDescription>
                  Checklist de tareas a realizar para resolver el caso
                </FormDescription>
                <FormControl>
                  <TodoListField
                    value={field.value || []}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    disabled={!aftersaleDetails}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  )
})

AftersaleEventForm.displayName = 'AftersaleEventForm'
